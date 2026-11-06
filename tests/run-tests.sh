#!/usr/bin/env bash
# Build + unit tests + site QA. Usage: bash tests/run-tests.sh [--quick] [--pages a.html,b.html] [--no-clicks]
set -u
cd "$(dirname "$0")/.."
python3 scripts/build.py || exit 1
status=0
echo "== Unit tests (node:test) =="
node --test tests/validation.test.js || status=1
echo
echo "== Site QA (Playwright) =="
node tests/qa.cjs "$(pwd)" "$@" || status=1
exit $status
