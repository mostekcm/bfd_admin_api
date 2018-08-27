import Boom from 'boom';
import Joi from 'joi';
import patchOrderSchema from '../schemas/patch_order';
import logger from '../../../logger';
import DbOrderService from '../../../service/OrderService';

export default () => ({
  method: 'PATCH',
  path: '/api/orders/{id}',
  config: {
    auth: {
      strategies: ['jwt'],
      scope: ['update:orders']
    },
    description: 'Patch an order',
    tags: ['api'],
    validate: {
      params: {
        id: Joi.string().guid().required()
      },
      payload: patchOrderSchema
    }
  },
  handler: (req, reply) => {
    const service = new DbOrderService(req.auth.credentials);
    const newOrderAttributes = req.payload;
    logger.info('patching order: ', JSON.stringify(newOrderAttributes));
    service.patchOrder(req.params.id, newOrderAttributes)
      .then(newOrder => reply(newOrder))
      .catch((e) => {
        logger.error(e.message);
        logger.error(e.message);
        logger.error(e.stack);
        return reply(Boom.wrap(e));
      });
  }
});
