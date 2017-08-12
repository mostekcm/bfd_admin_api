'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _boom = require('boom');

var _boom2 = _interopRequireDefault(_boom);

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

var _logger = require('../../../logger');

var _logger2 = _interopRequireDefault(_logger);

var _DbOrderService = require('../../../service/DbOrderService');

var _DbOrderService2 = _interopRequireDefault(_DbOrderService);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function () {
  return {
    method: 'DELETE',
    path: '/api/orders/{id}',
    config: {
      auth: {
        strategies: ['jwt'],
        scope: ['delete:orders']
      },
      description: 'Get all orders in the system.',
      tags: ['api'],
      validate: {
        params: {
          id: _joi2.default.string().guid().required()
        }
      }
    },
    handler: function handler(req, reply) {
      var service = new _DbOrderService2.default();
      _logger2.default.warn('deleting order: ', req.params.id);
      service.deleteOrder(req.params.id).then(function () {
        return reply({ id: req.params.id });
      }).catch(function (e) {
        _logger2.default.error(e.message);
        _logger2.default.error(e.stackTrace);
        return reply(_boom2.default.wrap(e));
      });
    }
  };
};