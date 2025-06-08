#!/usr/bin/env bash

set -euo pipefail

if [ ! -f .dev.vars ]; then
  touch .dev.vars
fi

if grep -q "WEBHOOKS_PROXY_TUNNEL_SECRET" .dev.vars; then
  >&2 echo "A secret already exists in .dev.vars. Please remove it before generating a new one."
  exit 1
fi

echo "Generating a new secret for the worker..."
SECRET="$(openssl rand -base64 30)"

(
  echo -e "# This secret is used by the worker to authenticate requests."
  echo -e "WEBHOOKS_PROXY_TUNNEL_SECRET=\"${SECRET}\""
) >> .dev.vars
echo "✅ Secret generated and saved to .dev.vars"

echo "Putting the secret to the worker..."
npx wrangler secret bulk .dev.vars
