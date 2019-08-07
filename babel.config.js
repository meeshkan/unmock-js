module.exports = {
    "presets": [
        ["@babel/env", {
            "targets": {
                "node": 6,
            }
        }],
        "@babel/typescript"
    ],
    "plugins": [
        ["@babel/plugin-transform-modules-commonjs", { allowTopLevelThis: true }],
        "@babel/plugin-transform-strict-mode",
        "@babel/proposal-class-properties",
        "@babel/proposal-object-rest-spread"
    ]
}
