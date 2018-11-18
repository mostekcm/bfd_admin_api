import _ from 'lodash';

import logger from '../../../logger';
import OrderService from '../../../service/OrderService';

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
    const orderService = new OrderService(req.auth.credentials);
    orderService.getPendingCommissionOrders()
      .then((orders) => {
        const orderMap = {};
        orders.forEach((order) => {
          const commissionInfo = _(order.totals.commissionInfo).filter(info => info.payee === req.params.name).value();

          /* Exit early if commission is not due */
          if (commissionInfo.length === 0 || commissionInfo[0].due <= 0) return;
          if (commissionInfo.length > 1) throw new Error(`Bad commission information for order (${order.id})`);

          if (!(order.salesRep.name in orderMap)) orderMap[order.salesRep.name] = { totalCommissionBase: 0.0, totalCommissionDue: 0.0, orders: [] };
          const thisOrderInfo = orderMap[order.salesRep.name];
          thisOrderInfo.totalCommissionBase += order.totals.commissionBase;
          thisOrderInfo.totalCommissionDue += commissionInfo[0].due;

          thisOrderInfo.orders.push({
            id: order.id,
            commissions: order.commissions,
            commissionInfo: order.totals.commissionInfo,
            commissionBase: order.totals.commissionBase,
            commission: commissionInfo[0],
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
