import _ from 'lodash';
import Joi from 'joi';

import logger from '../../../logger';
import DbOrderService from '../../../service/OrderService';
import LabelService from '../../../service/LabelService';
import getOrderNeeds from '../../../helper/reports/orders';


export default () => ({
  method: 'GET',
  path: '/api/reports/show/{name}',
  config: {
    auth: {
      strategies: ['jwt'],
      scope: ['read:reports']
    },
    description: 'Get a report on a single show.',
    tags: ['api'],
    validate: {
      params: {
        name: Joi.string().max(100).required()
      }
    }
  },
  handler: (req, reply) => {
    const orderService = new DbOrderService(req.auth.credentials);
    const labelService = new LabelService();
    labelService.getAll()
      .then(labelUse =>
        orderService.getShowOrders(req.params.name)
          .then(orders => getOrderNeeds(labelUse, orders))
          .then(report => reply(_.merge({ showName: req.params.name }, report)))
      )
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
