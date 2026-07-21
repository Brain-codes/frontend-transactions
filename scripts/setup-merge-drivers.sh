#!/usr/bin/env bash
# Registers the "ours" merge driver so .gitattributes merge=ours entries work.
# Run once per clone (git config lives in .git/config, which isn't committed).
set -euo pipefail
git config merge.ours.driver true
echo "Registered 'ours' merge driver. .gitattributes merge=ours entries are now active."
