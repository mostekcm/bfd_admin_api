import _ from 'lodash';
import Joi from 'joi';
import logger from '../../../logger';
import OrderService from '../../../service/OrderService';

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
    console.debug("Carlos you are in get orders");
    const orderService = new OrderService();
    orderService.getAll()
      .then(orders => reply(_.values(orders)))
      .catch((e) => {
        if (e.message) {
          logger.error('Error trying to get orders data: ', e.message);
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
