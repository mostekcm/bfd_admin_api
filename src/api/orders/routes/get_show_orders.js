import moment from 'moment';
import Joi from 'joi';

import logger from '../../../logger';
import DbOrderService from '../../../service/OrderService';

export default () => ({
  method: 'GET',
  path: '/api/orders/show/{name}/{year}',
  config: {
    auth: {
      strategies: ['jwt'],
      scope: ['read:reports']
    },
    description: 'Get a report on a single show for max.',
    tags: ['api'],
    validate: {
      params: {
        name: Joi.string().max(100).required(),
        year: Joi.number().min(2017).max(moment().year()).required()
      }
    }
  },
  handler: (req, h) => {
    const orderService = new DbOrderService(req.auth.credentials);
    orderService.getShowOrders(req.params.name, req.params.year)
      .then(orders => h.response(orders))
      .catch((e) => {
        if (e.message) {
          logger.error('Error trying to get order data: ', e.message);
          logger.error(e.stack);
        } else {
          logger.error(e);
        }

        return h.response({
          statusCode: 500,
          error: 'Internal Configuration Error',
          message: e.message ? e.message : e
        });
      });
  }
});
