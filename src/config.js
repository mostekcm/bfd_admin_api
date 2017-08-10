/*
 config.js just simplifies and encapsulates the access to
 */

// Initialize process.env to have anything stored in .env
import * as dotenv from 'dotenv';
import path from 'path';

var nconf = require('nconf');

/* Make sure you process dotenv before nconf! */
dotenv.config();
const configFile = path.resolve(path.join(__dirname, '../BFDServiceAccount.json'));
nconf
  .env()
  .file('BFD_SERVICE_ACCOUNT', configFile)
  .defaults({
    PORT: 3002,
    NODE_ENV: 'dev',
    BFD_LOG_LEVEL: 'info'
  });

export default function(key) {
  return nconf.get(key);
}
