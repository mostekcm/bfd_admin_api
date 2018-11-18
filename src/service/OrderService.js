import _ from 'lodash';
import { sprintf } from 'sprintf-js';
import moment from 'moment';
import Promise from 'bluebird';
import uuid from 'uuid';
import mongo from 'mongodb';
import mongoQueryCompile from 'monquery';

import logger from '../logger';
import config from '../config';
import * as orderHelper from '../helper/order';

import CaseService from './CaseService';
import DisplayService from './DisplayService';
import DealService from './DealService';

export default class OrderService {
  constructor(adminId) {
    this.db = null;
    this.casesIndex = null;
    this.displays = null;

    this.allowedDealStages = ['Qualifying', 'Pending Approval', 'Approved', 'Closed Won', 'Closed Lost'];
    this.dealService = new DealService(adminId);
  }

  getDb() {
    if (this.db !== null) {
      logger.debug('Using cached db');
      return Promise.resolve(this.db);
    }

    const caseService = new CaseService();
    const displayService = new DisplayService();

    const me = this;

    return caseService.getAll()
      .then(cases => displayService.getAll()
        .then((displays) => {
          me.displays = displays;
          me.casesIndex = _(cases).groupBy(caseInfo => caseInfo.sku.product.name).value();
          return mongo.MongoClient.connect(config('MONGO_URI'))
            .then((db) => {
              me.db = db;
              return db;
            });
        }));
  }

  init() {
    return this.getDb().then(() => true);
  }

  getOrdersCollection() {
    return this.getDb()
      .then(db => db.collection('orders'));
  }

  getInvoiceNumber(order) {
    if (order.invoiceNumber) return Promise.resolve(order.invoiceNumber);

    return this.getDb()
      .then(db =>
        db.collection('counters').findOneAndUpdate(
          { _id: 'invoiceNumber' },
          { $inc: { seq: 1 } }, { returnOriginal: false })
          .then(invoiceNumber => invoiceNumber.value.seq)
          .then(invoiceSeq => sprintf('BFD%08d', parseInt(invoiceSeq, 10)))
      );
  }

  addOrder(order) {
    /* Add a new sheet */
    return this.getOrdersCollection()
      .then(orders => this.getInvoiceNumber(order)
        .then((invoiceNumber) => {
          /* Set some default values for the order */
          order.date = order.date || moment().unix();
          const defaultTargetDate = moment.unix(order.date).add(14, 'days').unix();
          order.id = uuid.v4();
          order.invoiceNumber = invoiceNumber;
          order.dueDate = order.dueDate || defaultTargetDate;
          order.targetShipDate = order.targetShipDate || defaultTargetDate;
          order.dealStage = order.dealStage || 'Pending Approval';

          if (this.allowedDealStages.indexOf(order.dealStage) < 0) {
            logger.warn(`Bad deal stage for order ${invoiceNumber}: ${order.dealStage}; Not one of: ${this.allowedDealStages.join(', ')}`);
            order.dealStage = 'Pending Approval';
          }

          order.totals = orderHelper.orderTotals(order, this.casesIndex, this.displays);

          return orders.insertOne(order)
            .then(() => {
              logger.debug(`inserted new order: ${JSON.stringify(order)}`);

              return this.updateDeal(order)
                .catch((err) => {
                  logger.warn(`Failed to create deal for order ${order.id} because: `, err);
                  return order;
                });
            });
        }));
  }

  updateTotalsIfNeeded(orders, order) {
    const oldTotals = _.cloneDeep(order.totals);
    order.totals = orderHelper.orderTotals(order, this.casesIndex, this.displays);

    if (_.isEqual(oldTotals, order.totals)) return Promise.resolve(order);

    return orders.findOneAndUpdate({ id: order.id }, { $set: { totals: order.totals } }, { returnOriginal: false })
      .then(result => result.value);
  }

  patchOrder(id, newOrderAttributes) {
    if (newOrderAttributes.shippedDate) {
      newOrderAttributes.dealStage = 'Closed Won';
    }

    return this.getOrdersCollection()
      .then(orders => orders.findOneAndUpdate({ id }, { $set: newOrderAttributes }, { returnOriginal: false })
        .then(result => this.updateTotalsIfNeeded(orders, result.value)
          .then(order => this.updateDeal(order)
            .then(() => order)
            .catch((err) => {
              logger.warn('Cannot update deal because: ', err);
              return order;
            }))));
  }

  getDealId(order) {
    if (order.dealId) return Promise.resolve(order.dealId);
    if (!order.store || !order.store.id) return Promise.reject(new Error('No store synced from hubspot'));
    return this.dealService.getDealsForCompany(order.store.id)
      .then((deals) => {
        if (deals.missing && deals.missing.length > 0) {
          deals.missing.forEach(dealId => logger.error('Deal missing BFD order number: ', dealId));
          return Promise.reject(new Error('Need to fix hubspot deals'));
        }

        if (order.invoiceNumber in deals) return Promise.resolve(deals[order.invoiceNumber]);
        // okay, can create a new one then
        return this.dealService.createDeal(order);
      });
  }

  updateDealIdIfNeeded(order, dealId) {
    if (order.dealId) return Promise.resolve();

    order.dealId = dealId;
    return this.getOrdersCollection()
      .then(orders => orders.updateOne({ id: order.id }, {
        $set: {
          dealId
        }
      }));
  }

  updateDeal(order) {
    return this.getDealId(order)
      .then(dealId => this.updateDealIdIfNeeded(order, dealId)
        .then(() => this.dealService.updateDealStage(dealId, order))
        .then(() => order));
  }

  updateCompany(id, company) {
    return this.getOrdersCollection()
      .then(orders => orders.findOneAndUpdate({ id }, {
        $set: {
          store: company
        }
      }, { returnOriginal: false })
        .then(result => this.updateTotalsIfNeeded(orders, result.value))
        .then(order => this.updateDeal(order)
          .catch((err) => {
            logger.error('Failed to update deal because: ', err);
            return order;
          }))
        .then(() => company));
  }

  deleteOrder(id) {
    return this.getOrdersCollection()
      .then(orders => orders.removeOne({ id }));
  }

  getOrder(id) {
    return this.getOrdersCollection()
      .then(orders => orders.findOne({ id }))
      .then((order) => {
        order.totals = orderHelper.orderTotals(order, this.casesIndex, this.displays);
        return order;
      });
  }

  getShowOrders(name, year) {
    const showRangeMapping = {
      'January Expo': '01-01',
      'March Expo': '03-01',
      'April Expo': '04-01',
      'June Expo': '06-01',
      'August Expo': '07-15',
      'October Expo': '09-15'
    };
    const startDate = moment(`${year}-${showRangeMapping[name]}T00:00:00Z`).unix();
    const endDate = moment(`${year + 1}-${showRangeMapping[name]}T00:00:00Z`).unix();

    return this.getAllNotCancelled({ 'show.name': name, date: { $lt: endDate, $gte: startDate } });
  }

  getNextMonthOrders() {
    const endTime = moment().add(1, 'M').unix();
    return this.getAllNotCancelled({
      targetShipDate: { $exists: true, $lt: endTime },
      dealStage: 'Approved'
    });
  }

  getMonthOrders(month, year) {
    const formattedMonth = sprintf('%02d', month);
    const startDate = moment(`${year}-${formattedMonth}-01T00:00:00Z`);
    const startTime = startDate.unix();
    const endTime = moment(startDate).add(1, 'M').unix();

    return this.getAllNotCancelled({
      targetShipDate: { $exists: true, $gte: startTime, $lt: endTime },
      dealStage: 'Approved'
    });
  }

  getFromShipmentDateRange(startDate, endDate) {
    const startTime = moment(startDate).unix();
    const endTime = moment(endDate).unix();

    return this.getAllNotCancelled({
      $or: [
        {
          shippedDate: { $exists: true, $gte: startTime, $lt: endTime }
        },
        {
          shippedDate: { $exists: true, $gte: `${startTime}`, $lt: `${endTime}` }
        }
      ]
    });
  }

  getFromPaymentDateRange(startDate, endDate) {
    const startTime = moment(startDate).unix();
    const endTime = moment(endDate).unix();

    return this.getAllNotCancelled({
      $or: [
        {
          'payments.date': { $exists: true, $gte: startTime, $lt: endTime }
        },
        {
          'payments.date': { $exists: true, $gte: `${startTime}`, $lt: `${endTime}` }
        }
      ]
    });
  }

  getFromOrderDateRange(startTime, endTime) {
    const query = {
      $or: [
        {
          date: { $exists: true, $gte: startTime }
        },
        {
          date: { $exists: true, $gte: `${startTime}` }
        }
      ]
    };

    if (endTime > 0) {
      query.$or[0].date.$lt = endTime;
      query.$or[1].date.$lt = `${endTime}`;
    }

    return this.getAllNotCancelled(query);
  }

  getPendingCommissionOrders() {
    return this.getAllNotCancelled({
      $nor: [{ payments: { $exists: false } }, { payments: { $size: 0 } }],
      commissions: {
        $not: {
          $size: 2
        }
      }
    });
  }

  static getMongoQuery(query) {
    return _.isString(query) && query.length > 0 ? mongoQueryCompile(query) : query;
  }

  getAllNotCancelled(query, ageInput) {
    const oldOrdersTime = !ageInput && ageInput !== 0 ? 0 : moment().unix() - (24 * 60 * 60 * ageInput);

    const notCancelledQuery = {
      cancelled: { $not: { $exists: true, $nin: ['', null] } },
      $or: [
        { dealStage: { $in: ['Qualifying', 'Pending Approval', 'Approved'] } },
        {
          dealStage: { $in: ['Closed Won', 'Closed Lost'] },
          $or: [
            { 'payments.date': { $exists: true, $gt: oldOrdersTime } },
            { shippedDate: { $exists: true, $gt: oldOrdersTime } },
            { $or: [{ 'totals.owed': { $gt: 0.01 } }, { 'totals.owed': { $lt: -0.01 } }] }
          ]
        }
      ]
    };

    console.log('query: ', JSON.stringify(notCancelledQuery));
    const mongoQuery = OrderService.getMongoQuery(query);
    const finalQuery = mongoQuery ? { $and: [mongoQuery, notCancelledQuery] } : notCancelledQuery;
    return this.getAll(finalQuery);
  }

  getAll(query) {
    return this.getOrdersCollection()
      .then(orders => orders.find(OrderService.getMongoQuery(query)).toArray())
      .then((orderObjects) => {
        orderObjects.forEach((order) => {
          order.totals = orderHelper.orderTotals(order, this.casesIndex, this.displays);
          return order;
        });
        return orderObjects;
      });
  }
}
