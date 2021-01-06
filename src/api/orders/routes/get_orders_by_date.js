import Joi from 'joi';
import Boom from 'boom';
import logger from '../../../logger';
import OrderService from '../../../service/OrderService';

export default () => ({
  method: 'GET',
  path: '/api/orders/date',
  config: {
    auth: {
      strategies: ['jwt'],
      scope: ['read:orders']
    },
    description: 'Get all orders in the system.',
    tags: ['api'],
    validate: {
      query: Joi.object({
        from: Joi.number().integer().min(0).default(0),
        to: Joi.number().integer().min(0).default(0)
      })
    }
  },
  handler: async (req) => {
    logger.debug('Getting orders with dates: ', req.query.from, req.query.to);
    const orderService = new OrderService(req.auth.credentials);
    try {
      return orderService.getFromOrderDateRange(req.query.from, req.query.to);
    } catch (e) {
      if (e.message) {
        logger.error('Error trying to get orders data: ', e.message);
        logger.error(e.stack);
      } else {
        logger.error(e);
      }

      return Boom.wrap(e);
    }
  }
});
