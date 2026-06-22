module.exports = {
  rootDir: ".",
  // e2e specs each boot the app on the single configured port, so suites must
  // run serially rather than in parallel workers.
  maxWorkers: 1,
  moduleFileExtensions: ["js", "json", "ts"],
  extensionsToTreatAsEsm: [".ts"],
  modulePaths: ["<rootDir>"],
  testRegex: ".spec.ts$",
  coverageDirectory: "./coverage",
  coverageReporters: ["html"],
  testEnvironment: "node",
  coveragePathIgnorePatterns: ["<rootDir>/src/utils", "<rootDir>/swagger"],
  transform: {
    "^.+\\.(t|j)s$": ["ts-jest"],
  },
  moduleNameMapper: {
    "^@src/(.*)$": "src/$1",
  },
}
