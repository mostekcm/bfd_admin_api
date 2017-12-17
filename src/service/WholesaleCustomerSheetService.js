import _ from 'lodash';
import google from 'googleapis';
import Promise from 'bluebird';
// import PromiseThrottle from 'promise-throttle';
import moment from 'moment';

import config from '../config';
import logger from '../logger';

export default class WholesaleCustomerSheetService {
  constructor() {
    /* Grab orders from the google sheet */
    // TODO: Do caching for this
    // TODO: Move this to a provider pattern
    // spreadsheet key is the long id in the sheets URL
    this.sheets = google.sheets('v4');
    this.spreadsheetId = config('WHOLESALE_CUSTOMER_SHEET');
    this.sheetName = 'Customers';
    this.get = Promise.promisify(this.sheets.spreadsheets.values.get, { context: this.sheets.spreadsheets.values });
    this.ourFields = ['contactname', 'storeemail', 'storephone', 'storeaddress',
      'numorders', 'totalrev', 'mostrecentorder', 'mostrecentshipment'];

    this.headers = null;
    this.jwtClient = null;
    this.authenticated = false;
  }

  authenticate() {
    if (this.jwtClient) return new Promise.resolve(this.jwtClient);

    const me = this;
    const precreds = config('BFD_SERVICE_ACCOUNT_CREDS');
    const creds = JSON.parse(precreds);
    const jwtClient = new google.auth.JWT(
      creds.client_email,
      null,
      creds.private_key,
      ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'], // an array of auth
      // scopes
      null
    );

    const authorize = Promise.promisify(jwtClient.authorize, { context: jwtClient });
    return authorize()
      .then(() => {
        me.jwtClient = jwtClient;
        return true;
      });
  }

  static getCharacterFromIndex(index) {
    return String.fromCharCode('A'.charCodeAt(0) + index);
  }

  static getColumnValueFromIndex(index) {
    if (index > 25) {
      return this.getCharacterFromIndex(Math.floor(index / 26)) + this.getCharacterFromIndex(index % 26);
    }
    return this.getCharacterFromIndex(index);
  }

  getHeader() {
    if (this.headers) return Promise.resolve(this.headers);

    const me = this;

    return this.authenticate()
      .then(() => me.get({
        auth: this.jwtClient,
        spreadsheetId: this.spreadsheetId,
        range: 'Customers!A1:ZZZ1'
      }))
      .then((data) => {
        me.headers = {};
        data.values[0].map((columnName, index) => {
          me.headers[columnName] = { index, column: WholesaleCustomerSheetService.getColumnValueFromIndex(index) };
          return me.headers;
        });
        return me.headers;
      });
  }

  getUpdateData(rowNumber, columnHeader, value) {
    return {
      range: `${this.sheetName}!${this.headers[columnHeader].column}${rowNumber}`,
      values: [[value]]
    };
  }

  changeCell(row, rowNumber, data, crmStoreInfo, columnHeader, attr) {
    const headerInfo = this.headers[columnHeader];
    const index = headerInfo.index;
    let value = _.get(crmStoreInfo, attr);
    if (_.isNumber(value)) value = Math.round(value * 100) / 100;
    const oldValue = row[index];
    if (!oldValue || oldValue.toString() !== value.toString()) {
      logger.info(`Changing ${columnHeader} (${oldValue}) to ${attr} (${value})`);
      data.push(this.getUpdateData(rowNumber, columnHeader, value));
      return true;
    }

    return false;
  }

  checkRows(row, rowNumber, crmStoreInfoRows, data) {
    const crmStoreInfo = crmStoreInfoRows[0];
    crmStoreInfo.totalRev = _.sumBy(crmStoreInfoRows, 'totals.total');
    crmStoreInfo.numOrders = crmStoreInfoRows.length;
    const maxDate = _.maxBy(crmStoreInfoRows, 'date');
    const maxShippedDate = _.maxBy(crmStoreInfoRows, 'shippedDate');
    crmStoreInfo.mostRecentOrderDate = (maxDate && moment.unix(maxDate.date).format('L')) || '';
    crmStoreInfo.mostRecentShipment = (maxShippedDate && moment.unix(maxShippedDate.shippedDate).format('L')) || '';

    let isChanged = this.changeCell(row, rowNumber, data, crmStoreInfo, 'contactname', 'store.contact');
    isChanged = this.changeCell(row, rowNumber, data, crmStoreInfo, 'storeemail', 'store.email') || isChanged;
    isChanged = this.changeCell(row, rowNumber, data, crmStoreInfo, 'storephone', 'store.phone') || isChanged;
    isChanged = this.changeCell(row, rowNumber, data, crmStoreInfo, 'storeaddress', 'store.shippingAddress') || isChanged;
    isChanged = this.changeCell(row, rowNumber, data, crmStoreInfo, 'numorders', 'numOrders') || isChanged;
    isChanged = this.changeCell(row, rowNumber, data, crmStoreInfo, 'totalrev', 'totalRev') || isChanged;
    isChanged = this.changeCell(row, rowNumber, data, crmStoreInfo, 'mostrecentorder', 'mostRecentOrderDate') || isChanged;
    isChanged = this.changeCell(row, rowNumber, data, crmStoreInfo, 'mostrecentshipment', 'mostRecentShipment') || isChanged;

    return isChanged;
  }

  createNewRow(newRow, rowNumber, data) {
    Object.keys(newRow).forEach(columnHeader => data.push(this.getUpdateData(rowNumber, columnHeader, newRow[columnHeader])));
  }

  syncFromOrders(orders) {
    return this.getHeader()
      .then((headers) => {
        logger.debug('Loaded Info for Wholesale Customer Workbook here are the headers: ', headers);

        // first find the data max column for all fields we care about
        let maxColumn = headers.contactname;
        const ourFields = this.ourFields;
        ourFields.forEach((columnName) => {
          const headerInfo = headers[columnName];
          if (headerInfo.index > maxColumn.index) maxColumn = headerInfo;
          return maxColumn; // to quiet lint
        });

        const query = `${this.sheetName}!A2:${maxColumn.column}`;

        return this.get({
          auth: this.jwtClient,
          spreadsheetId: this.spreadsheetId,
          range: query
        })
          .then((data) => {
            const updateObject = { data: [] };
            const rows = data.values;
            const stats = {
              updated: 0,
              new: 0,
              zeroOrders: 0,
              totalStores: 0,
              skipped: 0
            };

            stats.totalStores = rows.length;

            const orderByStoreName = _.groupBy(orders, order => order.store.name);

            rows.map((row, rowNumber) => {
              const storeName = row[headers.storename.index];
              const crmOrderRows = _.cloneDeep(orderByStoreName[storeName]);
              if (!crmOrderRows) {
                logger.info(`Missing store from orders: ${storeName}`);
                stats.zeroOrders += 1;
                return stats;
              }

              delete orderByStoreName[storeName];

              if (this.checkRows(row, rowNumber + 2, crmOrderRows, updateObject.data)) stats.updated += 1;
              return stats;
            });

            Object.keys(orderByStoreName).map((storeName, rowOffset) => {
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

              if (crmStoreInfo.pendingApproval) {
                logger.info('Skipping pending store: ', newCrmOrderRow.storename);
                stats.skipped += 1;
              } else {
                this.createNewRow(newCrmOrderRow, rows.length + rowOffset + 2, updateObject.data);
                logger.info('new row: ', newCrmOrderRow);
                stats.new += 1;
              }

              return stats;
            });

            const bulkUpdate = Promise.promisify(this.sheets.spreadsheets.values.batchUpdate, { context: this.sheets.spreadsheets.values });

            const options = {
              auth: this.jwtClient,
              spreadsheetId: this.spreadsheetId,
              resource: {
                valueInputOption: 'RAW',
                data: updateObject.data
              }
            };
            return bulkUpdate(options)
              .then(result => logger.info('Sync Stats: ', stats, 'result: ', result))
              .then(() => stats);
          });
      });
  }
}
