import { defineConfig } from "@lingui/cli";

export default defineConfig({
    sourceLocale: "en",
    locales: ["ru", "en"],
    catalogs: [
        {
            path: "<rootDir>/src-tauri/resources/locales/{locale}/about/messages",
            include: ["src/windows/about"],
        },
        {
            path: "<rootDir>/src-tauri/resources/locales/{locale}/main/messages",
            include: ["src/windows/main"],
        },
        {
            path: "<rootDir>/src-tauri/resources/locales/{locale}/settings/messages",
            include: ["src/windows/settings"],
        },
    ],
    compileNamespace: "json",
    format: "po",
});
