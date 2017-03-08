import Joi from 'joi';

import logger from '../../../logger';
import OrderService from '../../../service/OrderService';

export default () => ({
  method: 'GET',
  path: '/api/orders/{id}',
  config: {
    auth: {
      strategies: ['jwt'],
      scope: ['read:orders']
    },
    description: 'Get a single order based on its unique identifier.',
    tags: ['api'],
    validate: {
      params: {
        id: Joi.string().guid().required()
      }
    }
  },
  handler: (req, reply) => {
    const orderService = new OrderService();
    orderService.getOrder(req.params.id)
      .then(order => reply(order))
      .catch((e) => {
        if (e.message) {
          logger.error('Error trying to get order data: ', e.message);
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
