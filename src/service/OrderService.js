import _ from 'lodash';
import { sprintf } from 'sprintf-js';
import moment from 'moment';
import GoogleSpreadsheet from 'google-spreadsheet';
import Promise from 'bluebird';
import uuid from 'uuid';

import config from '../config';
import logger from '../logger';
import OrderRepository from '../models/OrderRepository';

export default class OrderService {
  constructor() {
    /* Grab orders from the google sheet */
    // TODO: Do caching for this
    // TODO: Move this to a provider pattern
    // spreadsheet key is the long id in the sheets URL
    this.doc = new GoogleSpreadsheet('119bM1NZrl61IBfBfQfQcjIYgsh1JL8LDzY11C2IwmRA');
    this.useServiceAccountAuth = Promise.promisify(this.doc.useServiceAccountAuth, { context: this.doc });
    this.getInfoFromDoc = Promise.promisify(this.doc.getInfo, { context: this.doc });
    this.addWorksheetToDoc = Promise.promisify(this.doc.addWorksheet, { context: this.doc });
    this.orderRepo = null;
    this.info = null;
    this.authenticated = false;
  }

  authenticate() {
    if (this.authenticated) return new Promise(resolve => resolve());

    const me = this;
    const precreds = config('BFD_SERVICE_ACCOUNT_CREDS');
    const creds = JSON.parse(precreds);
    return this.useServiceAccountAuth(creds)
      .then(() => {
        me.authenticated = true;
        return true;
      });
  }

  getInfo() {
    const me = this;
    if (this.info !== null) return new Promise(resolve => resolve(this.info));
    return this.authenticate()
      .then(() => me.getInfoFromDoc());
  }

  getOrderRepo() {
    if (this.orderRepo !== null) return new Promise(resolve => resolve(this.orderRepo));
    return this.getInfo()
      .then((info) => {
        logger.debug('Loaded Info for Order Workbook');

        return OrderRepository.createFromSheets(info.worksheets)
          .then((repo) => {
            this.orderRepo = repo;
            return repo;
          });
      });
  }

  addOrder(order) {
    /* Add a new sheet */
    order.id = uuid.v4();
    const me = this;
    return this.authenticate()
      .then(() => me.addWorksheetToDoc({
        title: order.id,
        colCount: 50
      })
        .then(sheet => me.getOrderRepo()
          .then(repo => repo.addOrderToSheet(order, sheet))
        ));
  }

  patchOrder(orderId, newOrderAttributes) {
    return this.getOrderRepo()
      .then(repo => repo.patchOrder(orderId, newOrderAttributes));
  }

  deleteOrder(orderId) {
    return this.getOrderRepo()
      .then(repo => repo.deleteOrder(orderId));
  }

  getOrder(id) {
    return this.getOrderRepo()
      .then(repo => repo.get(id));
  }

  getShowOrders(name) {
    return this.getOrderRepo()
      .then((repo) => {
        const orders = repo.getAll();

        return _.filter(orders, order => order.show.name === name);
      });
  }

  getNextMonthOrders() {
    return this.getOrderRepo()
      .then((repo) => {
        const orders = repo.getAll();
        const endTime = moment().add(1, 'M').unix();

        return _.filter(orders, order => (order.targetShipDate && order.targetShipDate < endTime) && !order.shippedDate);
      });
  }

  getMonthOrders(month, year) {
    return this.getOrderRepo()
      .then((repo) => {
        const formattedMonth = sprintf('%02d', month);
        const orders = repo.getAll();
        const startDate = moment(`${year}-${formattedMonth}-01T00:00:00Z`);
        const startTime = startDate.unix();
        const endTime = moment(startDate).add(1, 'M').unix();

        return _.filter(orders, order => (order.targetShipDate && order.targetShipDate >= startTime && order.targetShipDate < endTime) && !order.shippedDate);
      });
  }

  getPendingCommissionOrders() {
    return this.getOrderRepo()
      .then((repo) => {
        const orders = repo.getAll();

        return _.filter(orders, order => !order.commissionPaidDate && order.payments.length > 0 && order.salesRep.name !== 'Jes Mostek');
      });
  }

  getAll() {
    return this.getOrderRepo()
      .then(repo => repo.getAll());
  }
}
