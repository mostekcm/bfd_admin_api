'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _boom = require('boom');

var _boom2 = _interopRequireDefault(_boom);

var _logger = require('../../../logger');

var _logger2 = _interopRequireDefault(_logger);

var _DbOrderService = require('../../../service/DbOrderService');

var _DbOrderService2 = _interopRequireDefault(_DbOrderService);

var _WholesaleCustomerSheetService = require('../../../service/WholesaleCustomerSheetService');

var _WholesaleCustomerSheetService2 = _interopRequireDefault(_WholesaleCustomerSheetService);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function () {
  return {
    method: 'POST',
    path: '/api/crm/sync-wholesale-customer-sheet',
    config: {
      auth: {
        strategies: ['jwt'],
        scope: ['sync:crm']
      },
      description: 'Sync with the CRM sheet for wholesale customers',
      tags: ['api']
    },
    handler: function handler(req, reply) {
      var orderService = new _DbOrderService2.default();
      var wholesaleService = new _WholesaleCustomerSheetService2.default();

      orderService.getAll().then(function (orders) {
        return wholesaleService.syncFromOrders(orders);
      }).then(function (response) {
        return reply(response);
      }).catch(function (e) {
        _logger2.default.error(e.message);
        _logger2.default.error(e.message);
        _logger2.default.error(e.stack);
        return reply(_boom2.default.wrap(e));
      });
    }
  };
};