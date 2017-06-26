'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _sheetTools = require('./sheetTools');

var getOffsetMerch = function getOffsetMerch(productName, skuSize, skuMsrp, quantity) {
  return Object({
    sku: {
      product: {
        name: productName
      },
      size: skuSize,
      msrp: skuMsrp
    },
    quantity: quantity
  });
};

var getOffsetMerchFromRow = function getOffsetMerchFromRow(productNameInput, skuSizeInput, skuMsrpInput, quantityInput) {
  var offsetMerch = [];

  var productName = (0, _sheetTools.getPossibleJsonValue)(productNameInput);
  var skuSize = (0, _sheetTools.getPossibleJsonValue)(skuSizeInput);
  var skuMsrp = (0, _sheetTools.getPossibleJsonValue)(skuMsrpInput);
  var quantity = (0, _sheetTools.getPossibleJsonValue)(quantityInput);

  if (Array.isArray(productName)) {
    var i = 0;
    for (; i < productName.length; i += 1) {
      offsetMerch.push(getOffsetMerch(productName[i], skuSize[i], skuMsrp[i], quantity[i]));
    }
  } else if (productName) {
    offsetMerch.push(getOffsetMerch(productName, skuSize, skuMsrp, quantity));
  }

  return offsetMerch;
};

exports.default = getOffsetMerchFromRow;