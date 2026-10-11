// Explanation: Load server-only configuration for the temporary translation endpoint.
// Reason: Local development needs the same backend as deployed on-demand translation.
// import { defineConfig } from "vite";
// Explanation: Load server-only configuration for the temporary translation endpoint.
// Reason: Local development needs the same backend as deployed on-demand translation.
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
// Explanation: Declare the server environment shape used by this configuration.
// Reason: The project intentionally omits global Node types from its browser TypeScript configuration.
declare const process: { env: Record<string, string | undefined> };

export default defineConfig({
  base: "./",
// Explanation: Add server-only translation routes to Vite development.
// Reason: The Translate button must reach validation during local development as well as deployment.
//   plugins: [react()],
// Explanation: Add server-only translation routes to Vite development.
// Reason: The Translate button must reach validation during local development as well as deployment.
  plugins: [react(), {
// Explanation: Implement the temporary translation operation below.
// Reason: Serve explicit translation requests locally without exposing server credentials in the Vite client bundle.
name: "temporary-translation-api",
// Explanation: Implement the temporary translation operation below.
// Reason: Serve explicit translation requests locally without exposing server credentials in the Vite client bundle.
    configureServer(server) {
// Explanation: Implement the temporary translation operation below.
// Reason: Serve explicit translation requests locally without exposing server credentials in the Vite client bundle.
      const environment = loadEnv(server.config.mode, server.config.root, "");
// Explanation: Implement the temporary translation operation below.
// Reason: Serve explicit translation requests locally without exposing server credentials in the Vite client bundle.
// Explanation: Preserve the original limited server environment list.
// Reason: The translated docent also needs the existing rate-limit configuration during development.
//       for (const key of ["OPENAI_API_KEY", "OPENAI_MODEL", "TRANSLATION_MODEL", "TRANSLATION_DAILY_BUDGET"]) if (!process.env[key] && environment[key]) process.env[key] = environment[key];
// Explanation: Load translation and existing docent server settings from local environment files.
// Reason: Both development endpoints must enforce the same limits as deployed handlers.
      for (const key of ["OPENAI_API_KEY", "OPENAI_MODEL", "TRANSLATION_MODEL", "TRANSLATION_DAILY_BUDGET", "DOCENT_ACCEPT_APPROX_LIMITS", "DOCENT_DAILY_BUDGET", "KV_REST_API_URL", "KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]) if (!process.env[key] && environment[key]) process.env[key] = environment[key];
// Explanation: Implement the temporary translation operation below.
// Reason: Serve explicit translation requests locally without exposing server credentials in the Vite client bundle.
// Explanation: Preserve the direct request forwarding statement.
// Reason: Vite's reduced Node declarations do not expose the full incoming request shape to TypeScript.
//       server.middlewares.use("/api/translate", (request, response, next) => { void import("./api/translate").then(module => module.default(request, response)).catch(next); });
// Explanation: Adapt the real Node request to the translation handler's structural interface.
// Reason: Runtime requests support headers, events and async iteration even with reduced Vite declarations.
      server.middlewares.use("/api/translate", (request, response, next) => { void import("./api/translate").then(module => module.default(request as unknown as Parameters<typeof module.default>[0], response)).catch(next); });
// Explanation: Implement the temporary translation operation below.
// Reason: Serve explicit translation requests locally without exposing server credentials in the Vite client bundle.
// Explanation: Preserve the direct docent request forwarding statement.
// Reason: The handler and Vite use different compile-time request declarations.
//       server.middlewares.use("/api/docent", (request, response, next) => { void import("./api/docent").then(module => module.default(request, response)).catch(next); });
// Explanation: Adapt the real Node request to the existing docent handler interface.
// Reason: The local route must typecheck without changing the project's global type settings.
      server.middlewares.use("/api/docent", (request, response, next) => { void import("./api/docent").then(module => module.default(request as unknown as Parameters<typeof module.default>[0], response)).catch(next); });
// Explanation: Implement the temporary translation operation below.
// Reason: Serve explicit translation requests locally without exposing server credentials in the Vite client bundle.
    },
// Explanation: Complete the development API plugin registration.
// Reason: The original React plugin remains active alongside translation routing.
  }],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("/node_modules/three/") ||
            id.includes("/node_modules/@react-three/")
          ) {
            return "three-vendor";
          }
        },
      },
    },
    target: "es2022",
  },
});
