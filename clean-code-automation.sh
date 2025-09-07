#!/usr/bin/env bash
set -euo pipefail

MODE=${1:-clean}

function analyze() {
  echo "Running ESLint (no fix)..."
  npx -y eslint . || true
  echo "Running Prettier check..."
  npx -y prettier --check "**/*.{ts,tsx,mts,js,jsx,json,md,css,html}" || true
  echo "Type checking..."
  npx -y tsc --noEmit || true
}

function clean() {
  echo "Fixing ESLint issues..."
  npx -y eslint . --fix || true
  echo "Formatting with Prettier..."
  npx -y prettier --write "**/*.{ts,tsx,mts,js,jsx,json,md,css,html}" || true
}

case "$MODE" in
  analyze)
    analyze
    ;;
  clean)
    clean
    ;;
  all)
    analyze
    clean
    ;;
  *)
    clean
    ;;
esac

echo "Clean code routine ($MODE) finished."
