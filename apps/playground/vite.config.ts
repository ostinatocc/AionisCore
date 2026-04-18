import { defineConfig, loadEnv } from "vite";
import preact from "@preact/preset-vite";

const DEFAULT_DEV_API = "http://127.0.0.1:3001";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const apiUrl = env.VITE_AIONIS_API_URL ?? DEFAULT_DEV_API;

  // In production builds the env var must be set. A silently wrong default
  // would be worse than a loud failure, so stop the build here.
  if (mode === "production" && !env.VITE_AIONIS_API_URL) {
    throw new Error(
      "VITE_AIONIS_API_URL must be set for production builds of aionis-playground.",
    );
  }

  return {
    plugins: [preact()],
    build: {
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: mode !== "production",
      target: "es2022",
      reportCompressedSize: true,
      rollupOptions: {
        output: {
          manualChunks: {
            preact: ["preact", "preact/hooks"],
          },
        },
      },
    },
    server: {
      port: 5190,
      host: "127.0.0.1",
      proxy: {
        "/v1": { target: apiUrl, changeOrigin: false },
        "/health": { target: apiUrl, changeOrigin: false },
      },
    },
    preview: {
      port: 5191,
      host: "127.0.0.1",
    },
    define: {
      __PLAYGROUND_VERSION__: JSON.stringify(
        process.env.npm_package_version ?? "0.1.0",
      ),
    },
  };
});
