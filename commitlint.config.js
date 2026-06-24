module.exports = {
  extends: ["gitmoji"],
  rules: {
    "header-max-length": [2, "always", 100],
    "type-enum": [
      2,
      "always",
      [
        "feat", "fix", "docs", "ref", "perf", "pack",
        "wip", "Bcode", "version", "deploy",
        "build", "ci", "refactor", "revert", "style", "test", "chore",
      ],
    ],
  },
}
