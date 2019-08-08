module.exports = {
    "presets": [
        ["@babel/env",
        {
            targets: { node: 6 },
            useBuiltIns: "usage",
            corejs: 3,
            modules: "cjs"
        }],
        "@babel/typescript"
    ],
    "plugins": [
        "@babel/proposal-class-properties",
        "@babel/proposal-object-rest-spread"
    ]
}
