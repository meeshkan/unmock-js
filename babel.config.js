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
        "@babel/proposal-class-properties",
        "@babel/proposal-object-rest-spread"
    ]
}
