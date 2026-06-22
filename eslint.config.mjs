// @ts-check
import eslint from "@eslint/js"
import prettierRecommended from "eslint-plugin-prettier/recommended"
import simpleImportSort from "eslint-plugin-simple-import-sort"
import tseslint from "typescript-eslint"

/**
 * * Flat ESLint config (ESLint 9+). Replaces the legacy `.eslintrc.js`.
 */
export default tseslint.config(
    {
        // Files that should never be linted.
        ignores: [
            "dist/**",
            "node_modules/**",
            "doc/**",
            "coverage/**",
            "swagger/**",
            "**/*.config.js",
            "**/*.config.mjs",
            "webpack-hmr.config.js",
            // Generated GraphQL Zeus client.
            "src/utils/graphql/zeus/**",
        ],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: {
            "simple-import-sort": simpleImportSort,
        },
        rules: {
            "no-param-reassign": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/no-floating-promises": "off",
            "@typescript-eslint/unbound-method": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-misused-promises": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/no-namespace": "off",
            "@typescript-eslint/require-await": "off",
            "@typescript-eslint/no-use-before-define": [
                "error",
                { functions: false },
            ],
            "@typescript-eslint/naming-convention": [
                "error",
                {
                    selector: "variable",
                    format: ["camelCase", "UPPER_CASE", "PascalCase"],
                },
            ],
            "simple-import-sort/imports": "error",
        },
    },
    prettierRecommended,
)
