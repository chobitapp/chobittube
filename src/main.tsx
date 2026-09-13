import { InternationalizationProvider } from "@astryxdesign/core/i18n";
import jaJP from "@astryxdesign/core/locales/ja-JP.json";
import { Theme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

import "@astryxdesign/core/reset.css";
import "@astryxdesign/core/astryx.css";
import "@astryxdesign/theme-neutral/theme.css";
import "./index.css";

const root = document.getElementById("root");
if (!root) {
	throw new Error("root element is missing");
}

createRoot(root).render(
	<StrictMode>
		<InternationalizationProvider locale="ja-JP" messages={{ "ja-JP": jaJP }}>
			<Theme theme={neutralTheme} mode="light">
				<App />
			</Theme>
		</InternationalizationProvider>
	</StrictMode>,
);
