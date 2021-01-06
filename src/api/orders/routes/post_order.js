import Boom from 'boom';
import orderSchema from '../schemas/order';
import logger from '../../../logger';
import DbOrderService from '../../../service/OrderService';
import CrmService from '../../../service/CrmService';

export default () => ({
  method: 'POST',
  path: '/api/orders/',
  config: {
    auth: {
      strategies: ['jwt'],
      scope: ['create:orders']
    },
    description: 'Create a new order..',
    tags: ['api'],
    validate: {
      payload: orderSchema
    }
  },
  handler: async (req) => {
    const service = new DbOrderService(req.auth.credentials);
    const order = req.payload;
    logger.info('adding new order: ', JSON.stringify(order));
    const crmService = new CrmService(req.auth.credentials);
    try {
      order.store = order.store.id ? await crmService.getCompany(order.store.id) :
        order.store;
      return service.addOrder(order);
    } catch (e) {
      logger.error(e.message);
      logger.error(e.stack);
      return Boom.wrap(e);
    }
  }
});
