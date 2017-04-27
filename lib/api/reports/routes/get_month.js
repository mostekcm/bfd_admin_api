'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _logger = require('../../../logger');

var _logger2 = _interopRequireDefault(_logger);

var _OrderService = require('../../../service/OrderService');

var _OrderService2 = _interopRequireDefault(_OrderService);

var _LabelService = require('../../../service/LabelService');

var _LabelService2 = _interopRequireDefault(_LabelService);

var _orders = require('../../../helper/reports/orders');

var _orders2 = _interopRequireDefault(_orders);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function () {
  return {
    method: 'GET',
    path: '/api/reports/month/{month}',
    config: {
      auth: {
        strategies: ['jwt'],
        scope: ['read:reports']
      },
      description: 'Get a report on all orders targeted for a month.',
      tags: ['api'],
      validate: {
        params: {
          month: _joi2.default.number().min(1).max(12).required(),
          year: _joi2.default.number().min(2016).max(3000)
        }
      }
    },
    handler: function handler(req, reply) {
      var labelService = new _LabelService2.default();
      var orderService = new _OrderService2.default();

      var year = req.params.year || parseInt((0, _moment2.default)().format('YYYY'), 10);

      labelService.getAll().then(function (labelUse) {
        return orderService.getMonthOrders(req.params.month, year).then(function (orders) {
          return (0, _orders2.default)(labelUse, orders);
        }).then(function (report) {
          return reply(_lodash2.default.merge({ month: req.params.month + '/' + year }, report));
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