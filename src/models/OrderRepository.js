import Promise from 'bluebird';
import Boom from 'boom';

/**
 * This takes in a google sheet and converts it into an SKU object
 */
export default class OrderRepository {
  /* This class is for containing all of the cases and providing search functions for it. */
  constructor(orders, sheets) {
    this.orders = orders;
    this.sheets = sheets;
  }

  /**
   * Remove an order from the repository.  Assume that it has already been deleted from the workbook
   * @param orderId
   */
  deleteOrder(orderId) {
    if (this.orders[orderId]) {
      const sheet = this.sheets[orderId];
      const deleteSheet = Promise.promisify(sheet.del, { context: sheet });
      return deleteSheet()
        .then(() => {
          delete this.sheets[orderId];
          delete this.orders[orderId];
          return orderId;
        });
    }

    return new Promise((resolve, reject) => reject(Boom.notFound()));
  }

  /**
   * Add a new order to the order workbook
   * @param order
   * @param sheet the sheet to populate
   * @returns {*|Promise.<orderId>} promise that adds the order and returns the new ID
   */
  addOrderToSheet(order, sheet) {
    this.orders[order.id] = order;
    const setHeaderRow = Promise.promisify(sheet.setHeaderRow, { context: sheet });
    const addRow = Promise.promisify(sheet.addRow, { context: sheet });
    const columnHeaders = ['lineitemskuproductname', 'lineitemskuvariety', 'lineitemskusize', 'lineitemsize', 'lineitemcpu', 'lineitemquantity', 'lineitemtesters'];

    return setHeaderRow(columnHeaders)
      .then(() => {
        const rowPromises = [];
        order.lineItems.forEach((lineItem) => {
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
        return Promise.all(rowPromises)
          .then(() => order);
      });
  }

  static getListItemFromRow(row) {
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
  static createFromSheets(sheets) {
    /*
     * Loop through all of the sheets in the workbook
     */
    const orders = {};
    const sheetIndex = {};
    const sheetPromises = [];
    sheets.forEach((sheet) => {
      const getRows = Promise.promisify(sheet.getRows, { context: sheet });
      const order = {
        id: sheet.title,
        lineItems: []
      };
      orders[sheet.title] = order;
      sheetIndex[sheet.title] = sheet;
      sheetPromises.push(
        getRows({
          offset: 1,
          limit: 1000
        })
          .then(rows =>
            /* Just list items for now, add them to the order */
            rows.forEach(row => order.lineItems.push(OrderRepository.getListItemFromRow(row))
            ))
      );
    });

    return Promise.all(sheetPromises)
      .then(() => new OrderRepository(orders, sheetIndex));
  }

  /**
   * Returns all orders in the repository, keyed by ID
   * @returns {*}
   */
  getAll() {
    return this.orders;
  }

  /**
   * Return a single order that matches the order ID
   * @param orderId
   * @returns {Order}
   */
  get(orderId) {
    return this.orders[orderId];
  }
}
