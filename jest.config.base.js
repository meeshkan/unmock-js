const { defaults } = require("jest-config");

module.exports = {
  testEnvironment: "node",
  testMatch: null,
  testRegex: "/__tests__/.*\\.test\\.(js|ts)$",
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  moduleFileExtensions: [...defaults.moduleFileExtensions, "ts", "tsx"],
  moduleNameMapper: {
    "^(unmock|unmock-cli|unmock-core|unmock-jsdom|unmock-node)(?:/dist)?((?:/.*)|$)":
      "<rootDir>/../../packages/$1/src$2"
  },
  clearMocks: true,
  transformIgnorePatterns: [
      "/node_modules/(?!loas3|istanbul-lib-source-maps)",
  ]
};
