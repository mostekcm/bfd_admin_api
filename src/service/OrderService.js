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
    this.removeWorksheetFromDoc = Promise.promisify(this.doc.removeWorksheet, { context: this.doc });
    this.orderRepo = null;
    this.info = null;
    this.authenticated = false;
  }

  authenticate() {
    if (this.authenticated) return new Promise(resolve => resolve());

    const me = this;
    console.debug("Carlos looking for service account creds: ", Object.keys(config('BFD_SERVICE_ACCOUNT_CRES')).length);

    return this.useServiceAccountAuth(config('BFD_SERVICE_ACCOUNT_CREDS'))
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
        title: order.id
      })
        .then(sheet => me.getOrderRepo()
          .then(repo => repo.addOrderToSheet(order, sheet))
        ));
  }

  deleteOrder(orderId) {
    return this.getOrderRepo()
      .then(repo => repo.deleteOrder(orderId));
  }

  getOrder(id) {
    return this.getOrderRepo()
      .then(repo => repo.get(id));
  }

  getAll() {
    return this.getOrderRepo()
      .then(repo => repo.getAll());
  }
}
