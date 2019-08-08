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
    "plugins": [
        ["@babel/plugin-transform-modules-commonjs", { allowTopLevelThis: true, strict: true }],
        "@babel/proposal-class-properties",
        "@babel/proposal-object-rest-spread"
    ]
}
