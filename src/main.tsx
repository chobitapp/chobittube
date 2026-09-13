import { InternationalizationProvider } from "@astryxdesign/core/i18n";
import jaJP from "@astryxdesign/core/locales/ja-JP.json";
import { Theme } from "@astryxdesign/core/theme";
import { matchaTheme } from "@astryxdesign/theme-matcha/built";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const root = document.getElementById("root");
if (!root) {
	throw new Error("root element is missing");
}

createRoot(root).render(
	<StrictMode>
		<InternationalizationProvider locale="ja-JP" messages={{ "ja-JP": jaJP }}>
			<Theme theme={matchaTheme} mode="system">
				<App />
			</Theme>
		</InternationalizationProvider>
	</StrictMode>,
);
