#!/usr/bin/env bash
# Runs the same type-check with three TypeScript versions and prints the error count.
set -u
cd "$(dirname "$0")"
npx prisma generate >/dev/null
for v in 5.9.2 6.0.3 7; do
  out=$(npx -y -p typescript@$v tsc --noEmit -p tsconfig.json 2>&1)
  n=$(printf '%s\n' "$out" | grep -c "error TS")
  printf '\n=== typescript@%s -> %s error(s) ===\n' "$v" "$n"
  printf '%s\n' "$out" | grep "error TS" | sed 's/ in type .*//'
done
