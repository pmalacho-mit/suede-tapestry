#!/usr/bin/env bash

set -euo pipefail

usage() {
	cat <<'EOF'
Usage: install.sh [--force] [file]

Examples:
	./install.sh common.json
	./install.sh
	./install.sh --force node-default.json

Notes:
	- The file must be a .json file located next to this script.
	- If no file is provided, an interactive picker is shown.
EOF
}

err() {
	echo "Error: $*" >&2
}

self_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
force=false

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
	usage
	exit 0
fi

selected_name=""
while [[ $# -gt 0 ]]; do
	case "$1" in
		--force)
			force=true
			;;
		-*)
			err "Unknown option: $1"
			usage
			exit 1
			;;
		*)
			if [[ -n "$selected_name" ]]; then
				err "Expected at most one file argument."
				usage
				exit 1
			fi
			selected_name="$1"
			;;
	esac
	shift
done

# Collect candidate JSON files co-located with this script.
mapfile -t json_files < <(find "$self_dir" -maxdepth 1 -type f -name '*.json' -printf '%f\n' | sort)

if [[ ${#json_files[@]} -eq 0 ]]; then
	err "No JSON files found next to this script."
	exit 1
fi

print_options() {
	echo "Available files:" >&2
	local i
	for i in "${!json_files[@]}"; do
		echo "  $((i + 1)). ${json_files[$i]}" >&2
	done
}

select_interactively() {
	if [[ ! -t 0 ]]; then
		err "No file provided and no interactive terminal is available."
		print_options
		exit 1
	fi

	echo "Select a file:" >&2
	print_options
	local choice
	read -r -p "Enter number: " choice

	if [[ ! "$choice" =~ ^[0-9]+$ ]]; then
		err "Invalid selection '$choice'. Expected a number."
		exit 1
	fi

	if (( choice < 1 || choice > ${#json_files[@]} )); then
		err "Selection out of range: $choice"
		exit 1
	fi

	printf '%s\n' "${json_files[$((choice - 1))]}"
}

if [[ -z "$selected_name" ]]; then
	selected_name="$(select_interactively)"
else
	if [[ ! -f "$self_dir/$selected_name" ]]; then
		err "JSON file '$selected_name' was not found next to this script."
		print_options
		exit 1
	fi
fi

source_file="$self_dir/$selected_name"

repo_root="$(git -C "$self_dir" rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$repo_root" ]]; then
	err "Could not identify repository root. Ensure this script is run from within a Git repository."
	exit 1
fi

devcontainer_dir="$repo_root/.devcontainer"
target_link="$devcontainer_dir/devcontainer.json"
relative_source_file="$(realpath --relative-to="$devcontainer_dir" "$source_file")"

mkdir -p "$devcontainer_dir"

if [[ -e "$target_link" || -L "$target_link" ]]; then
	if [[ "$force" == true ]]; then
		rm -f "$target_link"
	else
		err "$target_link already exists. Use --force to replace it."
		exit 1
	fi
fi

ln -s "$relative_source_file" "$target_link"

echo "Linked $target_link -> $relative_source_file"
