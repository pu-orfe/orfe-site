#!/bin/sh
# Validate the static site before it is published.
# Every check prints PASS or FAIL; the script exits non-zero on any failure
# and also fails if no checks ran, so silence never counts as success.
set -eu

SITE_DIR="${1:-site}"
EXPECTED_DOMAIN="www.orfe.princeton.edu"
passed=0
failed=0

pass() { echo "PASS: $1"; passed=$((passed + 1)); }
fail() { echo "FAIL: $1"; failed=$((failed + 1)); }

INDEX="$SITE_DIR/index.html"

if [ -f "$INDEX" ]; then pass "index.html exists"; else fail "index.html missing at $INDEX"; fi

if [ -f "$INDEX" ]; then
  if grep -q '<title>[^<][^<]*</title>' "$INDEX"; then pass "index.html has a non-empty <title>"; else fail "index.html missing <title>"; fi
  if grep -q 'Hello, world!' "$INDEX"; then pass "index.html contains greeting"; else fail "index.html missing greeting"; fi
  if grep -q '<html lang=' "$INDEX"; then pass "index.html declares a language"; else fail "index.html missing lang attribute"; fi
  if grep -q 'name="viewport"' "$INDEX"; then pass "index.html has viewport meta"; else fail "index.html missing viewport meta"; fi

  if command -v tidy >/dev/null 2>&1; then
    # tidy exits 0 (clean), 1 (warnings), 2 (errors). Treat warnings as failures too.
    if tidy -q -e "$INDEX" >/tmp/tidy.out 2>&1; then
      pass "index.html is valid HTML (tidy)"
    else
      cat /tmp/tidy.out
      fail "index.html has HTML warnings or errors (tidy)"
    fi
  else
    fail "tidy is not installed; cannot validate HTML"
  fi
fi

CNAME_FILE="$SITE_DIR/CNAME"
if [ -f "$CNAME_FILE" ] && [ "$(tr -d '[:space:]' <"$CNAME_FILE")" = "$EXPECTED_DOMAIN" ]; then
  pass "CNAME is $EXPECTED_DOMAIN"
else
  fail "CNAME missing or not $EXPECTED_DOMAIN"
fi

echo "---"
echo "$passed passed, $failed failed"
if [ "$passed" -eq 0 ]; then echo "FAIL: no checks ran"; exit 1; fi
[ "$failed" -eq 0 ]
