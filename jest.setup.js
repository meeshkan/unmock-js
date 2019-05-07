const mkdirp = require("mkdirp");
const rimraf = require("rimraf");
rimraf.sync(".unmock/credentials");
mkdirp(".unmock");
jest.setTimeout(30000);