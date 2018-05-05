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
      params: {
        id: Joi.string().guid().required()
      }
    }
  },
  handler: (req, reply) => {
    const service = new DbOrderService(req.auth.credentials.sub);
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
