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
  handler: (req, reply) => {
    const service = new DbOrderService(req.auth.credentials.sub);
    const order = req.payload;
    logger.info('adding new order: ', JSON.stringify(order));
    const crmService = new CrmService(req.auth.credentials.sub);
    const getCompanyPromise = order.store.id ? crmService.getCompany(order.store.id) :
      Promise.resolve(order.store);

    getCompanyPromise
      .then((store) => {
        order.store = store;
        return service.addOrder(order)
          .then(newOrder => reply(newOrder));
      })
      .catch((e) => {
        logger.error(e.message);
        logger.error(e.message);
        logger.error(e.stack);
        return reply(Boom.wrap(e));
      });
  }
});
