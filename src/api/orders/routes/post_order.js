import Boom from 'boom';
import orderSchema from '../schemas/order';
import logger from '../../../logger';
import OrderService from '../../../service/OrderService';

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
    const service = new OrderService();
    const order = req.payload;
    logger.info('adding new order: ', JSON.stringify(order));
    service.addOrder(order)
      .then(newOrder => reply(newOrder))
      .catch((e) => {
        logger.error(e.message);
        logger.error(e.message);
        logger.error(e.stack);
        return reply(Boom.wrap(e));
      });
  }
});
