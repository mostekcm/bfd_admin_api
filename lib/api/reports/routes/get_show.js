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

// import LabelService from '../../../service/LabelService';

var addLineItemLabelUse = function addLineItemLabelUse() /* labelIndex, labelUses, lineItemInfo */{
  // const productKey = `${lineItemInfo.productName},${lineItemInfo.skuSize},${lineItemInfo.variety}`;
  //
  // const labelUse = labelUses[productKey]; carlos you were here, need to store label info
  //
  // if (!(lineItemInfo)
};

var addLineItemToIndex = function addLineItemToIndex(skuIndex, labelIndex, labelUse, lineItemInfo) {
  if (!(lineItemInfo.productName in skuIndex)) skuIndex[lineItemInfo.productName] = {};
  var productIndex = skuIndex[lineItemInfo.productName];

  if (!(lineItemInfo.skuSize in productIndex)) productIndex[lineItemInfo.skuSize] = {};
  var sizeIndex = productIndex[lineItemInfo.skuSize];

  if (!(lineItemInfo.variety in sizeIndex)) {
    sizeIndex[lineItemInfo.variety] = {
      quantity: lineItemInfo.quantity,
      testerQuantity: lineItemInfo.testerQuantity ? lineItemInfo.testerQuantity : 0
    };
  } else {
    sizeIndex[lineItemInfo.variety].quantity += lineItemInfo.quantity;
    sizeIndex[lineItemInfo.variety].testerQuantity += lineItemInfo.testerQuantity ? lineItemInfo.testerQuantity : 0;
  }

  addLineItemLabelUse(labelIndex, labelUse, lineItemInfo);
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
      // const labelService = new LabelService();
      // labelService.getAll()
      //   .then(labelUse =>
      orderService.getShowOrders(req.params.name).then(function (orders) {
        var labelUse = undefined;
        var labelIndex = {};
        var skuIndex = {};
        var displayItemIndex = {};

        orders.forEach(function (order) {
          order.lineItems.forEach(function (lineItem) {
            var lineItemInfo = {
              productName: lineItem.sku.product.name,
              skuSize: lineItem.sku.size,
              variety: lineItem.sku.variety,
              quantity: Math.round(parseFloat(lineItem.quantity) * parseFloat(lineItem.size))
            };
            if (lineItem.tester.quantity) lineItemInfo.testerQuantity = parseFloat(lineItem.tester.quantity);

            /* add line item to skus */
            addLineItemToIndex(skuIndex, labelIndex, labelUse, lineItemInfo);
          });

          order.displayItems.forEach(function (displayItem) {
            /* Add display item to index */
            if (!(displayItem.product.name in displayItemIndex)) displayItemIndex[displayItem.product.name] = JSON.parse(JSON.stringify(displayItem));else {
              displayItemIndex[displayItem.product.name].quantity = parseFloat(displayItemIndex[displayItem.product.name].quantity) + parseFloat(displayItem.quantity);
            }

            /* add offset merch to skuIndex */
            var lineItemInfo = {
              productName: displayItem.offsetMerch.sku.product.name,
              skuSize: displayItem.offsetMerch.sku.size,
              variety: '',
              quantity: parseFloat(displayItem.offsetMerch.quantity)
            };

            addLineItemToIndex(skuIndex, labelIndex, labelUse, lineItemInfo);
          });
        });

        reply({
          showName: req.params.name,
          skus: skuIndex,
          displays: displayItemIndex,
          labels: labelIndex
        });
      }) // )
      .catch(function (e) {
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