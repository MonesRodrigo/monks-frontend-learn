#!/usr/bin/env bash
set -euo pipefail

# Applies or updates GitHub branch rulesets from JSON definitions using gh CLI.
# Usage: ./apply-rulesets.sh [owner/repo]

REPO="${1:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Applying rulesets to repository: $REPO"

for file in "$SCRIPT_DIR"/*.json; do
  [ -f "$file" ] || continue
  name=$(node -e "console.log(require('$file').name)")
  echo "Processing ruleset: '$name' from $(basename "$file")..."

  # Check if ruleset already exists
  existing_id=$(gh api "repos/$REPO/rulesets" --jq ".[] | select(.name == \"$name\") | .id" || true)

  if [ -n "$existing_id" ]; then
    echo "Updating existing ruleset ID: $existing_id..."
    gh api --method PUT "repos/$REPO/rulesets/$existing_id" --input "$file" > /dev/null
    echo "Updated successfully."
  else
    echo "Creating new ruleset..."
    gh api --method POST "repos/$REPO/rulesets" --input "$file" > /dev/null
    echo "Created successfully."
  fi
done

echo "All rulesets applied successfully to $REPO."
