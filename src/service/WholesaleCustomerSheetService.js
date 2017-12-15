import _ from 'lodash';
import GoogleSpreadsheet from 'google-spreadsheet';
import Promise from 'bluebird';
import PromiseThrottle from 'promise-throttle';
import moment from 'moment';

import config from '../config';
import logger from '../logger';

export default class WholesaleCustomerSheetService {
  constructor() {
    /* Grab orders from the google sheet */
    // TODO: Do caching for this
    // TODO: Move this to a provider pattern
    // spreadsheet key is the long id in the sheets URL
    this.doc = new GoogleSpreadsheet(config('WHOLESALE_CUSTOMER_SHEET'));
    this.useServiceAccountAuth = Promise.promisify(this.doc.useServiceAccountAuth, { context: this.doc });
    this.getInfoFromDoc = Promise.promisify(this.doc.getInfo, { context: this.doc });
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

  static isValueChanged(row, crmStoreInfo, column, attr) {
    const value = _.get(crmStoreInfo, attr);
    if (column === 'mostrecentorder') logger.debug('carlos: bad value: ', value);
    if (row[column] !== value) {
      logger.info(`Changing ${column} (${row[column]}) to ${attr} (${value})`);
      row[column] = value;
      return true;
    }

    return false;
  }

  static checkRows(row, crmStoreInfoRows) {
    let valueChanged = false;

    const crmStoreInfo = crmStoreInfoRows[0];
    crmStoreInfo.totalRev = _.sumBy(crmStoreInfoRows, 'totals.total');
    crmStoreInfo.numOrders = crmStoreInfoRows.length;
    const maxDate = _.maxBy(crmStoreInfoRows, 'date');
    const maxShippedDate = _.maxBy(crmStoreInfoRows, 'shippedDate');
    crmStoreInfo.mostRecentOrderDate = (maxDate && moment.unix(maxDate.date).format('L')) || '';
    crmStoreInfo.mostRecentShipment = (maxShippedDate && moment.unix(maxShippedDate.shippedDate).format('L')) || '';

    valueChanged = WholesaleCustomerSheetService.isValueChanged(row, crmStoreInfo, 'contactname', 'store.contact') || valueChanged;
    valueChanged = WholesaleCustomerSheetService.isValueChanged(row, crmStoreInfo, 'storeemail', 'store.email') || valueChanged;
    valueChanged = WholesaleCustomerSheetService.isValueChanged(row, crmStoreInfo, 'storephone', 'store.phone') || valueChanged;
    valueChanged = WholesaleCustomerSheetService.isValueChanged(row, crmStoreInfo, 'storeaddress', 'store.shippingAddress') || valueChanged;
    valueChanged = WholesaleCustomerSheetService.isValueChanged(row, crmStoreInfo, 'numorders', 'numOrders') || valueChanged;
    valueChanged = WholesaleCustomerSheetService.isValueChanged(row, crmStoreInfo, 'totalrev', 'totalRev') || valueChanged;
    valueChanged = WholesaleCustomerSheetService.isValueChanged(row, crmStoreInfo, 'mostrecentorder', 'mostRecentOrderDate') || valueChanged;
    valueChanged = WholesaleCustomerSheetService.isValueChanged(row, crmStoreInfo, 'mostrecentshipment', 'mostRecentShipment') || valueChanged;

    const save = Promise.promisify(row.save, { context: row });

    if (valueChanged) return save().then(() => true);

    return Promise.resolve(false);
  }

  syncFromOrders(orders) {
    return this.getInfo()
      .then((info) => {
        logger.debug('Loaded Info for Wholesale Customer Workbook');

        // first find the write worksheet
        const existingCustomerSheet = _.find(info.worksheets, worksheet => worksheet.title === 'Customers');

        if (!existingCustomerSheet) return Promise.reject(new Error('Could not find the customers sheet: ' + info.worksheets.length()));

        const orderByStoreName = _.groupBy(orders, order => order.store.name);

        const getRows = Promise.promisify(existingCustomerSheet.getRows, { context: existingCustomerSheet });

        const stats = {
          updated: 0,
          new: 0,
          zeroOrders: 0,
          totalStores: 0,
          skipped: 0
        };

        const promiseThrottle = new PromiseThrottle({
          requestsPerSecond: 5, // per second
          promiseImplementation: Promise
        });

        return getRows()
          .then((rows) => {
            const promises = [];
            stats.totalStores = rows.length;
            rows.forEach((row) => {
              const crmOrderRows = _.cloneDeep(orderByStoreName[row.storename]);
              if (!crmOrderRows) {
                logger.info(`Missing store from orders: ${row.storename}`);
                stats.zeroOrders += 1;
                return;
              }

              delete orderByStoreName[row.storename];

              const checkRowsWrapper = () => WholesaleCustomerSheetService.checkRows(row, crmOrderRows)
                .then((updated) => {
                  stats.updated += updated ? 1 : 0;
                  return stats;
                });

              promises.push(promiseThrottle.add(checkRowsWrapper.bind(this)));
            });

            Object.keys(orderByStoreName).forEach((storeName) => {
              const crmStoreInfoRows = _.cloneDeep(orderByStoreName[storeName]);
              const crmStoreInfo = crmStoreInfoRows[0];
              crmStoreInfo.totalRev = _.sumBy(crmStoreInfoRows, 'totals.total');
              const maxDate = _.maxBy(crmStoreInfoRows, 'date');
              const maxShippedDate = _.maxBy(crmStoreInfoRows, 'shippedDate');
              crmStoreInfo.mostRecentOrderDate = (maxDate && moment.unix(maxDate.date).format('L')) || '';
              crmStoreInfo.mostRecentShipment = (maxShippedDate && moment.unix(maxShippedDate.shippedDate).format('L')) || '';

              const newCrmOrderRow = {
                storename: storeName,
                contactname: _.get(crmStoreInfo, 'store.contact'),
                storeemail: _.get(crmStoreInfo, 'store.email'),
                storephone: _.get(crmStoreInfo, 'store.phone'),
                storeaddress: _.get(crmStoreInfo, 'store.shippingAddress'),
                numorders: _.get(crmStoreInfo, 'numOrders'),
                totalrev: _.get(crmStoreInfo, 'totalRev'),
                mostrecentorder: _.get(crmStoreInfo, 'mostRecentOrderDate'),
                mostrecentshipment: _.get(crmStoreInfo, 'mostRecentShipment')
              };

              const addRow = Promise.promisify(existingCustomerSheet.addRow, { context: existingCustomerSheet });

              const addRowWrapper = () => {
                if (crmStoreInfo.pendingApproval) {
                  logger.info('Skipping pending store: ', newCrmOrderRow.storename);
                  stats.skipped += 1;
                  return Promise.resolve(stats);
                }
                return addRow(newCrmOrderRow)
                  .then(() => {
                    logger.info('new row: ', newCrmOrderRow);
                    stats.new += 1;
                    return stats;
                  });
              };

              promises.push(promiseThrottle.add(addRowWrapper.bind(this)));
            });

            return Promise.all(promises)
              .then(() => logger.info('Sync Stats: ', stats))
              .then(() => stats);
          });
      });
  }
}
