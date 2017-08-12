'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

var _logger = require('../../../logger');

var _logger2 = _interopRequireDefault(_logger);

var _DbOrderService = require('../../../service/DbOrderService');

var _DbOrderService2 = _interopRequireDefault(_DbOrderService);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function () {
  return {
    method: 'GET',
    path: '/api/orders/{id}',
    config: {
      auth: {
        strategies: ['jwt'],
        scope: ['read:orders']
      },
      description: 'Get a single order based on its unique identifier.',
      tags: ['api'],
      validate: {
        params: {
          id: _joi2.default.string().guid().required()
        }
      }
    },
    handler: function handler(req, reply) {
      var orderService = new _DbOrderService2.default();
      orderService.getOrder(req.params.id).then(function (order) {
        return reply(order);
      }).catch(function (e) {
        if (e.message) {
          _logger2.default.error('Error trying to get order data: ', e.message);
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