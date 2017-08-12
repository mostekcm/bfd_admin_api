import _ from 'lodash';
import Joi from 'joi';
import moment from 'moment';

import logger from '../../../logger';
import DbOrderService from '../../../service/DbOrderService';
import LabelService from '../../../service/LabelService';
import getOrderNeeds from '../../../helper/reports/orders';

export default () => ({
  method: 'GET',
  path: '/api/reports/month/{month}',
  config: {
    auth: {
      strategies: ['jwt'],
      scope: ['read:reports']
    },
    description: 'Get a report on all orders targeted for a month.',
    tags: ['api'],
    validate: {
      params: {
        month: Joi.number().min(0).max(12).required(),
        year: Joi.number().min(2016).max(3000)
      }
    }
  },
  handler: (req, reply) => {
    const labelService = new LabelService();
    const orderService = new DbOrderService();

    const year = req.params.year || parseInt(moment().format('YYYY'), 10);

    labelService.getAll()
      .then((labelUse) => {
        const getPromise = req.params.month === 0 ? orderService.getNextMonthOrders() : orderService.getMonthOrders(req.params.month, year);
        return getPromise
          .then(orders => getOrderNeeds(labelUse, orders))
          .then(report => reply(_.merge({ month: `${req.params.month}/${year}` }, report)));
      })
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
