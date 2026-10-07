import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * SEC-007: build the Content-Security-Policy per mode instead of shipping the dev policy into
 * the production bundle. Production drops `'unsafe-inline'` (Vite emits only external script and
 * style assets there) and never bakes in localhost/ws origins — `connect-src` is composed from
 * the deployed Keycloak/API origins supplied at build time.
 */
function contentSecurityPolicy(env, isProd) {
  const connect = ["'self'", env.VITE_KEYCLOAK_URL, env.VITE_API_ORIGIN];
  if (!isProd) {
    // Dev only: the backend called directly and the Vite HMR websocket.
    connect.push('http://localhost:8080', 'ws://localhost:5173');
  }
  const inline = isProd ? '' : " 'unsafe-inline'"; // Vite's dev preamble + injected styles

  return [
    "default-src 'self'",
    `connect-src ${[...new Set(connect.filter(Boolean))].join(' ')}`,
    "img-src 'self' data:",
    `style-src 'self'${inline}`,
    `script-src 'self'${inline}`,
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

/** Replaces the __CSP_POLICY__ placeholder in index.html with the mode-appropriate policy. */
function cspPlugin(env, isProd) {
  return {
    name: 'mg01-csp',
    transformIndexHtml(html) {
      return html.replace('__CSP_POLICY__', contentSecurityPolicy(env, isProd));
    },
  };
}

// Dev proxy so the SPA calls the .NET backend same-origin (avoids CORS).
// All /api traffic is forwarded to the Transaction Type service on :5000.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const isProd = mode === 'production';

  return {
    plugins: [react(), cspPlugin(env, isProd)],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
  };
});
