import Joi from 'joi';
import Boom from 'boom';

import logger from '../../../logger';
import DbOrderService from '../../../service/OrderService';

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
      params: Joi.object({
        id: Joi.string().guid().required()
      })
    }
  },
  handler: async (req) => {
    const orderService = new DbOrderService(req.auth.credentials);
    try {
      return orderService.getOrder(req.params.id);
    } catch (e) {
      if (e.message) {
        logger.error('Error trying to get order data: ', e.message);
        logger.error(e.stack);
      } else {
        logger.error(e);
      }

      return Boom.wrap(e);
    }
  }
});
