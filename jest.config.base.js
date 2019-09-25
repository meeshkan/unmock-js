const { defaults } = require("jest-config");

module.exports = {
  testEnvironment: "node",
  preset: "ts-jest",
  testMatch: null,
  testRegex: "/__tests__/.*\\.test\\.(jsx?|tsx?)$",
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  moduleFileExtensions: [...defaults.moduleFileExtensions, "ts", "tsx"],
  moduleNameMapper: {
    "^(unmock(?:-[A-Za-z]+)?|openapi-refinements)(?:/dist)?((?:/.*)|$)":
      "<rootDir>/../../packages/$1/src"
  },
  clearMocks: true,
  transformIgnorePatterns: [
      "/node_modules/(?!loas3)",
  ],
  collectCoverageFrom: [
    "**/packages/*/src/**/*.ts",
    "!**/node_modules/**",
  ],
  globals: {
    "ts-jest": {
      tsConfig: "<rootDir>/src/__tests__/tsconfig.json",
      babelConfig: true,
      diagnostics: false
    }
  }
};
