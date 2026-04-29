#!/usr/bin/env bash
#
# Run `git subrepo pull` for every folder inside the .suede directory.
#
set -euo pipefail

# Resolve .suede relative to this script's location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUEDE_DIR="${SCRIPT_DIR}/../.suede"

if [[ ! -d "$SUEDE_DIR" ]]; then
    echo "Error: Directory '$SUEDE_DIR' does not exist." >&2
    exit 1
fi

# git subrepo must be run from inside a git working tree, with the subrepo
# path expressed relative to the repo root. The repo root is the parent of
# .suede.
REPO_ROOT="$(cd "${SUEDE_DIR}/.." && pwd)"

if ! command -v git >/dev/null 2>&1; then
    echo "Error: 'git' is required but not installed." >&2
    exit 1
fi

if ! git -C "$REPO_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Error: '$REPO_ROOT' is not a git working tree." >&2
    exit 1
fi

cd "$REPO_ROOT"

# Collect immediate subdirectories of .suede/ (no hidden dirs, no files)
shopt -s nullglob
folders=( .suede/*/ )
shopt -u nullglob

if [[ ${#folders[@]} -eq 0 ]]; then
    echo "No folders found in .suede/."
    exit 0
fi

failed=()
for folder in "${folders[@]}"; do
    # Strip trailing slash for cleaner output and command args
    path="${folder%/}"
    echo "==> git subrepo pull ${path}"
    if ! git subrepo pull "$path"; then
        failed+=( "$path" )
    fi
    echo
done

if [[ ${#failed[@]} -gt 0 ]]; then
    echo "Failed to pull ${#failed[@]} subrepo(s):" >&2
    printf '  - %s\n' "${failed[@]}" >&2
    exit 1
fi

echo "Done."