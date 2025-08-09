import eslint from "@eslint/js";
import pluginLingui from "eslint-plugin-lingui";
import sonarjs from "eslint-plugin-sonarjs";
import { globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default tseslint.config([
    {
        files: ["**/*.ts"],
        extends: [
            eslint.configs.recommended,
            ...tseslint.configs.strictTypeChecked,
            ...tseslint.configs.stylisticTypeChecked,
            pluginLingui.configs["flat/recommended"],
            {
                languageOptions: {
                    parserOptions: {
                        projectService: true,
                        tsconfigRootDir: "./",
                    },
                },
            },
            sonarjs.configs.recommended,
        ],
        rules: {
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/no-misused-promises": "off",
            "@typescript-eslint/restrict-template-expressions": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-dynamic-delete": "off",
            "@typescript-eslint/no-unused-expressions": "warn",
            "no-magic-numbers": [
                "error",
                {
                    ignore: [0, 1, 2, 3, 4, 5, -1, -2, -3, -4, -5],
                    ignoreArrayIndexes: true,
                    enforceConst: true,
                    detectObjects: true,
                },
            ],
            "sonarjs/cognitive-complexity": ["error", 25],
            "@typescript-eslint/use-unknown-in-catch-callback-variable": "off",
            "@typescript-eslint/explicit-member-accessibility": "error",
            "@typescript-eslint/strict-boolean-expressions": "error",
        },
    },
    globalIgnores([
        "src-tauri/target",
        "src/dist",
        "node_modules",
        "vite.config.ts",
        "eslint.config.ts",
    ]),
]);
