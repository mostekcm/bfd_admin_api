/**
 * Created by mostekcm on 11/2/16.
 */

var path = require('path');
require('babel-register');

require(path.join(path.join(__dirname, 'src'), 'index')); // eslint-disable-line import/no-dynamic-require
