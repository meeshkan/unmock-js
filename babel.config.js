module.exports = {
    "presets": [
        ["@babel/env",
        {
            targets: { node: 8 },
            modules: "cjs"
        }],
        "@babel/typescript"
    ],
    "plugins": [
        ["@babel/plugin-transform-runtime", { corejs: 3 }],
        "@babel/proposal-class-properties",
        "@babel/proposal-object-rest-spread"
    ]
}
