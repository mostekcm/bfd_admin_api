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

var _DbOrderService = require('../../../service/DbOrderService');

var _DbOrderService2 = _interopRequireDefault(_DbOrderService);

var _LabelService = require('../../../service/LabelService');

var _LabelService2 = _interopRequireDefault(_LabelService);

var _orders = require('../../../helper/reports/orders');

var _orders2 = _interopRequireDefault(_orders);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function () {
  return {
    method: 'GET',
    path: '/api/reports/show/{name}',
    config: {
      auth: {
        strategies: ['jwt'],
        scope: ['read:reports']
      },
      description: 'Get a report on a single show.',
      tags: ['api'],
      validate: {
        params: {
          name: _joi2.default.string().max(100).required()
        }
      }
    },
    handler: function handler(req, reply) {
      var orderService = new _DbOrderService2.default();
      var labelService = new _LabelService2.default();
      labelService.getAll().then(function (labelUse) {
        return orderService.getShowOrders(req.params.name).then(function (orders) {
          return (0, _orders2.default)(labelUse, orders);
        }).then(function (report) {
          return reply(_lodash2.default.merge({ showName: req.params.name }, report));
        });
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