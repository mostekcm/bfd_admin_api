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

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _mongodb = require('mongodb');

var _mongodb2 = _interopRequireDefault(_mongodb);

var _monquery = require('monquery');

var _monquery2 = _interopRequireDefault(_monquery);

var _logger = require('../logger');

var _logger2 = _interopRequireDefault(_logger);

var _config = require('../config');

var _config2 = _interopRequireDefault(_config);

var _order = require('../helper/order');

var orderHelper = _interopRequireWildcard(_order);

var _CaseService = require('./CaseService');

var _CaseService2 = _interopRequireDefault(_CaseService);

var _DisplayService = require('./DisplayService');

var _DisplayService2 = _interopRequireDefault(_DisplayService);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var DbOrderService = function () {
  function DbOrderService() {
    _classCallCheck(this, DbOrderService);

    // TODO: Do caching for this
    // TODO: Move this to a provider pattern
    this.db = null;
    this.casesIndex = null;
    this.displays = null;
  }

  _createClass(DbOrderService, [{
    key: 'getDb',
    value: function getDb() {
      if (this.db !== null) {
        _logger2.default.debug('Using cached db');
        return _bluebird2.default.resolve(this.db);
      }

      var caseService = new _CaseService2.default();
      var displayService = new _DisplayService2.default();

      var me = this;

      return caseService.getAll().then(function (cases) {
        return displayService.getAll().then(function (displays) {
          me.displays = displays;
          me.casesIndex = (0, _lodash2.default)(cases).groupBy(function (caseInfo) {
            return caseInfo.sku.product.name;
          }).value();
          return _mongodb2.default.MongoClient.connect((0, _config2.default)('MONGO_URI')).then(function (db) {
            me.db = db;
            return db;
          });
        });
      });
    }
  }, {
    key: 'init',
    value: function init() {
      return this.getDb().then(function () {
        return true;
      });
    }
  }, {
    key: 'getOrdersCollection',
    value: function getOrdersCollection() {
      return this.getDb().then(function (db) {
        return db.collection('orders');
      });
    }
  }, {
    key: 'getInvoiceNumber',
    value: function getInvoiceNumber(order) {
      if (order.invoiceNumber) return _bluebird2.default.resolve(order.invoiceNumber);

      return this.getDb().then(function (db) {
        return db.collection('counters').findOneAndUpdate({ _id: 'invoiceNumber' }, { $inc: { seq: 1 } }).then(function (invoiceNumber) {
          return invoiceNumber.value.seq;
        }).then(function (invoiceSeq) {
          return (0, _sprintfJs.sprintf)('BFD%08d', parseInt(invoiceSeq, 10));
        });
      });
    }
  }, {
    key: 'addOrder',
    value: function addOrder(order) {
      var _this = this;

      /* Add a new sheet */
      return this.getOrdersCollection().then(function (orders) {
        return _this.getInvoiceNumber(order).then(function (invoiceNumber) {
          /* Set some default values for the order */
          order.date = order.date || (0, _moment2.default)().unix();
          var defaultTargetDate = _moment2.default.unix(order.date).add(14, 'days').unix();
          order.id = _uuid2.default.v4();
          order.invoiceNumber = invoiceNumber;
          order.dueDate = order.dueDate || defaultTargetDate;
          order.targetShipDate = order.targetShipDate || defaultTargetDate;

          return orders.insertOne(order).then(function () {
            order.totals = orderHelper.orderTotals(order, _this.casesIndex, _this.displays);
            _logger2.default.debug('inserted new order: ' + JSON.stringify(order));
            return order;
          });
        });
      });
    }
  }, {
    key: 'patchOrder',
    value: function patchOrder(id, newOrderAttributes) {
      return this.getOrdersCollection().then(function (orders) {
        return orders.updateOne({ id: id }, { $set: newOrderAttributes });
      });
    }
  }, {
    key: 'deleteOrder',
    value: function deleteOrder(id) {
      return this.getOrdersCollection().then(function (orders) {
        return orders.removeOne({ id: id });
      });
    }
  }, {
    key: 'getOrder',
    value: function getOrder(id) {
      var _this2 = this;

      return this.getOrdersCollection().then(function (orders) {
        return orders.findOne({ id: id });
      }).then(function (order) {
        order.totals = orderHelper.orderTotals(order, _this2.casesIndex, _this2.displays);
        return order;
      });
    }
  }, {
    key: 'getShowOrders',
    value: function getShowOrders(name) {
      return this.getAllNotCancelled({ 'show.name': name });
    }
  }, {
    key: 'getNextMonthOrders',
    value: function getNextMonthOrders() {
      var endTime = (0, _moment2.default)().add(1, 'M').unix();
      return this.getAllNotCancelled({
        targetShipDate: { $exists: true, $lt: endTime },
        shippedDate: { $exists: false }
      });
    }
  }, {
    key: 'getMonthOrders',
    value: function getMonthOrders(month, year) {
      var formattedMonth = (0, _sprintfJs.sprintf)('%02d', month);
      var startDate = (0, _moment2.default)(year + '-' + formattedMonth + '-01T00:00:00Z');
      var startTime = startDate.unix();
      var endTime = (0, _moment2.default)(startDate).add(1, 'M').unix();

      return this.getAllNotCancelled({
        targetShipDate: { $exists: true, $gte: startTime, $lt: endTime },
        shippedDate: { $exists: false }
      });
    }
  }, {
    key: 'getPendingCommissionOrders',
    value: function getPendingCommissionOrders() {
      return this.getAllNotCancelled({
        $nor: [{ payments: { $exists: false } }, { payments: { $size: 0 } }],
        commissions: {
          $not: {
            $size: 2
          }
        }
      });
    }
  }, {
    key: 'getAllNotCancelled',
    value: function getAllNotCancelled(query) {
      var notCancelledQuery = { cancelled: { $not: { $exists: true, $nin: ['', null] } } };
      var mongoQuery = DbOrderService.getMongoQuery(query);
      var finalQuery = mongoQuery ? { $and: [mongoQuery, notCancelledQuery] } : notCancelledQuery;
      return this.getAll(finalQuery);
    }
  }, {
    key: 'getAll',
    value: function getAll(query) {
      var _this3 = this;

      return this.getOrdersCollection().then(function (orders) {
        return orders.find(DbOrderService.getMongoQuery(query)).toArray();
      }).then(function (orderObjects) {
        orderObjects.forEach(function (order) {
          order.totals = orderHelper.orderTotals(order, _this3.casesIndex, _this3.displays);
          return order;
        });
        return orderObjects;
      });
    }
  }], [{
    key: 'getMongoQuery',
    value: function getMongoQuery(query) {
      return _lodash2.default.isString(query) && query.length > 0 ? (0, _monquery2.default)(query) : query;
    }
  }]);

  return DbOrderService;
}();

exports.default = DbOrderService;