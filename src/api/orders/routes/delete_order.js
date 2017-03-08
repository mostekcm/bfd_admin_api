import Boom from 'boom';
import Joi from 'joi';
import logger from '../../../logger';
import OrderService from '../../../service/OrderService';

export default () => ({
  method: 'DELETE',
  path: '/api/orders/{id}',
  config: {
    auth: {
      strategies: ['jwt'],
      scope: ['create:orders']
    },
    description: 'Get all orders in the system.',
    tags: ['api'],
    validate: {
      params: {
        id: Joi.string().guid().required()
      }
    }
  },
  handler: (req, reply) => {
    const service = new OrderService();
    logger.warn('deleting order: ', req.params.id);
    service.deleteOrder(req.params.id)
      .then(() => reply({ id: req.params.id }))
      .catch((e) => {
        logger.error(e.message);
        logger.error(e.stackTrace);
        return reply(Boom.wrap(e));
      });
  }
});