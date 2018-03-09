import Joi from 'joi';
import Boom from 'boom';
import logger from '../../../logger';
import DbOrderService from '../../../service/DbOrderService';

export default () => ({
  method: 'GET',
  path: '/api/orders',
  config: {
    auth: {
      strategies: ['jwt'],
      scope: ['read:orders']
    },
    description: 'Get all orders in the system.',
    tags: ['api'],
    validate: {
      query: {
        search: Joi.string().max(1000).allow('').default(''),
        page: Joi.number().integer().min(0).max(1000)
      }
    }
  },
  handler: (req, reply) => {
    logger.debug('Getting orders with query: ', req.query.search);
    const orderService = new DbOrderService();
    orderService.getAllNotCancelled(req.query.search)
      .then(orders => reply(orders))
      .catch((e) => {
        if (e.message) {
          logger.error('Error trying to get orders data: ', e.message);
          logger.error(e.stack);
        } else {
          logger.error(e);
        }

        return reply(Boom.wrap(e));
      });
  }
});
