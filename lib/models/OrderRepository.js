'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _boom = require('boom');

var _boom2 = _interopRequireDefault(_boom);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _sprintfJs = require('sprintf-js');

var _order = require('../helper/order');

var orderHelper = _interopRequireWildcard(_order);

var _displayItem = require('../helper/displayItem');

var _displayItem2 = _interopRequireDefault(_displayItem);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * This takes in a google sheet and converts it into an SKU object
 */
var OrderRepository = function () {
  /* This class is for containing all of the cases and providing search functions for it. */
  function OrderRepository(orders, sheets) {
    _classCallCheck(this, OrderRepository);

    this.orders = orders;
    this.sheets = sheets;
  }

  /**
   * Remove an order from the repository.  Assume that it has already been deleted from the workbook
   * @param orderId
   */


  _createClass(OrderRepository, [{
    key: 'deleteOrder',
    value: function deleteOrder(orderId) {
      var _this = this;

      if (this.orders[orderId]) {
        var sheet = this.sheets[orderId];
        var deleteSheet = _bluebird2.default.promisify(sheet.del, { context: sheet });
        return deleteSheet().then(function () {
          delete _this.sheets[orderId];
          delete _this.orders[orderId];
          return orderId;
        });
      }

      return new _bluebird2.default(function (resolve, reject) {
        return reject(_boom2.default.notFound());
      });
    }
  }, {
    key: 'updateOrder',
    value: function updateOrder(orderId, newOrder) {
      var _this2 = this;

      if (this.orders[orderId]) {
        var sheet = this.sheets[orderId];

        var clearSheet = _bluebird2.default.promisify(sheet.clear, { context: sheet });

        return clearSheet().then(function () {
          return _this2.addOrderToSheet(newOrder, sheet);
        });
      }

      return new _bluebird2.default(function (resolve, reject) {
        return reject(_boom2.default.notFound());
      });
    }
  }, {
    key: 'patchOrder',
    value: function patchOrder(orderId, newOrderAttributes) {
      if (this.orders[orderId]) {
        var newOrder = _lodash2.default.assign(this.orders[orderId], newOrderAttributes);

        console.log('Carlos new order: ', newOrder);

        return this.updateOrder(orderId, newOrder);
      }

      return new _bluebird2.default(function (resolve, reject) {
        return reject(_boom2.default.notFound());
      });
    }
  }, {
    key: 'addOrderToSheet',


    /**
     * Add a new order to the order workbook
     * @param order
     * @param sheet the sheet to populate
     * @returns {*|Promise.<orderId>} promise that adds the order and returns the new ID
     */
    value: function addOrderToSheet(order, sheet) {
      order.totals = orderHelper.orderTotals(order);
      order.invoiceNumber = order.invoiceNumber || (0, _sprintfJs.sprintf)('BFD%06d', this.orders.length + 1348);
      this.orders[order.id] = order;
      var setHeaderRow = _bluebird2.default.promisify(sheet.setHeaderRow, { context: sheet });
      var addRow = _bluebird2.default.promisify(sheet.addRow, { context: sheet });
      var columnHeaders = ['displayitemname', 'displayitemproductname', 'displayitemdescription', 'displayitemoffsetmerchquantity', 'displayitemoffsetmerchskuproductname', 'displayitemoffsetmerchskusize', 'displayitemoffsetmerchskumsrp', 'displayitemcost', 'displayitemquantity', 'lineitemskuproductname', 'lineitemskuvariety', 'lineitemskusize', 'lineitemsize', 'lineitemcpu', 'lineitemquantity', 'lineitemtesterquantity', 'lineitemtestercpu', 'date', 'invoicenumber', 'storename', 'storeshippingaddress', 'storebillingaddress', 'storephone', 'storeemail', 'storecontact', 'salesrepname', 'showname', 'notestocustomer', 'internalnotes', 'paiddate', 'paidamount', 'discount', 'shipping', 'duedate', 'targetshipdate', 'shippeddate', 'cancelled', 'commissionpaiddate'];

      return setHeaderRow(columnHeaders).then(function () {
        var rowPromises = [];
        var i = 0;

        var _loop = function _loop() {
          var lineItem = order.lineItems[i];
          var displayItem = order.displayItems[i];
          var payment = order.payments ? order.payments[i] : undefined;

          var row = {};

          if (lineItem && lineItem.quantity && lineItem.quantity > 0) {
            row = Object.assign(row, {
              lineitemskuproductname: lineItem.sku.product.name,
              lineitemskusize: lineItem.sku.size,
              lineitemskuvariety: lineItem.sku.variety,
              lineitemsize: lineItem.size,
              lineitemcpu: lineItem.cpu,
              lineitemquantity: lineItem.quantity,
              lineitemtesterquantity: lineItem.tester.quantity,
              lineitemtestercpu: lineItem.tester.cpu
            });
          }

          if (displayItem && displayItem.quantity && displayItem.quantity > 0) {
            var offsetMerchOutput = OrderRepository.getOffsetMerchOutput(displayItem.offsetMerch);
            row = Object.assign(row, {
              displayitemname: displayItem.name,
              displayitemproductname: displayItem.product.name,
              displayitemdescription: displayItem.description,
              displayitemoffsetmerchquantity: offsetMerchOutput.quantity,
              displayitemoffsetmerchskuproductname: offsetMerchOutput.productName,
              displayitemoffsetmerchskusize: offsetMerchOutput.skuSize,
              displayitemoffsetmerchskumsrp: offsetMerchOutput.skuMsrp,
              displayitemcost: displayItem.cost,
              displayitemquantity: displayItem.quantity
            });
          }

          if (payment) {
            row = Object.assign(row, {
              paiddate: payment.date,
              paidamount: payment.amount
            });
          }

          if (i === 0) {
            var orderDate = order.date || (0, _moment2.default)().unix();
            var defaultTargetDate = _moment2.default.unix(orderDate).add(14, 'days').unix();
            row = Object.assign(row, {
              date: orderDate,
              invoicenumber: order.invoiceNumber,
              storename: order.store.name,
              storeshippingaddress: order.store.shippingAddress,
              storebillingaddress: order.store.billingAddress,
              storephone: order.store.phone,
              storeemail: order.store.email,
              storecontact: order.store.contact,
              internalnotes: order.internalNotes,
              notestocustomer: order.notesToCustomer,
              salesrepname: order.salesRep.name,
              showname: order.show.name,
              discount: order.discount,
              shipping: order.shipping,
              duedate: order.dueDate || defaultTargetDate,
              targetshipdate: order.targetShipDate || defaultTargetDate,
              shippeddate: order.shippedDate,
              cancelled: order.cancelled,
              commissionpaiddate: order.commissionPaidDate
            });
          }

          rowPromises.push(new _bluebird2.default(function (resolve) {
            return resolve(row);
          }));
        };

        for (; i < order.lineItems.length || i < order.displayItems.length; i += 1) {
          _loop();
        }

        return _bluebird2.default.mapSeries(rowPromises, function (row) {
          return addRow(row);
        }).then(function () {
          return order;
        });
      });
    }
  }, {
    key: 'getAll',


    /**
     * Returns all orders in the repository, keyed by ID
     * @returns {*}
     */
    value: function getAll() {
      return this.orders;
    }

    /**
     * Return a single order that matches the order ID
     * @param orderId
     * @returns {Order}
     */

  }, {
    key: 'get',
    value: function get(orderId) {
      return this.orders[orderId];
    }
  }], [{
    key: 'getOffsetMerchOutput',
    value: function getOffsetMerchOutput(offsetMerch) {
      var offsetMerchOutput = {};
      if (Array.isArray(offsetMerch)) {
        offsetMerchOutput.quantity = JSON.stringify(_lodash2.default.map(offsetMerch, 'quantity'));
        offsetMerchOutput.productName = JSON.stringify(_lodash2.default.map(offsetMerch, 'sku.product.name'));
        offsetMerchOutput.skuSize = JSON.stringify(_lodash2.default.map(offsetMerch, 'sku.size'));
        offsetMerchOutput.skuMsrp = JSON.stringify(_lodash2.default.map(offsetMerch, 'sku.msrp'));
      }

      return offsetMerchOutput;
    }
  }, {
    key: 'getListItemFromRow',
    value: function getListItemFromRow(row) {
      return row.lineitemskuproductname ? {
        sku: {
          product: {
            name: row.lineitemskuproductname
          },
          size: row.lineitemskusize,
          variety: row.lineitemskuvariety
        },
        size: row.lineitemsize,
        cpu: row.lineitemcpu,
        quantity: row.lineitemquantity,
        tester: {
          quantity: row.lineitemtesterquantity,
          cpu: row.lineitemtestercpu
        }
      } : null;
    }
  }, {
    key: 'getDisplayItemFromRow',
    value: function getDisplayItemFromRow(row) {
      return row.displayitemname ? {
        name: row.displayitemname,
        description: row.displayitemdescription,
        cost: row.displayitemcost,
        product: {
          name: row.displayitemproductname
        },
        offsetMerch: (0, _displayItem2.default)(row.displayitemoffsetmerchskuproductname, row.displayitemoffsetmerchskusize, row.displayitemoffsetmerchskumsrp, row.displayitemoffsetmerchquantity),
        quantity: row.displayitemquantity
      } : null;
    }
  }, {
    key: 'getPaymentFromRow',
    value: function getPaymentFromRow(row) {
      return row.paiddate ? {
        date: row.paiddate,
        amount: row.paidamount
      } : null;
    }

    /**
     * Returns a promise that will contain a caseRepository instance or throw an error
     * @param workbook
     * @returns {*|Promise.<OrderRepository>}
     */

  }, {
    key: 'createFromSheets',
    value: function createFromSheets(sheets) {
      /*
       * Loop through all of the sheets in the workbook
       */
      var orders = {};
      var sheetIndex = {};
      var sheetPromises = [];
      var index = 0;
      sheets.forEach(function (sheet) {
        index += 1;
        var getRows = _bluebird2.default.promisify(sheet.getRows, { context: sheet });
        var order = {
          id: sheet.title,
          lineItems: [],
          displayItems: [],
          payments: []
        };
        orders[sheet.title] = order;
        sheetIndex[sheet.title] = sheet;
        var firstRow = true;
        sheetPromises.push(getRows({
          offset: 1,
          limit: 1000
        }).then(function (rows) {
          /* Just list items for now, add them to the order */
          rows.forEach(function (row) {
            if (firstRow) {
              order.date = row.date;
              order.invoiceNumber = row.invoicenumber || (0, _sprintfJs.sprintf)('BFD%06d', index + 1348);
              order.store = {
                name: row.storename,
                shippingAddress: row.storeshippingaddress,
                billingAddress: row.storebillingaddress,
                phone: row.storephone,
                email: row.storeemail,
                contact: row.storecontact
              };
              order.notesToCustomer = row.notestocustomer;
              order.internalNotes = row.internalnotes;
              order.salesRep = {
                name: row.salesrepname
              };
              order.show = {
                name: row.showname
              };
              order.discount = row.discount;
              order.shipping = row.shipping;
              order.dueDate = row.duedate;
              order.targetShipDate = row.targetshipdate;
              order.shippedDate = row.shippeddate;
              order.cancelled = row.cancelled;
              order.commissionPaidDate = row.commissionpaiddate;
              firstRow = false;
            }
            var payment = OrderRepository.getPaymentFromRow(row);
            if (payment) order.payments.push(payment);
            var lineItem = OrderRepository.getListItemFromRow(row);
            if (lineItem) order.lineItems.push(lineItem);
            var displayItem = OrderRepository.getDisplayItemFromRow(row);
            if (displayItem) order.displayItems.push(displayItem);
          });
          return order;
        }).then(function () {
          order.totals = orderHelper.orderTotals(order);
          return order;
        }));
      });

      return _bluebird2.default.all(sheetPromises).then(function () {
        return new OrderRepository(orders, sheetIndex);
      });
    }
  }]);

  return OrderRepository;
}();

exports.default = OrderRepository;