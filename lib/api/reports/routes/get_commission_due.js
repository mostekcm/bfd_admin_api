'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _logger = require('../../../logger');

var _logger2 = _interopRequireDefault(_logger);

var _OrderService = require('../../../service/OrderService');

var _OrderService2 = _interopRequireDefault(_OrderService);

var _order = require('../../../helper/order');

var orderHelper = _interopRequireWildcard(_order);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function () {
  return {
    method: 'GET',
    path: '/api/reports/commission/due',
    config: {
      auth: {
        strategies: ['jwt'],
        scope: ['read:reports']
      },
      description: 'Get a report on what commission is due.',
      tags: ['api'],
      validate: {}
    },
    handler: function handler(req, reply) {
      var orderService = new _OrderService2.default();
      orderService.getPendingCommissionOrders().then(function (orders) {
        var orderMap = {};
        orders.forEach(function (order) {
          var orderTotals = orderHelper.orderTotals(order);
          if (!(order.salesRep.name in orderMap)) orderMap[order.salesRep.name] = { totalCommissionBase: 0.0, totalCommissionDue: 0.0, orders: [] };
          var thisOrderInfo = orderMap[order.salesRep.name];
          thisOrderInfo.totalCommissionBase += orderTotals.commissionBase;
          thisOrderInfo.totalCommissionDue += orderTotals.commissionDue;

          thisOrderInfo.orders.push({
            totals: orderTotals,
            show: order.show,
            date: order.date,
            finalPayment: _lodash2.default.maxBy(order.payments, function (o) {
              return o.date;
            }),
            store: order.store
          });
        });

        var orderInfo = [];
        Object.keys(orderMap).forEach(function (key) {
          return orderInfo.push(_lodash2.default.merge({ salesRep: { name: key } }, orderMap[key]));
        });
        reply(orderInfo);
      }).catch(function (e) {
        if (e.message) {
          _logger2.default.error('Error trying to get commission report data: ', e.message);
          _logger2.default.error(e.stack);
        } else {
          _logger2.default.error(e);
        }

        return reply({
          statusCode: 500,
          error: 'Internal Configuration Error',
          message: e.message ? e.message : e
        });
      });
    }
  };
};