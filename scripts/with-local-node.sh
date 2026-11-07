#!/bin/sh
# Workspace-local Node.js; does not change global shell or Netlify settings.
set -eu
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
node_bin="$project_dir/../../../.tools/node-runtime/node-v22.23.4-darwin-arm64/bin"
if [ ! -x "$node_bin/node" ]; then
  echo "Workspace Node.js 22.23.4 is missing: $node_bin" >&2
  exit 1
fi
export PATH="$node_bin:$PATH"
cd "$project_dir"
exec "$@"
