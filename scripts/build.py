#!/usr/bin/env python3
"""Tridya ENT Clinic static build.  Run:  python3 scripts/build.py   (stdlib only, safe to re-run)

src/pages/<name>.html      -> <name>.html in the site root
src/templates/treatment.html  x data/treatments.json -> treatment-<slug>.html (26)
src/templates/doctor.html     x data/doctors.json    -> doctor-<slug>.html (6)
data/site-data.js          <- window.TRIDYA = {treatments, doctors, posts, pages} (search, quick book, page JS)

Page file = optional front matter between two '---' lines (key: value), then the body HTML.
Layouts (front matter `layout:`): site (default: header + main + footer + overlays), app (dashboard shell),
auth (split auth layout, no header/footer), bare (nothing but head + scripts).
Template syntax (see COMPONENTS.md):
  {{path}} escaped value · {{{path}}} raw HTML · {{> partial}} · {{#each path}}...{{/each}} · {{#if path}}...{{else}}...{{/if}}
  macros: {{icon name [size] [class]}} {{svg name}} {{brand name}} {{img slot | alt | sizes | eager}} {{portrait slot | alt | 160|800 | class}}
          {{badge Setting}} {{stars n}} {{crumbs Label=url | Label}} {{logo}}
Missing image files only produce a warning (photo agents may still be adding them).
"""
import html
import json
import re
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
DATA = ROOT / "data"
BRAND = "Tridya ENT Clinic"
DEFAULT_DESC = "Tridya ENT Clinic, Coimbatore: ear, nose and throat specialists with in-house audiology, video endoscopy, day-care surgery and an online patient portal."
YEAR = "2026"

ICONS = json.loads((DATA / "icons.json").read_text(encoding="utf-8"))
TXD = json.loads((DATA / "treatments.json").read_text(encoding="utf-8"))
TREATMENTS = TXD["treatments"]
DOCTORS = json.loads((DATA / "doctors.json").read_text(encoding="utf-8"))["doctors"]
POSTS = json.loads((DATA / "posts.json").read_text(encoding="utf-8"))["posts"] if (DATA / "posts.json").exists() else []
TX = {t["slug"]: t for t in TREATMENTS}
DOC = {d["slug"]: d for d in DOCTORS}
esc = lambda s: html.escape(str(s), quote=True)
WARN = []
MISSING = {}
PENDING = set()


def warn(msg):
    WARN.append(msg)


# ------------------------------------------------------------------ data links (resolved objects for templates)
for t in TREATMENTS:
    t["lead_doc"] = DOC.get(t["lead"], {})
    t["team_docs"] = [DOC[s] for s in t.get("team", []) if s in DOC]
    t["related_tx"] = [TX[s] for s in t.get("related", []) if s in TX]
    t["siblings"] = [x for x in TREATMENTS if x["specialty"] == t["specialty"] and x["slug"] != t["slug"]]
for d in DOCTORS:
    d["tx_items"] = [TX[s] for s in d.get("treatments", []) if s in TX]
    d["posts"] = [p for p in POSTS if p.get("author") == d["slug"]]
for p in POSTS:
    p["author_doc"] = DOC.get(p.get("author"), {})
# report 97: one related article per treatment (matched on specialty) for the treatment-page sidebar
for t in TREATMENTS:
    t["read_post"] = next((p for p in POSTS if t["specialty"] in p.get("tags", "").split()), None)


# ------------------------------------------------------------------ images
def webp_size(path):
    try:
        b = path.read_bytes()[:40]
        if b[:4] != b"RIFF" or b[8:12] != b"WEBP":
            return None
        kind = b[12:16]
        if kind == b"VP8X":
            return 1 + int.from_bytes(b[24:27], "little"), 1 + int.from_bytes(b[27:30], "little")
        if kind == b"VP8 ":
            w, h = struct.unpack("<HH", b[26:30])
            return w & 0x3FFF, h & 0x3FFF
        if kind == b"VP8L":
            bits = int.from_bytes(b[21:25], "little")
            return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
    except OSError:
        return None
    return None


def img_file(slot, size, page):
    f = "images/%s-%s.webp" % (slot, size)
    p = ROOT / f
    if not p.exists():
        MISSING.setdefault(slot, set()).add(page)
        return f, None
    return f, webp_size(p)


# ------------------------------------------------------------------ macros
def icon_svg(name, page="?"):
    if name in ICONS["stroke"]:
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">%s</svg>' % ICONS["stroke"][name]
    if name in ICONS["brand"]:
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">%s</svg>' % ICONS["brand"][name]
    warn("%s: unknown icon '%s'" % (page, name))
    return ""


def m_icon(arg, ctx):
    parts = arg.split()
    if not parts:
        return ""
    name = parts[0]
    style = ""
    if len(parts) > 1 and parts[1].isdigit():
        style = ' style="width:%spx;height:%spx"' % (parts[1], parts[1])
    cls = " ".join(p for p in parts[1:] if not p.isdigit() and p != "-")
    return '<span class="ico%s" aria-hidden="true"%s>%s</span>' % ((" " + cls) if cls else "", style, icon_svg(name, ctx["_name"]))


def m_svg(arg, ctx):
    return icon_svg(arg.strip(), ctx["_name"])


def m_brand(arg, ctx):
    return '<span class="brand-ico" aria-hidden="true">%s</span>' % icon_svg(arg.strip(), ctx["_name"])


def split_args(arg):
    return [html.unescape(a.strip()) for a in arg.split("|")]


def m_img(arg, ctx):
    """{{img slot | alt | sizes | eager}} -> responsive <img> (800/1600, +2000 for hero-*)."""
    a = split_args(arg)
    slot = a[0]
    alt = a[1] if len(a) > 1 else ""
    sizes = a[2] if len(a) > 2 and a[2] else "(max-width: 760px) 100vw, 50vw"
    eager = len(a) > 3 and a[3] == "eager"
    # Only list sizes that really exist (portrait slots have 160/800 but no 1600).
    have = [s for s in (800, 1600, 2000) if (ROOT / ("images/%s-%d.webp" % (slot, s))).exists()]
    if not have:
        MISSING.setdefault(slot, set()).add(ctx["_name"])
        have = [800]
    dim = webp_size(ROOT / ("images/%s-%d.webp" % (slot, have[-1])))
    srcset = ", ".join("images/%s-%d.webp %dw" % (slot, s, s) for s in have)
    w, h = dim or (1600, 1067)
    if have[0] != 800:
        return '<img src="images/%s-%d.webp" srcset="%s" sizes="%s" width="%d" height="%d" alt="%s"%s decoding="async">' % (
            slot, have[0], srcset, esc(sizes), w, h, esc(alt), ' fetchpriority="high"' if eager else ' loading="lazy"')
    load = ' fetchpriority="high"' if eager else ' loading="lazy"'
    return '<img src="images/%s-800.webp" srcset="%s" sizes="%s" width="%d" height="%d" alt="%s"%s decoding="async">' % (slot, srcset, esc(sizes), w, h, esc(alt), load)


def m_portrait(arg, ctx):
    """{{portrait slot | alt | 160|800 | extra-class}} -> square portrait <img> (lazy)."""
    a = split_args(arg)
    slot = a[0]
    alt = a[1] if len(a) > 1 else ""
    size = a[2] if len(a) > 2 and a[2] else "160"
    cls = a[3] if len(a) > 3 else ""
    src, dim = img_file(slot, size, ctx["_name"])
    w, h = dim or (int(size), int(size))
    extra = ""
    if size == "160":
        f800 = ROOT / ("images/%s-800.webp" % slot)
        if f800.exists():
            extra = ' srcset="images/%s-160.webp 160w, images/%s-800.webp 800w" sizes="160px"' % (slot, slot)
    return '<img class="portrait%s" src="%s"%s width="%d" height="%d" alt="%s" loading="lazy" decoding="async">' % ((" " + cls) if cls else "", src, extra, w, h, esc(alt))


SETTING_CLASS = {"opd": "opd", "day-care": "daycare", "daycare": "daycare", "inpatient": "inpatient", "home": "home"}


def m_badge(arg, ctx):
    label = html.unescape(arg.strip())
    return '<span class="pill %s">%s</span>' % (SETTING_CLASS.get(label.lower(), "info"), esc(label))


def m_stars(arg, ctx):
    n = int(float(arg.strip() or 5))
    return '<span class="stars" role="img" aria-label="%d out of 5 stars">%s</span>' % (n, "".join(m_icon("star", ctx) for _ in range(n)))


def crumbs_html(spec, ctx):
    parts = [c.strip() for c in (spec or "").split("|") if c.strip()]
    if not parts:
        return ""
    sep = m_icon("chevron-right 14 flip", ctx)
    out = ['<a href="index.html">Home</a>']
    for i, c in enumerate(parts):
        c = html.unescape(c)
        if "=" in c and i < len(parts) - 1:
            label, href = c.split("=", 1)
            out.append('<a href="%s">%s</a>' % (esc(href.strip()), esc(label.strip())))
        else:
            out.append('<span aria-current="page">%s</span>' % esc(c.split("=")[0].strip()))
    return '<nav class="crumbs" aria-label="Breadcrumb">%s</nav>' % sep.join(out)


def m_crumbs(arg, ctx):
    return crumbs_html(arg, ctx)


def m_logo(arg, ctx):
    return partial("logo")


MACROS = {"icon": m_icon, "svg": m_svg, "brand": m_brand, "img": m_img, "portrait": m_portrait, "badge": m_badge,
          "stars": m_stars, "crumbs": m_crumbs, "logo": m_logo}


# ------------------------------------------------------------------ template engine
def lookup(path, stack):
    if path in ("this", "."):
        return stack[-1].get("this")
    parts = path.split(".")
    for scope in reversed(stack):
        cur = scope
        if parts[0] == "this":
            cur = scope.get("this")
            rest = parts[1:]
        else:
            if not isinstance(scope, dict) or parts[0] not in scope:
                continue
            cur = scope[parts[0]]
            rest = parts[1:]
        ok = True
        for p in rest:
            if isinstance(cur, dict) and p in cur:
                cur = cur[p]
            elif isinstance(cur, list) and p.isdigit() and int(p) < len(cur):
                cur = cur[int(p)]
            elif p == "length" and isinstance(cur, list):
                cur = len(cur)
            else:
                ok = False
                break
        if ok:
            return cur
        if parts[0] == "this":
            break
    raise KeyError(path)


BLOCK_RE = re.compile(r"\{\{#(each|if|unless)\s+([^}]+?)\}\}")


def find_close(text, start, kind):
    depth = 1
    pat = re.compile(r"\{\{#(each|if|unless)\s[^}]*\}\}|\{\{/(each|if|unless)\}\}|\{\{else\}\}")
    else_pos = None
    for m in pat.finditer(text, start):
        if m.group(1):
            depth += 1
        elif m.group(2):
            depth -= 1
            if depth == 0:
                return m.start(), m.end(), else_pos
        elif depth == 1 and else_pos is None:
            else_pos = (m.start(), m.end())
    raise SyntaxError("unclosed {{#%s}}" % kind)


def truthy(v):
    return bool(v) and v not in ("false", "no", "0")


def render(text, stack):
    out = []
    pos = 0
    while True:
        m = BLOCK_RE.search(text, pos)
        if not m:
            out.append(render_flat(text[pos:], stack))
            break
        out.append(render_flat(text[pos:m.start()], stack))
        kind, path = m.group(1), m.group(2).strip()
        cs, ce, el = find_close(text, m.end(), kind)
        body = text[m.end():el[0]] if el else text[m.end():cs]
        alt = text[el[1]:cs] if el else ""
        try:
            val = lookup(path, stack)
        except KeyError:
            val = None
        if kind == "each":
            items = val or []
            if isinstance(items, dict):
                items = list(items.values())
            for i, it in enumerate(items):
                scope = dict(it) if isinstance(it, dict) else {}
                scope.update({"this": it, "@index": i, "@n": i + 1, "@first": i == 0, "@last": i == len(items) - 1})
                out.append(render(body, stack + [scope]))
            if not items and alt:
                out.append(render(alt, stack))
        else:
            cond = truthy(val) if kind == "if" else not truthy(val)
            out.append(render(body if cond else alt, stack))
        pos = ce
    return "".join(out)


VAR_RE = re.compile(r"\{\{\{\s*([\w.@\-]+)\s*\}\}\}|\{\{\s*([\w.@\-]+)\s*\}\}")
MACRO_RE = re.compile(r"\{\{(\w+)\s+([^{}]*?)\}\}")


def fmt(v):
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (list, dict)):
        return ", ".join(str(x) for x in v) if isinstance(v, list) and all(isinstance(x, (str, int)) for x in v) else ""
    return "" if v is None else str(v)


def render_flat(text, stack):
    def var(m):
        raw, path = (m.group(1), True) if m.group(1) else (m.group(2), False)
        if not raw:
            return m.group(0)
        try:
            v = lookup(raw, stack)
        except KeyError:
            if raw in MACROS:
                return MACROS[raw]("", stack[0])
            warn("%s: unknown placeholder {{%s}}" % (stack[0]["_name"], raw))
            return ""
        return fmt(v) if path else esc(fmt(v))
    text = VAR_RE.sub(var, text)

    def macro(m):
        name, arg = m.group(1), m.group(2)
        if name in MACROS:
            return MACROS[name](arg, stack[0])
        warn("%s: unknown macro {{%s}}" % (stack[0]["_name"], name))
        return ""
    return MACRO_RE.sub(macro, text)


def partial(name):
    p = SRC / "partials" / (name + ".html")
    if not p.exists():
        sys.exit("missing partial: " + name)
    return p.read_text(encoding="utf-8")


def include_partials(text, depth=0):
    if depth > 6:
        return text
    return re.sub(r"\{\{>\s*([\w\-]+)\s*\}\}", lambda m: include_partials(partial(m.group(1)), depth + 1), text)


# ------------------------------------------------------------------ pages
def parse(text):
    fm, body = {}, text
    if text.startswith("---"):
        head, _, body = text[3:].partition("\n---")
        body = body.lstrip("\n")
        for line in head.splitlines():
            if ":" in line and not line.strip().startswith("#"):
                k, v = line.split(":", 1)
                fm[k.strip()] = v.strip()
    return fm, body


def asset_tags(spec, kind, name):
    out = []
    for item in [s.strip() for s in (spec or "").split(",") if s.strip()]:
        rel = "%s/pages/%s.%s" % (kind, item, kind)
        if not (ROOT / rel).exists():
            PENDING.add(rel)
            continue
        out.append('  <link rel="stylesheet" href="%s">\n' % rel if kind == "css" else '  <script src="%s" defer></script>\n' % rel)
    return "".join(out)


def apply_current(text, fm):
    def rep(m):
        key, val = m.group(1), m.group(2)
        return 'aria-current="page"' if fm.get(key) == val else ""
    return re.sub(r'\s?data-cur="(\w+):([\w\-]+)"', lambda m: (" " + rep(m)) if rep(m) else "", text)


PAGES_INDEX = []


def build(name, fm, body, extra=None):
    layout = fm.get("layout", "site")
    nav = fm.get("nav", "")
    ctx = {"_name": name, "year": YEAR, "brand": BRAND, "layout": layout, "body_class": "",
           "home_on": "on" if nav in ("home1", "home2") else "",
           "home_open": "true" if nav in ("home1", "home2") else "false",
           "home_hidden": "" if nav in ("home1", "home2") else " hidden",
           "tx_all": TREATMENTS, "doctors": DOCTORS, "posts": POSTS, "specialties": TXD["specialties"]}
    ctx.update(extra or {})
    for k, v in fm.items():
        ctx.setdefault(k, v)
    if fm.get("body_class"):
        ctx["body_class"] = fm["body_class"]
    if "auth_points" in fm:
        ctx["auth_points"] = [p.strip() for p in fm["auth_points"].split("|") if p.strip()]
    stack = [ctx]
    for k in ("title", "description", "h1", "lead", "crumbs", "app_title", "auth_h", "auth_p", "auth_alt", "auth_img", "eyebrow", "preload"):
        if k in ctx and isinstance(ctx[k], str) and "{{" in ctx[k]:
            ctx[k] = html.unescape(render(ctx[k], stack))
    ctx["title"] = ctx.get("title") or "%s | %s" % (name, BRAND)
    ctx["description"] = ctx.get("description") or DEFAULT_DESC
    ctx["crumbs_html"] = crumbs_html(ctx.get("crumbs", ""), ctx)
    # report 97: inner-page header with a background photo (front matter head_img / head_alt)
    ctx["head_img_html"] = m_img("%s | %s | 100vw | eager" % (ctx["head_img"], ctx.get("head_alt", "")), ctx) if ctx.get("head_img") else ""
    ctx["page_css"] = asset_tags(fm.get("css", ""), "css", name)
    ctx["page_js"] = asset_tags(fm.get("js", ""), "js", name)
    ctx["app_js"] = '  <script src="js/app.js" defer></script>\n' if layout == "app" else ""
    pre = ctx.get("preload")
    ctx["preload_tag"] = ('  <link rel="preload" as="image" href="images/%s-800.webp" imagesrcset="images/%s-800.webp 800w, images/%s-1600.webp 1600w%s" imagesizes="100vw" fetchpriority="high">\n' % (
        pre, pre, pre, (", images/%s-2000.webp 2000w" % pre) if (ROOT / ("images/%s-2000.webp" % pre)).exists() else "")) if pre else ""
    body = body.rstrip() + "\n"
    if layout == "app":
        page = "{{> head}}{{> app-start}}" + body + "{{> app-end}}{{> scripts}}"
    elif layout == "auth":
        page = "{{> head}}{{> auth-start}}" + body + "{{> auth-end}}{{> scripts}}"
    elif layout == "bare":
        page = "{{> head}}<body class=\"{{body_class}}\">\n" + body + "{{> scripts}}"
    else:
        ph = "{{> page-head}}" if truthy(fm.get("pagehead", "")) else ""
        page = "{{> head}}{{> header}}\n  <main id=\"main\">\n" + ph + body + "  </main>\n{{> footer}}{{> overlays}}{{> scripts}}"
    out = render(include_partials(page), stack)
    out = apply_current(out, fm)
    out = re.sub(r"\n\s*\n\s*\n", "\n\n", out)
    (ROOT / (name + ".html")).write_text(out, encoding="utf-8")
    if layout == "site" and fm.get("search", "yes") != "no" and name != "404" and not name.startswith(("treatment-", "doctor-", "blog-")):
        PAGES_INDEX.append({"url": name + ".html", "title": re.sub(r"\s*[|·]\s*Tridya.*$", "", ctx["title"]), "text": ctx["description"]})
    return name


def write_site_data():
    slim_tx = [{k: t[k] for k in ("slug", "name", "short", "specialty", "specialty_label", "setting", "setting_class", "time", "helps", "page", "photo", "lead", "fee")} for t in TREATMENTS]
    slim_doc = [{k: d[k] for k in ("slug", "name", "short", "initials", "role", "specialty", "clinic", "filter", "room", "days", "session", "next_slot", "fee", "page", "portrait", "experience", "languages_label", "tags")} for d in DOCTORS]
    slim_posts = [{k: p.get(k) for k in ("n", "slug", "page", "title", "category", "author", "date_label", "read", "cover", "excerpt")} for p in POSTS]
    data = {"treatments": slim_tx, "doctors": slim_doc, "posts": slim_posts, "pages": PAGES_INDEX, "specialties": TXD["specialties"]}
    (DATA / "site-data.js").write_text("/* generated by scripts/build.py from data/*.json: do not edit */\nwindow.TRIDYA = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")


def main():
    names = []
    for p in sorted((SRC / "pages").glob("*.html")):
        fm, body = parse(p.read_text(encoding="utf-8"))
        names.append(build(p.stem, fm, body))
    tfm, tbody = parse((SRC / "templates" / "treatment.html").read_text(encoding="utf-8"))
    for t in TREATMENTS:
        names.append(build("treatment-" + t["slug"], dict(tfm), tbody, {"tx": t}))
    dfm, dbody = parse((SRC / "templates" / "doctor.html").read_text(encoding="utf-8"))
    for d in DOCTORS:
        names.append(build("doctor-" + d["slug"], dict(dfm), dbody, {"doc": d}))
    write_site_data()
    print("built %d pages" % len(names))
    for w in sorted(set(WARN)):
        print("  warning: " + w)
    if PENDING:
        print("  note: %d page asset(s) referenced but not written yet (skipped): %s" % (len(PENDING), ", ".join(sorted(PENDING))))
    if MISSING:
        print("  note: %d image slot(s) not in images/ yet (build continues): %s" % (len(MISSING), ", ".join(sorted(MISSING))))


if __name__ == "__main__":
    main()
