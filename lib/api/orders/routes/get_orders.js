'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

var _logger = require('../../../logger');

var _logger2 = _interopRequireDefault(_logger);

var _OrderService = require('../../../service/OrderService');

var _OrderService2 = _interopRequireDefault(_OrderService);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function () {
  return {
    method: 'GET',
    path: '/api/orders',
    config: {
      auth: {
        strategies: ['jwt'],
        scope: ['read:orders']
      },
      description: 'Get all orders in the system.',
      tags: ['api'],
      validate: {
        query: {
          search: _joi2.default.string().max(1000).allow('').default(''),
          page: _joi2.default.number().integer().min(0).max(1000)
        }
      }
    },
    handler: function handler(req, reply) {
      _logger2.default.debug('Getting orders');
      var orderService = new _OrderService2.default();
      orderService.getAllNotCancelled().then(function (orders) {
        return reply(_lodash2.default.values(orders));
      }).catch(function (e) {
        if (e.message) {
          _logger2.default.error('Error trying to get orders data: ', e.message);
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