import _ from 'lodash';

import logger from '../../../logger';
import OrderService from '../../../service/OrderService';
import * as orderHelper from '../../../helper/order';

export default () => ({
  method: 'GET',
  path: '/api/reports/commission/due/{name}',
  config: {
    auth: {
      strategies: ['jwt'],
      scope: ['read:reports']
    },
    description: 'Get a report on what commission is due.',
    tags: ['api'],
    validate: {}
  },
  handler: (req, reply) => {
    const orderService = new OrderService();
    orderService.getPendingCommissionOrders()
      .then((orders) => {
        const orderMap = {};
        orders.forEach((order) => {
          const orderTotals = orderHelper.orderTotals(order);
          if (req.params.name === 'jes' && orderTotals.dueJes === 0) return;
          if (req.params.name === 'max' && orderTotals.commissionDue === 0) return;
          if (!(order.salesRep.name in orderMap)) orderMap[order.salesRep.name] = { totalCommissionBase: 0.0, totalCommissionDue: 0.0, orders: [] };
          const thisOrderInfo = orderMap[order.salesRep.name];
          thisOrderInfo.totalCommissionBase += orderTotals.commissionBase;
          if (req.params.name === 'jes') {
            thisOrderInfo.totalCommissionDue += orderTotals.dueJes;
            orderTotals.commissionDue = orderTotals.dueJes;
            orderTotals.commissionMultiplier = orderTotals.jesMultiplier;
          } else {
            thisOrderInfo.totalCommissionDue += orderTotals.commissionDue;
          }

          thisOrderInfo.orders.push({
            totals: orderTotals,
            show: order.show,
            date: order.date,
            finalPayment: _.maxBy(order.payments, o => o.date),
            store: order.store
          });
        });

        const orderInfo = [];
        Object.keys(orderMap).forEach(key => orderInfo.push(_.merge({ salesRep: { name: key } }, orderMap[key])));
        reply(orderInfo);
      })
      .catch((e) => {
        if (e.message) {
          logger.error('Error trying to get commission report data: ', e.message);
          logger.error(e.stack);
        } else {
          logger.error(e);
        }

        return reply({
          statusCode: 500,
          error: 'Internal Configuration Error',
          message: e.message ? e.message : e
        });
      });
  }
});
