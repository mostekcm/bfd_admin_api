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
      params: Joi.object({
        id: Joi.string().guid().required()
      }),
      payload: patchOrderSchema
    }
  },
  handler: async (req) => {
    const service = new DbOrderService(req.auth.credentials);
    const newOrderAttributes = req.payload;
    logger.info('patching order: ', JSON.stringify(newOrderAttributes));
    try {
      return service.patchOrder(req.params.id, newOrderAttributes);
    } catch (e) {
      logger.error(e.message);
      logger.error(e.stack);
      return Boom.wrap(e);
    }
  }
});
