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

# Hosted slide decks (static Slidev builds). Each deck is built with its
# folder as the base path, so every asset it references must exist locally.
deck_count=0
# Paths that appear as plain strings in deck code but are never fetched.
# /princeton-lockup.svg: the cover layout compares the logo setting against it
# and swaps in the bundled, hashed copy under assets/.
IGNORED_REFS="/princeton-lockup.svg"
for deck_index in "$SITE_DIR"/assets/downloads/presentations/*/*/index.html; do
  [ -f "$deck_index" ] || continue
  deck_count=$((deck_count + 1))
  deck_dir=$(dirname "$deck_index")
  base="/${deck_dir#"$SITE_DIR"/}/"
  name="${deck_dir#"$SITE_DIR"/}"

  if grep -q "$base" "$deck_index"; then pass "$name: index.html uses its folder as base path"; else fail "$name: index.html does not reference $base"; fi

  if grep -q 'nav-hint\.js' "$deck_index" && grep -q 'nav-hint\.css' "$deck_index"; then
    pass "$name: index.html loads the visible navigation controls"
  else
    fail "$name: index.html does not load nav-hint.js and nav-hint.css"
  fi

  missing=0
  checked=0
  refs=$(grep -rhoE "[\"'\`(]/[A-Za-z0-9_./@-]+\.(js|css|svg|png|jpe?g|gif|webp|woff2?|mp4)" "$deck_dir" \
    | cut -c2- | grep -v '^//' | sort -u)
  for ref in $refs; do
    case " $IGNORED_REFS " in *" $ref "*) continue ;; esac
    case "$ref" in
      "$base"*) local_path="$deck_dir/${ref#"$base"}" ;;
      /assets/*) continue ;; # absolute path outside this deck; not ours
      *) local_path="$deck_dir$ref" ;; # public/ asset resolved against base at runtime
    esac
    checked=$((checked + 1))
    if [ ! -f "$local_path" ]; then echo "  missing: $ref"; missing=$((missing + 1)); fi
  done
  if [ "$checked" -eq 0 ]; then
    fail "$name: found no asset references to check"
  elif [ "$missing" -eq 0 ]; then
    pass "$name: all $checked referenced assets exist"
  else
    fail "$name: $missing of $checked referenced assets are missing"
  fi
done
if [ "$deck_count" -ge 1 ]; then pass "found $deck_count hosted deck(s)"; else fail "no hosted decks found"; fi

echo "---"
echo "$passed passed, $failed failed"
if [ "$passed" -eq 0 ]; then echo "FAIL: no checks ran"; exit 1; fi
[ "$failed" -eq 0 ]
