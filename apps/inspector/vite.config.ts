import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

const DEFAULT_RUNTIME_ORIGIN = "http://127.0.0.1:3001";

export default defineConfig(({ mode }) => {
  const runtimeOrigin = process.env.AIONIS_RUNTIME_ORIGIN ?? DEFAULT_RUNTIME_ORIGIN;

  return {
    plugins: [preact()],
    base: "./",
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
      port: 5180,
      host: "127.0.0.1",
      proxy: {
        "/v1": { target: runtimeOrigin, changeOrigin: false },
        "/health": { target: runtimeOrigin, changeOrigin: false },
      },
    },
    preview: {
      port: 5181,
      host: "127.0.0.1",
    },
    define: {
      __INSPECTOR_VERSION__: JSON.stringify(process.env.npm_package_version ?? "0.1.0"),
    },
  };
});
