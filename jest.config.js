module.exports = {
  rootDir: ".",
  // e2e specs each boot the app on the single configured port, so suites must
  // run serially rather than in parallel workers.
  maxWorkers: 1,
  moduleFileExtensions: ["js", "json", "ts"],
  modulePaths: ["<rootDir>"],
  testRegex: ".spec.ts$",
  coverageDirectory: "./coverage",
  coverageReporters: ["html", "lcov"],
  testEnvironment: "node",
  coveragePathIgnorePatterns: ["<rootDir>/src/utils", "<rootDir>/swagger"],
  // `uuid` v13 ships ESM-only; let ts-jest transpile it (everything else under
  // pnpm's store stays ignored) so the CommonJS test runner can require it.
  transformIgnorePatterns: ["/node_modules/\\.pnpm/(?!uuid@)"],
  transform: {
    // Use a test-only tsconfig with `isolatedModules` (transpile-only): the
    // generated Zeus client (excluded from the app's tsconfig) does not satisfy
    // the project's strict type rules, and full type-checking is the job of
    // `pnpm run typecheck`, not the test runner.
    "^.+\\.(t|j)s$": ["ts-jest", { tsconfig: "tsconfig.spec.json" }],
  },
  moduleNameMapper: {
    "^@src/(.*)$": "src/$1",
    // The generated Zeus client uses ESM-style relative imports with explicit
    // ".js" extensions (e.g. `from "./const.js"`); strip the extension so the
    // CommonJS ts-jest resolver finds the ".ts" source.
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
}
