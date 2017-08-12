'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.orderTotals = exports.getCommissionInfo = exports.roundToNearestPenny = exports.displayCost = exports.testerCost = exports.lineItemCost = undefined;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _logger = require('../logger');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var lineItemCost = exports.lineItemCost = function lineItemCost(lineItem) {
  return parseFloat(lineItem.quantity) * parseFloat(lineItem.cpu) * parseFloat(lineItem.size);
};

var testerCost = exports.testerCost = function testerCost(lineItem) {
  return lineItem.tester.quantity ? parseFloat(lineItem.tester.quantity) * parseFloat(lineItem.tester.cpu) : 0;
};

var displayCost = exports.displayCost = function displayCost(displayItem) {
  return parseFloat(displayItem.quantity) * parseFloat(displayItem.cost);
};

var roundToNearestPenny = exports.roundToNearestPenny = function roundToNearestPenny(amount) {
  return typeof amount === 'number' ? Math.round(amount * 100.0) / 100.0 : amount;
};

var getPaidCommission = function getPaidCommission(commissions) {
  return commissions ? _lodash2.default.sumBy(commissions, function (c) {
    return c.paidAmount;
  }) : 0;
};

var getCommissionInfo = exports.getCommissionInfo = function getCommissionInfo(order, commissionBase) {
  /* Default is 0.15% commission */
  var commissionMultiplier = 0.15;
  /* If Jes is the sales rep, commission goes to 0 unless "On the Road" is the show, then set to 7 */
  if (order.salesRep.name === 'Jes Mostek') {
    commissionMultiplier = order.show.name === 'Reorder' ? 0.07 : 0;
  }

  var commission = commissionBase * commissionMultiplier;
  var jes = commissionBase * 0.2 - commission;

  /* Patch old orders for commission */
  if (order.commissions && order.commissions.length >= 1) {
    order.commissions.forEach(function (commissionInfo) {
      if (commissionInfo.payee === 'max' && commissionInfo.paidAmount === undefined) {
        commissionInfo.paidAmount = commission;
      }
    });
  }

  var commissionIndex = (0, _lodash2.default)(order.commissions || []).groupBy(function (commissionInfo) {
    return commissionInfo.payee;
  }).value();

  var commissionInfo = [{
    payee: 'jes',
    due: jes - getPaidCommission(commissionIndex.jes),
    paid: getPaidCommission(commissionIndex.jes),
    multiplier: 0.2 - commissionMultiplier
  }];

  if (commissionMultiplier > 0) {
    commissionInfo.push({
      payee: 'max',
      due: commission - getPaidCommission(commissionIndex.max),
      paid: getPaidCommission(commissionIndex.max),
      multiplier: commissionMultiplier
    });
  }

  commissionInfo.forEach(function (info) {
    return Object.keys(info).forEach(function (key) {
      if (info[key]) info[key] = roundToNearestPenny(info[key]);
    });
  });

  return commissionInfo;
};

var findCase = function findCase(casesIndex, productName, size) {
  return _lodash2.default.filter(casesIndex[productName], function (caseInfo) {
    return caseInfo.sku.size === size;
  })[0];
};

var findDisplay = function findDisplay(displays, name) {
  return _lodash2.default.filter(displays, function (display) {
    return display.name === name;
  })[0];
};

var lineItemWeight = function lineItemWeight(item, casesIndex) {
  var caseInfo = findCase(casesIndex, item.sku.product.name, item.sku.size);
  if (!caseInfo) {
    _logger2.default.warn('Missing weight for case for (' + item.sku.product.name + ') (' + item.sku.size + ')');
    return -1000;
  }
  var weight = caseInfo.sku.weight * item.quantity * item.size;
  if (item.tester.quantity && item.tester.quantity > 0) return weight + item.tester.quantity * caseInfo.tester.weight;
  return weight;
};

var displayWeight = function displayWeight(item, displays, casesIndex) {
  var weight = findDisplay(displays, item.name).weight * item.quantity;

  item.offsetMerch.forEach(function (offsetMerchItem) {
    var lineItemInfo = {
      sku: { product: { name: offsetMerchItem.sku.product.name }, size: offsetMerchItem.sku.size },
      quantity: parseFloat(offsetMerchItem.quantity),
      size: 1,
      tester: {}
    };
    weight += lineItemWeight(lineItemInfo, casesIndex);
  });

  return weight;
};

var orderTotals = exports.orderTotals = function orderTotals(order, casesIndex, displays) {
  var weight = 0;

  var totalItem = 0.0;
  var totalTester = 0.0;
  var totalDisplay = 0.0;

  order.lineItems.forEach(function (item) {
    totalItem += lineItemCost(item);
    totalTester += testerCost(item);
    weight += lineItemWeight(item, casesIndex);
  });

  order.displayItems.forEach(function (item) {
    totalDisplay += displayCost(item);
    weight += displayWeight(item, displays, casesIndex);
  });

  var totalProduct = totalItem + totalTester + totalDisplay;

  var shippingAndHandling = roundToNearestPenny(order.shipping || order.shipping === 0 ? parseFloat(order.shipping) + totalProduct * 0.03 : 0.0);

  var discount = order.discount ? parseFloat(order.discount) : 0.0;

  var totalPaid = 0.0;

  if (order.payments) {
    order.payments.forEach(function (payment) {
      totalPaid += parseFloat(payment.amount);
    });
  }

  var total = shippingAndHandling + totalProduct - discount;
  var totalOwed = total - totalPaid;
  var commissionBase = totalItem + totalDisplay;
  var commissionInfo = getCommissionInfo(order, commissionBase);
  var totals = {
    total: total,
    weight: weight,
    owed: totalOwed,
    item: totalItem,
    tester: totalTester,
    display: totalDisplay,
    product: totalProduct,
    totalPaid: totalPaid,
    discount: discount,
    commissionBase: commissionBase,
    commissionInfo: commissionInfo,
    shippingAndHandling: shippingAndHandling
  };

  Object.keys(totals).forEach(function (key) {
    if (key !== 'commissionInfo' && totals[key]) totals[key] = roundToNearestPenny(totals[key]);
  });

  return totals;
};