'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _boom = require('boom');

var _boom2 = _interopRequireDefault(_boom);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _logger = require('../../../logger');

var _logger2 = _interopRequireDefault(_logger);

var _OrderService = require('../../../service/OrderService');

var _OrderService2 = _interopRequireDefault(_OrderService);

var _DbOrderService = require('../../../service/DbOrderService');

var _DbOrderService2 = _interopRequireDefault(_DbOrderService);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function () {
  return {
    method: 'POST',
    path: '/api/move_orders_to_mongo',
    config: {
      auth: {
        strategies: ['jwt'],
        scope: ['create:orders']
      },
      description: 'Create a new order..',
      tags: ['api']
    },
    handler: function handler(req, reply) {
      var service = new _OrderService2.default();
      var dbService = new _DbOrderService2.default();
      service.getAll().then(function (orders) {
        return dbService.init().then(function () {
          var orderPromises = [];
          _lodash2.default.values(orders).forEach(function (order) {
            return orderPromises.push(dbService.addOrder(order));
          });
          return Promise.all(orderPromises).then(function () {
            return reply({ message: 'Successfully transferred ' + orderPromises.length + ' orders' });
          });
        });
      }).catch(function (e) {
        _logger2.default.error('Error transferring orders: ', e.message);
        _logger2.default.error(e.stack);
        return reply(_boom2.default.wrap(e));
      });
    }
  };
};