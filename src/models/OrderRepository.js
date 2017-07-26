import _ from 'lodash';
import Promise from 'bluebird';
import Boom from 'boom';
import moment from 'moment';
import { sprintf } from 'sprintf-js';

import * as orderHelper from '../helper/order';
import getOffsetMerchFromRow from '../helper/displayItem';
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

  updateOrder(orderId, newOrder) {
    if (this.orders[orderId]) {
      const sheet = this.sheets[orderId];

      const clearSheet = Promise.promisify(sheet.clear, { context: sheet });

      return clearSheet()
        .then(() => this.addOrderToSheet(newOrder, sheet));
    }

    return new Promise((resolve, reject) => reject(Boom.notFound()));
  }

  patchOrder(orderId, newOrderAttributes) {
    if (this.orders[orderId]) {
      const newOrder = _.assign(this.orders[orderId], newOrderAttributes);

      console.log('Carlos new order: ', newOrder);

      return this.updateOrder(orderId, newOrder);
    }

    return new Promise((resolve, reject) => reject(Boom.notFound()));
  }

  static getOffsetMerchOutput(offsetMerch) {
    const offsetMerchOutput = {};
    if (Array.isArray(offsetMerch)) {
      offsetMerchOutput.quantity = JSON.stringify(_.map(offsetMerch, 'quantity'));
      offsetMerchOutput.productName = JSON.stringify(_.map(offsetMerch, 'sku.product.name'));
      offsetMerchOutput.skuSize = JSON.stringify(_.map(offsetMerch, 'sku.size'));
      offsetMerchOutput.skuMsrp = JSON.stringify(_.map(offsetMerch, 'sku.msrp'));
    }

    return offsetMerchOutput;
  }

  /**
   * Add a new order to the order workbook
   * @param order
   * @param sheet the sheet to populate
   * @returns {*|Promise.<orderId>} promise that adds the order and returns the new ID
   */
  addOrderToSheet(order, sheet) {
    order.totals = orderHelper.orderTotals(order);
    order.invoiceNumber = order.invoiceNumber || sprintf('BFD%06d', Object.keys(this.orders).length + 1349);
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
      'displayitemoffsetmerchskumsrp',
      'displayitemcost',
      'displayitemquantity',
      'lineitemskuproductname',
      'lineitemskuvariety',
      'lineitemskusize',
      'lineitemsize',
      'lineitemcpu',
      'lineitemquantity',
      'lineitemtesterquantity',
      'lineitemtestercpu',
      'date',
      'invoicenumber',
      'storename',
      'storeshippingaddress',
      'storebillingaddress',
      'storephone',
      'storeemail',
      'storecontact',
      'salesrepname',
      'showname',
      'notestocustomer',
      'internalnotes',
      'paiddate',
      'paidamount',
      'discount',
      'shipping',
      'duedate',
      'targetshipdate',
      'shippeddate',
      'cancelled',
      'commissionpaiddate'
    ];

    return setHeaderRow(columnHeaders)
      .then(() => {
        const rowPromises = [];
        let i = 0;
        for (; i < order.lineItems.length || i < order.displayItems.length; i += 1) {
          const lineItem = order.lineItems[i];
          const displayItem = order.displayItems[i];
          const payment = order.payments ? order.payments[i] : undefined;

          let row = {};

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
            const offsetMerchOutput = OrderRepository.getOffsetMerchOutput(displayItem.offsetMerch);
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
            const orderDate = order.date || moment().unix();
            const defaultTargetDate = moment.unix(orderDate).add(14, 'days').unix();
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
      tester: {
        quantity: row.lineitemtesterquantity,
        cpu: row.lineitemtestercpu
      }
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
      offsetMerch: getOffsetMerchFromRow(
        row.displayitemoffsetmerchskuproductname,
        row.displayitemoffsetmerchskusize,
        row.displayitemoffsetmerchskumsrp,
        row.displayitemoffsetmerchquantity),
      quantity: row.displayitemquantity
    } : null;
  }

  static getPaymentFromRow(row) {
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
  static createFromSheets(sheets) {
    /*
     * Loop through all of the sheets in the workbook
     */
    const orders = {};
    const sheetIndex = {};
    const sheetPromises = [];
    let index = 0;
    sheets.forEach((sheet) => {
      index += 1;
      const getRows = Promise.promisify(sheet.getRows, { context: sheet });
      const order = {
        id: sheet.title,
        lineItems: [],
        displayItems: [],
        payments: []
      };
      orders[sheet.title] = order;
      sheetIndex[sheet.title] = sheet;
      let firstRow = true;
      sheetPromises.push(
        getRows({
          offset: 1,
          limit: 1000
        })
          .then((rows) => {
            /* Just list items for now, add them to the order */
            rows.forEach((row) => {
              if (firstRow) {
                order.date = row.date;
                order.invoiceNumber = row.invoicenumber || sprintf('BFD%06d', index + 1348);
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
              const payment = OrderRepository.getPaymentFromRow(row);
              if (payment) order.payments.push(payment);
              const lineItem = OrderRepository.getListItemFromRow(row);
              if (lineItem) order.lineItems.push(lineItem);
              const displayItem = OrderRepository.getDisplayItemFromRow(row);
              if (displayItem) order.displayItems.push(displayItem);
            });
            return order;
          })
          .then(() => {
            order.totals = orderHelper.orderTotals(order);
            return order;
          }));
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
