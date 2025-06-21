#!/usr/bin/env bash

set -euo pipefail

echo "Renaming the worker..."

sed -i -e "s/\"webhooks-proxy-tunnel\"/\"webhooks-proxy-tunnel-$(openssl rand -hex 6)\"/g" wrangler.jsonc

echo "✅ Worker renamed in wrangler.jsonc"
