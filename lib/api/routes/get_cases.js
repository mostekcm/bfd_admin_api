'use strict';

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

var _googleSpreadsheet = require('google-spreadsheet');

var _googleSpreadsheet2 = _interopRequireDefault(_googleSpreadsheet);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _config = require('../../config');

var _config2 = _interopRequireDefault(_config);

var _logger = require('../../logger');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = function () {
  return {
    method: 'GET',
    path: '/api/cases',
    config: {
      auth: {
        strategies: ['jwt'],
        scope: ['read:cases']
      },
      description: 'Get all cases in the system.',
      tags: ['api'],
      validate: {
        query: {
          q: _joi2.default.string().max(1000).allow('').default(''),
          field: _joi2.default.string().max(1000).allow('').default('')
        }
      }
    },
    handler: function handler(req, reply) {
      /* Grab cases from the google sheet */
      var cases = [];

      // spreadsheet key is the long id in the sheets URL
      var doc = new _googleSpreadsheet2.default('1u_uTiO5kxHmBsbf1YbKocn18ZSzRwge9xF1ZRFEGvF0');
      var sheet;

      _async2.default.series([function ( /* setAuth */step) {
        // see notes below for authentication instructions!
        var creds = {
          client_email: (0, _config2.default)('BFD_SERVICE_ACCOUNT_EMAIL'),
          private_key: (0, _config2.default)('BFD_SERVICE_ACCOUNT_PRIVATE_KEY')
        };

        doc.useServiceAccountAuth(creds, step);
      }, function ( /* getInfoAndWorksheets */step) {
        doc.getInfo(function (err, info) {
          _logger2.default.info('Loaded doc: ' + info.title + ' by ' + info.author.email);
          sheet = info.worksheets[0];
          _logger2.default.info('sheet 1: ' + sheet.title + ' ' + sheet.rowCount + 'x' + sheet.colCount);
          step();
        });
      }, function ( /* workingWithRows */step) {
        // google provides some query options
        sheet.getRows({
          offset: 1,
          limit: 20,
          orderby: 'col2'
        }, function (err, rows) {
          _logger2.default.info('Read ' + rows.length + ' rows');

          // the row is an object with keys set by the column headers
          // rows[0].colname = 'new val';
          // rows[0].save(); // this is async
          //
          // // deleting a row
          // rows[0].del();  // this is async

          step();
        });
      }, function ( /* workingWithCells */step) {
        sheet.getCells({
          'min-row': 1,
          'max-row': 5,
          'return-empty': true
        }, function (err, cells) {
          var cell = cells[0];
          _logger2.default.info('Cell R' + cell.row + 'C' + cell.col + ' = ' + cells.value);

          // cells have a value, numericValue, and formula
          // cell.value == '1'
          // cell.numericValue == 1;
          // cell.formula == '=ROW()';
          //
          // // updating `value` is "smart" and generally handles things for you
          // cell.value = 123;
          // cell.value = '=A1+B2'
          // cell.save(); //async
          //
          // // bulk updates make it easy to update many cells at once
          // cells[0].value = 1;
          // cells[1].value = 2;
          // cells[2].formula = '=A1+B1';
          // sheet.bulkUpdateCells(cells); //async

          step();
        });
      }, function ( /* managingSheets */step) {
        // doc.addWorksheet({
        //   title: 'my new sheet'
        // }, function(err, sheet) {
        //
        //   // change a sheet's title
        //   sheet.setTitle('new title'); //async
        //
        //   //resize a sheet
        //   sheet.resize({ rowCount: 50, colCount: 20 }); //async
        //
        //   sheet.setHeaderRow(['name', 'age', 'phone']); //async
        //
        //   // removing a worksheet
        //   sheet.del(); //async
        //
        //   step();
        // });
        _logger2.default.info('Skip management of sheets for now');
        step();
      }]);

      reply(cases);
    }
  };
}; // import _ from 'lodash';