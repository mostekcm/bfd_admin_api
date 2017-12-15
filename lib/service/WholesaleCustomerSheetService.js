'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _googleSpreadsheet = require('google-spreadsheet');

var _googleSpreadsheet2 = _interopRequireDefault(_googleSpreadsheet);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _promiseThrottle = require('promise-throttle');

var _promiseThrottle2 = _interopRequireDefault(_promiseThrottle);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _config = require('../config');

var _config2 = _interopRequireDefault(_config);

var _logger = require('../logger');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var WholesaleCustomerSheetService = function () {
  function WholesaleCustomerSheetService() {
    _classCallCheck(this, WholesaleCustomerSheetService);

    /* Grab orders from the google sheet */
    // TODO: Do caching for this
    // TODO: Move this to a provider pattern
    // spreadsheet key is the long id in the sheets URL
    this.doc = new _googleSpreadsheet2.default((0, _config2.default)('WHOLESALE_CUSTOMER_SHEET'));
    this.useServiceAccountAuth = _bluebird2.default.promisify(this.doc.useServiceAccountAuth, { context: this.doc });
    this.getInfoFromDoc = _bluebird2.default.promisify(this.doc.getInfo, { context: this.doc });
    this.info = null;
    this.authenticated = false;
  }

  _createClass(WholesaleCustomerSheetService, [{
    key: 'authenticate',
    value: function authenticate() {
      if (this.authenticated) return new _bluebird2.default(function (resolve) {
        return resolve();
      });

      var me = this;
      var precreds = (0, _config2.default)('BFD_SERVICE_ACCOUNT_CREDS');
      var creds = JSON.parse(precreds);
      return this.useServiceAccountAuth(creds).then(function () {
        me.authenticated = true;
        return true;
      });
    }
  }, {
    key: 'getInfo',
    value: function getInfo() {
      var _this = this;

      var me = this;
      if (this.info !== null) return new _bluebird2.default(function (resolve) {
        return resolve(_this.info);
      });
      return this.authenticate().then(function () {
        return me.getInfoFromDoc();
      });
    }
  }, {
    key: 'syncFromOrders',
    value: function syncFromOrders(orders) {
      var _this2 = this;

      return this.getInfo().then(function (info) {
        _logger2.default.debug('Loaded Info for Wholesale Customer Workbook');

        // first find the write worksheet
        var existingCustomerSheet = _lodash2.default.find(info.worksheets, function (worksheet) {
          return worksheet.title === 'Customers';
        });

        if (!existingCustomerSheet) return _bluebird2.default.reject(new Error('Could not find the customers sheet: ' + info.worksheets.length()));

        var orderByStoreName = _lodash2.default.groupBy(orders, function (order) {
          return order.store.name;
        });

        var getRows = _bluebird2.default.promisify(existingCustomerSheet.getRows, { context: existingCustomerSheet });

        var stats = {
          updated: 0,
          new: 0,
          zeroOrders: 0,
          totalStores: 0,
          skipped: 0
        };

        var promiseThrottle = new _promiseThrottle2.default({
          requestsPerSecond: 5, // per second
          promiseImplementation: _bluebird2.default
        });

        return getRows().then(function (rows) {
          var promises = [];
          stats.totalStores = rows.length;
          rows.forEach(function (row) {
            var crmOrderRows = _lodash2.default.cloneDeep(orderByStoreName[row.storename]);
            if (!crmOrderRows) {
              _logger2.default.info('Missing store from orders: ' + row.storename);
              stats.zeroOrders += 1;
              return;
            }

            delete orderByStoreName[row.storename];

            var checkRowsWrapper = function checkRowsWrapper() {
              return WholesaleCustomerSheetService.checkRows(row, crmOrderRows).then(function (updated) {
                stats.updated += updated ? 1 : 0;
                return stats;
              });
            };

            promises.push(promiseThrottle.add(checkRowsWrapper.bind(_this2)));
          });

          Object.keys(orderByStoreName).forEach(function (storeName) {
            var crmStoreInfoRows = _lodash2.default.cloneDeep(orderByStoreName[storeName]);
            var crmStoreInfo = crmStoreInfoRows[0];
            crmStoreInfo.totalRev = _lodash2.default.sumBy(crmStoreInfoRows, 'totals.total');
            var maxDate = _lodash2.default.maxBy(crmStoreInfoRows, 'date');
            var maxShippedDate = _lodash2.default.maxBy(crmStoreInfoRows, 'shippedDate');
            crmStoreInfo.mostRecentOrderDate = maxDate && _moment2.default.unix(maxDate.date).format('L') || '';
            crmStoreInfo.mostRecentShipment = maxShippedDate && _moment2.default.unix(maxShippedDate.shippedDate).format('L') || '';

            var newCrmOrderRow = {
              storename: storeName,
              contactname: _lodash2.default.get(crmStoreInfo, 'store.contact'),
              storeemail: _lodash2.default.get(crmStoreInfo, 'store.email'),
              storephone: _lodash2.default.get(crmStoreInfo, 'store.phone'),
              storeaddress: _lodash2.default.get(crmStoreInfo, 'store.shippingAddress'),
              numorders: _lodash2.default.get(crmStoreInfo, 'numOrders'),
              totalrev: _lodash2.default.get(crmStoreInfo, 'totalRev'),
              mostrecentorder: _lodash2.default.get(crmStoreInfo, 'mostRecentOrderDate'),
              mostrecentshipment: _lodash2.default.get(crmStoreInfo, 'mostRecentShipment')
            };

            var addRow = _bluebird2.default.promisify(existingCustomerSheet.addRow, { context: existingCustomerSheet });

            var addRowWrapper = function addRowWrapper() {
              if (crmStoreInfo.pendingApproval) {
                _logger2.default.info('Skipping pending store: ', newCrmOrderRow.storename);
                stats.skipped += 1;
                return _bluebird2.default.resolve(stats);
              }
              return addRow(newCrmOrderRow).then(function () {
                _logger2.default.info('new row: ', newCrmOrderRow);
                stats.new += 1;
                return stats;
              });
            };

            promises.push(promiseThrottle.add(addRowWrapper.bind(_this2)));
          });

          return _bluebird2.default.all(promises).then(function () {
            return _logger2.default.info('Sync Stats: ', stats);
          }).then(function () {
            return stats;
          });
        });
      });
    }
  }], [{
    key: 'isValueChanged',
    value: function isValueChanged(row, crmStoreInfo, column, attr) {
      var value = _lodash2.default.get(crmStoreInfo, attr);
      if (column === 'mostrecentorder') _logger2.default.debug('carlos: bad value: ', value);
      if (row[column] !== value) {
        _logger2.default.info('Changing ' + column + ' (' + row[column] + ') to ' + attr + ' (' + value + ')');
        row[column] = value;
        return true;
      }

      return false;
    }
  }, {
    key: 'checkRows',
    value: function checkRows(row, crmStoreInfoRows) {
      var valueChanged = false;

      var crmStoreInfo = crmStoreInfoRows[0];
      crmStoreInfo.totalRev = _lodash2.default.sumBy(crmStoreInfoRows, 'totals.total');
      crmStoreInfo.numOrders = crmStoreInfoRows.length;
      var maxDate = _lodash2.default.maxBy(crmStoreInfoRows, 'date');
      var maxShippedDate = _lodash2.default.maxBy(crmStoreInfoRows, 'shippedDate');
      crmStoreInfo.mostRecentOrderDate = maxDate && _moment2.default.unix(maxDate.date).format('L') || '';
      crmStoreInfo.mostRecentShipment = maxShippedDate && _moment2.default.unix(maxShippedDate.shippedDate).format('L') || '';

      valueChanged = WholesaleCustomerSheetService.isValueChanged(row, crmStoreInfo, 'contactname', 'store.contact') || valueChanged;
      valueChanged = WholesaleCustomerSheetService.isValueChanged(row, crmStoreInfo, 'storeemail', 'store.email') || valueChanged;
      valueChanged = WholesaleCustomerSheetService.isValueChanged(row, crmStoreInfo, 'storephone', 'store.phone') || valueChanged;
      valueChanged = WholesaleCustomerSheetService.isValueChanged(row, crmStoreInfo, 'storeaddress', 'store.shippingAddress') || valueChanged;
      valueChanged = WholesaleCustomerSheetService.isValueChanged(row, crmStoreInfo, 'numorders', 'numOrders') || valueChanged;
      valueChanged = WholesaleCustomerSheetService.isValueChanged(row, crmStoreInfo, 'totalrev', 'totalRev') || valueChanged;
      valueChanged = WholesaleCustomerSheetService.isValueChanged(row, crmStoreInfo, 'mostrecentorder', 'mostRecentOrderDate') || valueChanged;
      valueChanged = WholesaleCustomerSheetService.isValueChanged(row, crmStoreInfo, 'mostrecentshipment', 'mostRecentShipment') || valueChanged;

      var save = _bluebird2.default.promisify(row.save, { context: row });

      if (valueChanged) return save().then(function () {
        return true;
      });

      return _bluebird2.default.resolve(false);
    }
  }]);

  return WholesaleCustomerSheetService;
}();

exports.default = WholesaleCustomerSheetService;