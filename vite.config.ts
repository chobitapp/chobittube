import { cloudflare } from "@cloudflare/vite-plugin";
import stylex from "@stylexjs/unplugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		stylex.vite({
			useCSSLayers: true,
			runtimeInjection: false,
		}),
		react(),
		cloudflare(),
	],
});
