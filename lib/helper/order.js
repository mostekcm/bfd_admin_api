"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var lineItemCost = exports.lineItemCost = function lineItemCost(lineItem) {
  return parseFloat(lineItem.quantity) * parseFloat(lineItem.cpu) * parseFloat(lineItem.size);
};

var testerCost = exports.testerCost = function testerCost(lineItem) {
  return lineItem.tester.quantity ? parseFloat(lineItem.tester.quantity) * parseFloat(lineItem.tester.cpu) : 0;
};

var displayCost = exports.displayCost = function displayCost(displayItem) {
  return parseFloat(displayItem.quantity) * parseFloat(displayItem.cost);
};

var roundToNearestPenny = function roundToNearestPenny(amount) {
  return Math.round(amount * 100.0) / 100.0;
};

var orderTotals = exports.orderTotals = function orderTotals(order) {
  var totalItem = 0.0;
  var totalTester = 0.0;
  var totalDisplay = 0.0;

  order.lineItems.forEach(function (item) {
    totalItem += lineItemCost(item);
    totalTester += testerCost(item);
  });

  order.displayItems.forEach(function (item) {
    totalDisplay += displayCost(item);
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
  var commissionDue = commissionBase * 0.15;
  return {
    total: total,
    owed: totalOwed,
    item: totalItem,
    tester: totalTester,
    display: totalDisplay,
    product: totalProduct,
    totalPaid: totalPaid,
    discount: discount,
    commissionBase: commissionBase,
    commissionDue: commissionDue,
    shippingAndHandling: shippingAndHandling
  };
};