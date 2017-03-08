'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _boom = require('boom');

var _boom2 = _interopRequireDefault(_boom);

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

    /**
     * Add a new order to the order workbook
     * @param order
     * @param sheet the sheet to populate
     * @returns {*|Promise.<orderId>} promise that adds the order and returns the new ID
     */

  }, {
    key: 'addOrderToSheet',
    value: function addOrderToSheet(order, sheet) {
      this.orders[order.id] = order;
      var setHeaderRow = _bluebird2.default.promisify(sheet.setHeaderRow, { context: sheet });
      var addRow = _bluebird2.default.promisify(sheet.addRow, { context: sheet });
      var columnHeaders = ['lineitemskuproductname', 'lineitemskuvariety', 'lineitemskusize', 'lineitemsize', 'lineitemcpu', 'lineitemquantity', 'lineitemtesters'];

      return setHeaderRow(columnHeaders).then(function () {
        var rowPromises = [];
        order.lineItems.forEach(function (lineItem) {
          if (lineItem.quantity && lineItem.quantity > 0) {
            rowPromises.push(addRow({
              lineitemskuproductname: lineItem.sku.product.name,
              lineitemskusize: lineItem.sku.size,
              lineitemskuvariety: lineItem.sku.variety,
              lineitemsize: lineItem.size,
              lineitemcpu: lineItem.cpu,
              lineitemquantity: lineItem.quantity,
              lineitemtesters: lineItem.testers
            }));
          }
        });
        return _bluebird2.default.all(rowPromises).then(function () {
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
    key: 'getListItemFromRow',
    value: function getListItemFromRow(row) {
      return {
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
        testers: row.lineitemtesters
      };
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
      sheets.forEach(function (sheet) {
        var getRows = _bluebird2.default.promisify(sheet.getRows, { context: sheet });
        var order = {
          id: sheet.title,
          lineItems: []
        };
        orders[sheet.title] = order;
        sheetIndex[sheet.title] = sheet;
        sheetPromises.push(getRows({
          offset: 1,
          limit: 1000
        }).then(function (rows) {
          return (
            /* Just list items for now, add them to the order */
            rows.forEach(function (row) {
              return order.lineItems.push(OrderRepository.getListItemFromRow(row));
            })
          );
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