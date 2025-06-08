export function setSecretAside(): string {
  return `<aside class="warning">
    <p>⚠️ Tunnel secret (<code>WEBHOOKS_PROXY_TUNNEL_SECRET</code>) is not set. Anyone can connect to any tunnel knowing the tunnel URL.</p>
    <p>To set the secret, run <code>npm run reset-secret</code> in the <code>./worker</code> directory.</p>
  </aside>`;
}
