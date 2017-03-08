'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (key) {
  return nconf.get(key);
};

var _dotenv = require('dotenv');

var dotenv = _interopRequireWildcard(_dotenv);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

/*
 config.js just simplifies and encapsulates the access to
 */

// Initialize process.env to have anything stored in .env
var nconf = require('nconf');

/* Make sure you process dotenv before nconf! */
dotenv.config();
var configFile = _path2.default.resolve(_path2.default.join(__dirname, '../BFDServiceAccount.json'));
console.log('Carlos: ', configFile);
nconf.env().file('BFD_SERVICE_ACCOUNT', configFile).defaults({
  PORT: 3002,
  NODE_ENV: 'dev',
  BFD_LOG_LEVEL: 'info'
});