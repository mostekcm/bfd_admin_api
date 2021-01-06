import Boom from 'boom';
import Joi from 'joi';
import logger from '../../../logger';
import DbOrderService from '../../../service/OrderService';

export default () => ({
  method: 'DELETE',
  path: '/api/orders/{id}',
  config: {
    auth: {
      strategies: ['jwt'],
      scope: ['delete:orders']
    },
    description: 'Get all orders in the system.',
    tags: ['api'],
    validate: {
      params: Joi.object({
        id: Joi.string().guid().required()
      })
    }
  },
  handler: async (req) => {
    const service = new DbOrderService(req.auth.credentials);
    logger.warn('deleting order: ', req.params.id);
    try {
      await service.deleteOrder(req.params.id);
      return { id: req.params.id };
    } catch (e) {
      logger.error(e.message);
      logger.error(e.stackTrace);
      return Boom.wrap(e);
    }
  }
});
