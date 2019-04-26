const { defaults } = require("jest-config");

module.exports = {
  testEnvironment: "node",
  preset: "ts-jest",
  testMatch: null,
  testRegex: "/__tests__/.*\\.test\\.(js|ts)$",
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  moduleFileExtensions: [...defaults.moduleFileExtensions, "ts", "tsx"],
  moduleNameMapper: {
    "^(unmock|unmock-cli|unmock-core|unmock-hash|unmock-jsdom|unmock-node)(?:/dist)?((?:/.*)|$)":
      "<rootDir>/../../packages/$1/src$2"
  },
  setupFilesAfterEnv: ["<rootDir>/../../jest.setup.js"],
  clearMocks: true,
  globals: {
    "ts-jest": {
      tsConfig: "<rootDir>/src/__tests__/tsconfig.json",
      diagnostics: false
    }
  }
};
