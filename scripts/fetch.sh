#!/usr/bin/env bash
#
# Fetch public repos from GitHub user pmalacho-mit, filter for those ending
# in "-suede", and run the suede install-release script for each.
#
set -euo pipefail

USER="pmalacho-mit"

# Resolve SUEDE_DIR relative to this script's location, not the caller's CWD
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUEDE_DIR="${SCRIPT_DIR}/../.suede"

# Check dependencies
for cmd in curl jq; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        echo "Error: '$cmd' is required but not installed." >&2
        exit 1
    fi
done

# Fetch all public repos (handles pagination, 100 per page)
fetch_repo_names() {
    local page=1
    while :; do
        local response
        response=$(curl -fsSL \
            -H "Accept: application/vnd.github+json" \
            "https://api.github.com/users/${USER}/repos?per_page=100&page=${page}&type=public")

        local count
        count=$(printf '%s' "$response" | jq 'length')

        if [[ "$count" -eq 0 ]]; then
            break
        fi

        printf '%s' "$response" | jq -r '.[].name'

        # Last page if we got fewer than the per_page max
        if [[ "$count" -lt 100 ]]; then
            break
        fi
        ((page++))
    done
}

echo "Fetching public repos for ${USER}..."
mapfile -t suede_repos < <(fetch_repo_names | grep -E -- '-suede$' || true)

if [[ ${#suede_repos[@]} -eq 0 ]]; then
    echo "No repos ending in '-suede' found."
    exit 0
fi

echo "Found ${#suede_repos[@]} suede repo(s):"
printf '  - %s\n' "${suede_repos[@]}"
echo

# Move into the suede working directory
if [[ ! -d "$SUEDE_DIR" ]]; then
    echo "Error: Directory '$SUEDE_DIR' does not exist." >&2
    exit 1
fi
cd "$SUEDE_DIR"
echo "Working in: $(pwd)"
echo

# Install each filtered repo, skipping any that already exist locally
for repo in "${suede_repos[@]}"; do
    if [[ -e "$repo" ]]; then
        echo "==> Skipping ${repo} (already exists in $(pwd))"
        continue
    fi
    echo "==> Installing ${USER}/${repo}"
    bash <(curl -fsSL https://suede.sh/install-release) --repo "${USER}/${repo}"
done

echo
echo "Done."