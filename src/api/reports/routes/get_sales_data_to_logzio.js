import logzio from 'logzio-nodejs';
import config from '../../../config';
import logger from '../../../logger';
import DbOrderService from '../../../service/OrderService';

export default () => ({
  method: 'GET',
  path: '/api/reports/sales_to_logzio',
  config: {
    auth: {
      strategies: ['jwt'],
      scope: ['read:reports']
    },
    description: 'Get sales data to logzio.',
    tags: ['api']
  },
  handler: async (req) => {
    const orderService = new DbOrderService(req.auth.credentials);
    try {
      const orders = await orderService.getAllNotCancelled();
      const logzioLogger = logzio.createLogger({
        token: config('LOGZIO_TOKEN'),
        host: 'listener.logz.io',
        type: 'nodejs' // OPTIONAL (If none is set, it will be 'nodejs')
      });

      orders.forEach((order) => {
        if (order.shippedDate) {
          order.lineItems.forEach((lineItem) => {
            logzioLogger.log({
              shippedDate: order.shippedDate,
              isoDate: new Date(order.shippedDate * 1000).toISOString(),
              '@timestamp': new Date(order.shippedDate * 1000).toISOString(),
              storeName: order.store.name,
              lineItemName: lineItem.sku.product.name,
              lineItemVariety: lineItem.sku.variety,
              lineItemSize: lineItem.sku.size,
              quantity: Math.round(lineItem.size * lineItem.quantity)
            });
          });
        }
      });

      return { message: 'success' };
    } catch (e) {
      if (e.message) {
        logger.error('Error trying to get order data: ', e.message);
        logger.error(e.stack);
      } else {
        logger.error(e);
      }

      return {
        statusCode: 500,
        error: 'Internal Configuration Error',
        message: e.message ? e.message : e
      };
    }
  }
});
