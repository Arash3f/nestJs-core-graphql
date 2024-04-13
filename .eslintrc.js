const { resolve } = require("path")
module.exports = {
  root: true,

  parserOptions: {
    parser: "@typescript-eslint/parser",
    project: resolve(__dirname, "./tsconfig.json"),
    tsconfigRootDir: __dirname,
    ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
    sourceType: "module", // Allows for the use of imports
  },

  ignorePatterns: [
    "/dist",
    "/node_modules",
    "/documentation",
    ".eslintrc.js",
    "jest.config.js",
    "webpack-hmr.config.js",
  ],

  env: {
    browser: true,
  },

  extends: [
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier",
  ],

  plugins: [
    "prettier",
    "@typescript-eslint",
    "simple-import-sort",
    '@stylistic/js',
  ],

  globals: {
    process: true,
  },

  rules: {
    "no-param-reassign": "off",
    quotes: [1, "double"],
    "@typescript-eslint/no-unsafe-member-access": "off",
    "@typescript-eslint/no-unsafe-assignment": "off",
    "@typescript-eslint/no-unsafe-return": "off",
    "@typescript-eslint/no-unsafe-call": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-floating-promises": "off",
    "@typescript-eslint/unbound-method": "off",
    "@typescript-eslint/no-explicit-any": 0,
    "@typescript-eslint/no-misused-promises": 0,
    "@typescript-eslint/no-unsafe-argument": 0,
    "@typescript-eslint/explicit-function-return-type": 0,
    "@typescript-eslint/no-namespace": 0,
    "@typescript-eslint/no-use-before-define": ["error", { functions: false }],
    "@typescript-eslint/naming-convention": [
      "error",
      {
        "selector": "variable",
        "format": ["camelCase", "UPPER_CASE", "PascalCase"]
      }
    ],
    "simple-import-sort/imports": "error",
    "prettier/prettier":[  //or whatever plugin that is causing the clash
      "error",
      {
        "parser": "typescript",
        "tabWidth": 4,
        "semi": false,
        "trailingComma": "all",
        "bracketSameLine": true
      },
    ]
  },
}

