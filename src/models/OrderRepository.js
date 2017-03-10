import Promise from 'bluebird';
import Boom from 'boom';
import moment from 'moment';

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
    const columnHeaders = [
      'displayitemname',
      'displayitemproductname',
      'displayitemdescription',
      'displayitemoffsetmerchquantity',
      'displayitemoffsetmerchskuproductname',
      'displayitemoffsetmerchskusize',
      'displayitemcost',
      'displayitemquantity',
      'lineitemskuproductname',
      'lineitemskuvariety',
      'lineitemskusize',
      'lineitemsize',
      'lineitemcpu',
      'lineitemquantity',
      'lineitemtesters',
      'date',
      'storename',
      'storeshippingaddress',
      'storebillingaddress',
      'storephone',
      'storeemail',
      'storecontact',
      'salesrepname',
      'showname',
      'notes'
    ];

    return setHeaderRow(columnHeaders)
      .then(() => {
        const rowPromises = [];
        let i = 0;
        for (; i < order.lineItems.length || i < order.displayItems.length; i += 1) {
          const lineItem = order.lineItems[i];
          const displayItem = order.displayItems[i];

          let row = {};

          if (lineItem && lineItem.quantity && lineItem.quantity > 0) {
            row = Object.assign(row, {
              lineitemskuproductname: lineItem.sku.product.name,
              lineitemskusize: lineItem.sku.size,
              lineitemskuvariety: lineItem.sku.variety,
              lineitemsize: lineItem.size,
              lineitemcpu: lineItem.cpu,
              lineitemquantity: lineItem.quantity,
              lineitemtesters: lineItem.testers
            });
          }

          if (displayItem && displayItem.quantity && displayItem.quantity > 0) {
            row = Object.assign(row, {
              displayitemname: displayItem.name,
              displayitemproductname: displayItem.product.name,
              displayitemdescription: displayItem.description,
              displayitemoffsetmerchquantity: displayItem.offsetMerch.quantity,
              displayitemoffsetmerchskuproductname: displayItem.offsetMerch.sku.product.name,
              displayitemoffsetmerchskusize: displayItem.offsetMerch.sku.size,
              displayitemcost: displayItem.cost,
              displayitemquantity: displayItem.quantity
            });
          }

          if (i === 0) {
            row = Object.assign(row, {
              date: order.date || moment().unix(),
              storename: order.store.name,
              storeshippingaddress: order.store.shippingAddress,
              storebillingaddress: order.store.billingAddress,
              storephone: order.store.phone,
              storeemail: order.store.email,
              storecontact: order.store.contact,
              notes: order.notes,
              salesrepname: order.salesRep.name,
              showname: order.show.name
            });
          }
          rowPromises.push(new Promise(resolve => resolve(row)));
        }

        return Promise.mapSeries(rowPromises, row => addRow(row))
          .then(() => order);
      });
  }

  static getListItemFromRow(row) {
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
      testers: row.lineitemtesters
    } : null;
  }

  static getDisplayItemFromRow(row) {
    return row.displayitemname ? {
      name: row.displayitemname,
      description: row.displayitemdescription,
      cost: row.displayitemcost,
      product: {
        name: row.displayitemproductname
      },
      offsetMerch: {
        sku: {
          product: {
            name: row.displayitemoffsetmerchskuproductname
          },
          size: row.displayitemoffsetmerchskusize,
          quantity: row.displayitemoffsetmerchquantity
        }
      },
      quantity: row.displayitemquantity
    } : null;
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
        lineItems: [],
        displayItems: []
      };
      orders[sheet.title] = order;
      sheetIndex[sheet.title] = sheet;
      let firstRow = true;
      sheetPromises.push(
        getRows({
          offset: 1,
          limit: 1000
        })
          .then(rows =>
            /* Just list items for now, add them to the order */
            rows.forEach((row) => {
              if (firstRow) {
                order.store = {
                  name: row.storename,
                  shippingAddress: row.storeshippingaddress,
                  billingAddress: row.storebillingaddress,
                  phone: row.storephone,
                  email: row.storeemail,
                  contact: row.storecontact
                };
                order.notes = row.notes;
                order.salesRep = {
                  name: row.salesrepname
                };
                order.show = {
                  name: row.showname
                };
                firstRow = false;
              }
              const lineItem = OrderRepository.getListItemFromRow(row);
              if (lineItem) order.lineItems.push(lineItem);
              const displayItem = OrderRepository.getDisplayItemFromRow(row);
              if (displayItem) order.displayItems.push(displayItem);
            }))
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
