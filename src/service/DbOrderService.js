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

export default class DbOrderService {
  constructor() {
    // TODO: Do caching for this
    // TODO: Move this to a provider pattern
    this.db = null;
    this.casesIndex = null;
    this.displays = null;

    this.allowedDealStages = ['Qualifying', 'Pending Approval', 'Approved', 'Closed Won', 'Closed Lost'];
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
          { $inc: { seq: 1 } })
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

          return orders.insertOne(order)
            .then(() => {
              logger.debug(`inserted new order: ${JSON.stringify(order)}`);
              // TODO: Push deal to hubSpo
              order.totals = orderHelper.orderTotals(order, this.casesIndex, this.displays);
              return order;
            });
        })
      );
  }

  patchOrder(id, newOrderAttributes) {
    if (newOrderAttributes.shippedDate) {
      newOrderAttributes.dealStage = 'Closed Won';
    }

    return this.getOrdersCollection()
      .then(orders => orders.updateOne({ id }, { $set: newOrderAttributes }))
      .then((retVal) => {
        if (newOrderAttributes.dealStage) {
          // TODO: Push deal to hubSpot
        }

        return retVal;
      });
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

  getShowOrders(name) {
    return this.getAllNotCancelled({ 'show.name': name });
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

  getAllNotCancelled(query) {
    const notCancelledQuery = { cancelled: { $not: { $exists: true, $nin: ['', null] } } };
    const mongoQuery = DbOrderService.getMongoQuery(query);
    const finalQuery = mongoQuery ? { $and: [mongoQuery, notCancelledQuery] } : notCancelledQuery;
    return this.getAll(finalQuery);
  }

  getAll(query) {
    return this.getOrdersCollection()
      .then(orders => orders.find(DbOrderService.getMongoQuery(query)).toArray())
      .then((orderObjects) => {
        orderObjects.forEach((order) => {
          order.totals = orderHelper.orderTotals(order, this.casesIndex, this.displays);
          return order;
        });
        return orderObjects;
      });
  }
}
