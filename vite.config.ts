import { generateMessageId } from "@lingui/message-utils/generateMessageId";
import { lingui } from "@lingui/vite-plugin";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, UserConfig } from "vite";
import { ViteMinifyPlugin } from "vite-plugin-minify";
import tsconfigPaths from "vite-tsconfig-paths";

function replaceTws() {
    return {
        name: "replace-tws",
        transform(code: string) {
            return {
                code: code.replace(/tw`(.*)`/g, '"$1"'),
            };
        },
    };
}

function resolveHTMLi18n() {
    return {
        name: "resolve-html-i18n",
        transformIndexHtml(html: string) {
            return html.replace(
                /data-i18n(?:-title|-placeholder)?="([^"]+)"/g,
                (match, p1) =>
                    `data-i18n${match.match(/-(title|placeholder)/)?.[0] || ""}="${generateMessageId(p1)}"`,
            );
        },
    };
}

// https://vitejs.dev/config/
export default defineConfig(
    () =>
        ({
            // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
            //
            // 1. prevent vite from obscuring rust errors
            clearScreen: false,
            root: "./src",
            build: {
                minify: "terser",
                rollupOptions: {
                    input: {
                        main: "./src/windows/main/MainWindow.html",
                        settings: "./src/windows/settings/SettingsWindow.html",
                        about: "./src/windows/about/AboutWindow.html",
                    },
                    output: {
                        manualChunks: {
                            "language-tags": ["language-tags"],
                        },
                    },
                    plugins: [replaceTws()],
                },
                terserOptions: {
                    compress: {
                        passes: 50,
                        unsafe: true,
                        toplevel: true,
                        pure_getters: true,
                        module: true,
                        drop_console: true,
                        drop_debugger: true,
                        hoist_funs: true,
                        inline: true,
                        ecma: 2020,
                    },
                    mangle: {
                        toplevel: true,
                        properties: false,
                    },
                    output: {
                        ecma: 2020,
                        comments: false,
                        beautify: false,
                    },
                    module: true,
                    toplevel: true,
                },
            },
            // 2. tauri expects a fixed port, fail if that port is not available
            server: {
                port: 1420,
                strictPort: true,
                watch: {
                    // 3. tell vite to ignore watching `src-tauri`
                    ignored: ["**/src-tauri/**"],
                },
            },
            plugins: [
                ViteMinifyPlugin(),
                tsconfigPaths(),
                react({
                    plugins: [["@lingui/swc-plugin", {}]],
                }),
                lingui(),
                resolveHTMLi18n(),
            ],
        }) satisfies UserConfig,
);
