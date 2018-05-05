import Joi from 'joi';

import logger from '../../../logger';
import DbOrderService from '../../../service/OrderService';

export default () => ({
  method: 'GET',
  path: '/api/reports/payments',
  config: {
    auth: {
      strategies: ['jwt'],
      scope: ['read:reports']
    },
    description: 'Get a report on all payments targeted for a date range.',
    tags: ['api'],
    validate: {
      query: {
        startDate: Joi.date().required(),
        endDate: Joi.date()
      }
    }
  },
  handler: (req, reply) => {
    const orderService = new DbOrderService(req.auth.credentials.sub);

    orderService.getFromPaymentDateRange(req.query.startDate, req.query.endDate)
      .then(orders => reply(orders))
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
