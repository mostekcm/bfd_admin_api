import Boom from 'boom';
import orderSchema from '../schemas/order';
import logger from '../../../logger';
import DbOrderService from '../../../service/DbOrderService';
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
    const service = new DbOrderService();
    const order = req.payload;
    logger.info('adding new order: ', JSON.stringify(order));
    const crmService = new CrmService();
    const getCompanyPromise = order.store.id ? crmService.getCompany(req.auth.credentials.sub, order.store.id) :
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
