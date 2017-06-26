'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _boom = require('boom');

var _boom2 = _interopRequireDefault(_boom);

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

var _order = require('../schemas/order');

var _order2 = _interopRequireDefault(_order);

var _logger = require('../../../logger');

var _logger2 = _interopRequireDefault(_logger);

var _OrderService = require('../../../service/OrderService');

var _OrderService2 = _interopRequireDefault(_OrderService);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function () {
  return {
    method: 'PUT',
    path: '/api/orders/{id}',
    config: {
      auth: {
        strategies: ['jwt'],
        scope: ['update:orders']
      },
      description: 'Update the entire order',
      tags: ['api'],
      validate: {
        params: {
          id: _joi2.default.string().guid().required()
        },
        payload: _order2.default
      }
    },
    handler: function handler(req, reply) {
      var service = new _OrderService2.default();
      var newOrderAttributes = req.payload;
      _logger2.default.info('updating entire order: ', JSON.stringify(newOrderAttributes));
      service.putOrder(req.params.id, newOrderAttributes).then(function (newOrder) {
        return reply(newOrder);
      }).catch(function (e) {
        _logger2.default.error(e.message);
        _logger2.default.error(e.message);
        _logger2.default.error(e.stack);
        return reply(_boom2.default.wrap(e));
      });
    }
  };
};