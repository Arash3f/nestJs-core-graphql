module.exports = {
  rootDir: ".",
  moduleFileExtensions: ["js", "json", "ts"],
  extensionsToTreatAsEsm: ['.ts'],
  modulePaths: ["<rootDir>"],
  testRegex: ".e2e.spec.ts$",
  coverageDirectory: "./coverage",
  coverageReporters: ["html"],
  testEnvironment: "node",
  transform: {
    "^.+\\.(t|j)s$": ["ts-jest"],
  },
  moduleNameMapper: {
    "^@src/(.*)$": "src/$1"
  },
};