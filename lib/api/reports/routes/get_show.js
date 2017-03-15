'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

var _logger = require('../../../logger');

var _logger2 = _interopRequireDefault(_logger);

var _OrderService = require('../../../service/OrderService');

var _OrderService2 = _interopRequireDefault(_OrderService);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var addLineItemToIndex = function addLineItemToIndex(skuIndex, productName, skuSize, variety, quantity, testerQuantity) {
  if (!(productName in skuIndex)) skuIndex[productName] = {};
  var productIndex = skuIndex[productName];

  if (!(skuSize in productIndex)) productIndex[skuSize] = {};
  var sizeIndex = productIndex[skuSize];

  if (!(variety in sizeIndex)) {
    sizeIndex[variety] = {
      quantity: parseFloat(quantity),
      testerQuantity: testerQuantity ? parseFloat(testerQuantity) : 0
    };
  } else {
    sizeIndex[variety].quantity += parseFloat(quantity);
    sizeIndex[variety].testerQuantity += testerQuantity ? parseFloat(testerQuantity) : 0;
  }
};

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
      var orderService = new _OrderService2.default();
      orderService.getShowOrders(req.params.name).then(function (orders) {
        var skuIndex = {};
        var displayItemIndex = {};

        orders.forEach(function (order) {
          order.lineItems.forEach(function (lineItem) {
            /* add line item to skus */
            addLineItemToIndex(skuIndex, lineItem.sku.product.name, lineItem.sku.size, lineItem.sku.variety, lineItem.quantity, lineItem.tester.quantity);
          });

          order.displayItems.forEach(function (displayItem) {
            /* Add display item to index */
            if (!(displayItem.product.name in displayItemIndex)) displayItemIndex[displayItem.product.name] = JSON.parse(JSON.stringify(displayItem));else {
              displayItemIndex[displayItem.product.name].quantity = parseFloat(displayItemIndex[displayItem.product.name].quantity) + parseFloat(displayItem.quantity);
            }

            /* add offset merch to skuIndex */
            addLineItemToIndex(skuIndex, displayItem.offsetMerch.sku.product.name, displayItem.offsetMerch.sku.size, '', displayItem.offsetMerch.quantity, 0);
          });
        });

        reply({
          showName: req.params.name,
          skus: skuIndex,
          displays: displayItemIndex
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