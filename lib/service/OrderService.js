'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _sprintfJs = require('sprintf-js');

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _googleSpreadsheet = require('google-spreadsheet');

var _googleSpreadsheet2 = _interopRequireDefault(_googleSpreadsheet);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _config = require('../config');

var _config2 = _interopRequireDefault(_config);

var _logger = require('../logger');

var _logger2 = _interopRequireDefault(_logger);

var _OrderRepository = require('../models/OrderRepository');

var _OrderRepository2 = _interopRequireDefault(_OrderRepository);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var OrderService = function () {
  function OrderService() {
    _classCallCheck(this, OrderService);

    /* Grab orders from the google sheet */
    // TODO: Do caching for this
    // TODO: Move this to a provider pattern
    // spreadsheet key is the long id in the sheets URL
    this.doc = new _googleSpreadsheet2.default('119bM1NZrl61IBfBfQfQcjIYgsh1JL8LDzY11C2IwmRA');
    this.useServiceAccountAuth = _bluebird2.default.promisify(this.doc.useServiceAccountAuth, { context: this.doc });
    this.getInfoFromDoc = _bluebird2.default.promisify(this.doc.getInfo, { context: this.doc });
    this.addWorksheetToDoc = _bluebird2.default.promisify(this.doc.addWorksheet, { context: this.doc });
    this.orderRepo = null;
    this.info = null;
    this.authenticated = false;
  }

  _createClass(OrderService, [{
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
    key: 'getOrderRepo',
    value: function getOrderRepo() {
      var _this2 = this;

      if (this.orderRepo !== null) return new _bluebird2.default(function (resolve) {
        return resolve(_this2.orderRepo);
      });
      return this.getInfo().then(function (info) {
        _logger2.default.debug('Loaded Info for Order Workbook');

        return _OrderRepository2.default.createFromSheets(info.worksheets).then(function (repo) {
          _this2.orderRepo = repo;
          return repo;
        });
      });
    }
  }, {
    key: 'addOrder',
    value: function addOrder(order) {
      /* Add a new sheet */
      order.id = _uuid2.default.v4();
      var me = this;
      return this.authenticate().then(function () {
        return me.addWorksheetToDoc({
          title: order.id,
          colCount: 50
        }).then(function (sheet) {
          return me.getOrderRepo().then(function (repo) {
            return repo.addOrderToSheet(order, sheet);
          });
        });
      });
    }
  }, {
    key: 'patchOrder',
    value: function patchOrder(orderId, newOrderAttributes) {
      return this.getOrderRepo().then(function (repo) {
        return repo.patchOrder(orderId, newOrderAttributes);
      });
    }
  }, {
    key: 'deleteOrder',
    value: function deleteOrder(orderId) {
      return this.getOrderRepo().then(function (repo) {
        return repo.deleteOrder(orderId);
      });
    }
  }, {
    key: 'getOrder',
    value: function getOrder(id) {
      return this.getOrderRepo().then(function (repo) {
        return repo.get(id);
      });
    }
  }, {
    key: 'getShowOrders',
    value: function getShowOrders(name) {
      return this.getOrderRepo().then(function (repo) {
        var orders = repo.getAll();

        return _lodash2.default.filter(orders, function (order) {
          return order.show.name === name;
        });
      });
    }
  }, {
    key: 'getMonthOrders',
    value: function getMonthOrders(month, year) {
      return this.getOrderRepo().then(function (repo) {
        var formattedMonth = (0, _sprintfJs.sprintf)('%02d', month);
        var orders = repo.getAll();
        var startDate = (0, _moment2.default)(year + '-' + formattedMonth + '-01T00:00:00Z');
        var startTime = startDate.unix();
        var endTime = (0, _moment2.default)(startDate).add(1, 'M').unix();

        return _lodash2.default.filter(orders, function (order) {
          return order.targetShipDate && order.targetShipDate >= startTime && order.targetShipDate < endTime;
        });
      });
    }
  }, {
    key: 'getPendingCommissionOrders',
    value: function getPendingCommissionOrders() {
      return this.getOrderRepo().then(function (repo) {
        var orders = repo.getAll();

        return _lodash2.default.filter(orders, function (order) {
          return !order.commissionPaidDate && order.payments.length > 0 && order.salesRep.name !== 'Jes Mostek';
        });
      });
    }
  }, {
    key: 'getAll',
    value: function getAll() {
      return this.getOrderRepo().then(function (repo) {
        return repo.getAll();
      });
    }
  }]);

  return OrderService;
}();

exports.default = OrderService;