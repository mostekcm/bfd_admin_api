'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _boom = require('boom');

var _boom2 = _interopRequireDefault(_boom);

var _order = require('../schemas/order');

var _order2 = _interopRequireDefault(_order);

var _logger = require('../../../logger');

var _logger2 = _interopRequireDefault(_logger);

var _OrderService = require('../../../service/OrderService');

var _OrderService2 = _interopRequireDefault(_OrderService);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function () {
  return {
    method: 'POST',
    path: '/api/orders/',
    config: {
      auth: {
        strategies: ['jwt'],
        scope: ['create:orders']
      },
      description: 'Get all orders in the system.',
      tags: ['api'],
      validate: {
        payload: _order2.default
      }
    },
    handler: function handler(req, reply) {
      var service = new _OrderService2.default();
      var order = req.payload;
      _logger2.default.info('adding new order: ', JSON.stringify(order));
      service.addOrder(order).then(function (newOrder) {
        return reply(newOrder);
      }).catch(function (e) {
        _logger2.default.error(e.message);
        _logger2.default.error(e.stackTrace);
        return reply(_boom2.default.wrap(e));
      });
    }
  };
};