module.exports = {
    "presets": [
        ["@babel/env",
        {
            targets: { node: 6 },
            useBuiltIns: "usage",
            corejs: 3
        }],
        "@babel/typescript"
    ],
    // https://github.com/babel/babel/issues/8731
    ignore: [/[\/\\]core-js/, /@babel[\/\\]runtime/],
    "plugins": [
        ["@babel/plugin-transform-modules-commonjs", { allowTopLevelThis: true }],
        "@babel/plugin-transform-strict-mode",
        "@babel/proposal-class-properties",
        "@babel/proposal-object-rest-spread"
    ]
}
