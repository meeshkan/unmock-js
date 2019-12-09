module.exports = function(config) {
  config.set({
    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: "",
    frameworks: ["jasmine", "karma-typescript"],
    // list of files / patterns to load in the browser
    files: ["./src/*.ts", "./tests/*.ts"],
    plugins: [
      "karma-jasmine",
      "karma-chrome-launcher",
      "karma-phantomjs-launcher",
      "karma-spec-reporter",
      "karma-html-reporter",
      "karma-typescript",
    ],
    preprocessors: {
      "**/*.ts": "karma-typescript", // *.tsx for React Jsx
    },
    reporters: ["progress", "karma-typescript"],
    browsers: ["ChromeHeadless"],
    singleRun: true,
  });
};
