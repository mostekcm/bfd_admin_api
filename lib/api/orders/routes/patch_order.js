'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _boom = require('boom');

var _boom2 = _interopRequireDefault(_boom);

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

var _patch_order = require('../schemas/patch_order');

var _patch_order2 = _interopRequireDefault(_patch_order);

var _logger = require('../../../logger');

var _logger2 = _interopRequireDefault(_logger);

var _OrderService = require('../../../service/OrderService');

var _OrderService2 = _interopRequireDefault(_OrderService);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function () {
  return {
    method: 'PATCH',
    path: '/api/orders/{id}',
    config: {
      auth: {
        strategies: ['jwt'],
        scope: ['update:orders']
      },
      description: 'Patch an order',
      tags: ['api'],
      validate: {
        params: {
          id: _joi2.default.string().guid().required()
        },
        payload: _patch_order2.default
      }
    },
    handler: function handler(req, reply) {
      var service = new _OrderService2.default();
      var newOrderAttributes = req.payload;
      _logger2.default.info('patching order: ', JSON.stringify(newOrderAttributes));
      service.patchOrder(req.params.id, newOrderAttributes).then(function (newOrder) {
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