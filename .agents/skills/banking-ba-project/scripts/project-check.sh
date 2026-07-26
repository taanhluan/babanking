#!/usr/bin/env bash
set -euo pipefail

mode="${1:-safety}"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$repo_root"

echo "== Banking BA project check =="
echo "Repository: $repo_root"
echo
git status --short
echo
npm run db:check-env

if [[ "$mode" == "safety" ]]; then
  exit 0
fi

if [[ "$mode" != "validate" ]]; then
  echo "Usage: $0 [safety|validate]" >&2
  exit 2
fi

npm test
npm run lint
npx tsc --noEmit
npm run build
