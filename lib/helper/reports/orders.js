'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _logger = require('../../logger');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var addLineItemLabelUse = function addLineItemLabelUse(labelIndex, labelUse, lineItemInfo) {
  var productKey = lineItemInfo.productName + ',' + lineItemInfo.skuSize;

  var productLabelUses = labelUse[productKey];

  if (!productLabelUses) {
    _logger2.default.warn('Couldn\'t find label use for ' + productKey);
    return;
  }

  productLabelUses.forEach(function (productLabelUse) {
    var labelKey = productLabelUse.labelInfo.labelKey;

    if (!(labelKey in labelIndex)) labelIndex[labelKey] = {};
    var specificLabelIndex = labelIndex[labelKey];

    var varietyItem = lineItemInfo.variety.length > 0 ? ',' + lineItemInfo.variety : '';
    var location = productLabelUse.location;
    var productVarietyKey = '' + productKey + varietyItem + ',' + location;

    var pdfLink = productLabelUse.pdf;
    if (pdfLink.indexOf('|') >= 0) {
      var pdfLinks = pdfLink.split(';');
      pdfLink = '';
      pdfLinks.forEach(function (pdfLinkInstance) {
        var parts = pdfLinkInstance.split('|');
        if (parts[0] === lineItemInfo.variety) {
          pdfLink = parts[1];
        }
      });
    }

    if (!(productVarietyKey in specificLabelIndex)) {
      specificLabelIndex[productVarietyKey] = {
        labelKey: labelKey,
        labels: lineItemInfo.quantity,
        labelsPerSheet: productLabelUse.labelInfo.labelsPerSheet,
        needsPrinting: productLabelUse.needsPrinting === 'TRUE',
        pdf: pdfLink
      };
    } else {
      specificLabelIndex[productVarietyKey].labels += lineItemInfo.quantity;
    }
  });
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

exports.default = function (labelUse, orders) {
  return new _bluebird2.default(function (resolve) {
    var labelIndex = {};
    var skuIndex = {};
    var displayItemIndex = {};
    var orderInfo = [];

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
        if (!(displayItem.name in displayItemIndex)) displayItemIndex[displayItem.name] = JSON.parse(JSON.stringify(displayItem));else {
          displayItemIndex[displayItem.name].quantity = parseFloat(displayItemIndex[displayItem.name].quantity) + parseFloat(displayItem.quantity);
        }

        displayItem.offsetMerch.forEach(function (offsetMerchItem) {
          /* add offset merch to skuIndex */
          var lineItemInfo = {
            productName: offsetMerchItem.sku.product.name,
            skuSize: offsetMerchItem.sku.size,
            variety: '',
            quantity: parseFloat(offsetMerchItem.quantity)
          };

          return addLineItemToIndex(skuIndex, labelIndex, labelUse, lineItemInfo);
        });
      });

      orderInfo.push({
        date: order.date,
        targetShipDate: order.targetShipDate,
        show: order.show,
        store: order.store,
        salesRep: order.salesRep
      });
    });

    var labelTotals = [];
    var labelsToPrint = [];

    Object.keys(labelIndex).forEach(function (labelKey) {
      var totalSheets = 0;
      Object.keys(labelIndex[labelKey]).forEach(function (productKey) {
        var useInfo = labelIndex[labelKey][productKey];
        var sheets = Math.ceil(parseInt(useInfo.labels, 10) / parseInt(useInfo.labelsPerSheet, 10));
        if (useInfo.needsPrinting) {
          labelsToPrint.push({
            labelKey: labelKey,
            productKey: productKey,
            sheets: sheets,
            pdf: useInfo.pdf
          });
        }
        totalSheets += sheets;
      });

      labelTotals.push({
        labelKey: labelKey,
        sheets: totalSheets
      });
    });

    var sortedPrintLabels = _lodash2.default.sortBy(labelsToPrint, ['productKey', 'labelKey']);

    return resolve({
      orders: orderInfo,
      skus: skuIndex,
      displays: displayItemIndex,
      labelTotals: labelTotals,
      labelsToPrint: sortedPrintLabels
    });
  });
};