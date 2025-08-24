// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import react from "@vitejs/plugin-react-swc";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "happy-dom",
    },
    plugins: [
        tsconfigPaths(),
        react({
            plugins: [["@lingui/swc-plugin", {}]],
        }),
    ],
});
