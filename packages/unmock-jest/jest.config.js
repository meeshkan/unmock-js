const config = require("../../jest.config.base");

module.exports = Object.assign(Object.create(null), config, {
  reporters: [
    "default",
    "/Users/kimmo/git/meeshkan/unmock-js/packages/unmock-jest/dist/reporter.js",
  ],
});
