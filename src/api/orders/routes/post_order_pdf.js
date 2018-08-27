// import Boom from 'boom';
// import moment from 'moment';
// import fs from 'fs';
import Joi from 'joi';
import logger from '../../../logger';
// import DbOrderService from '../../../service/OrderService';
// import CrmService from '../../../service/CrmService';


export default () => ({
  method: 'POST',
  path: '/api/orders/{id}/pdf',
  config: {
    auth: {
      strategies: ['jwt'],
      scope: ['update:orders']
    },
    description: 'Save PDF for this order',
    tags: ['api'],
    payload: {
      maxBytes: 100000000
    },
    validate: {
      params: {
        id: Joi.string().guid().required()
      },
      payload: {
        pdf: Joi.binary().required().max(100000000)
      }
    }
  },
  handler: (req, reply) => {
    // const service = new DbOrderService(req.auth.credentials);
    logger.info(`Posting PDF for order ${req.params.id}`);
    // const crmService = new CrmService(req.auth.credentials);

    // service.getOrder(req.params.id)
    //   .then((order) => {
    //       });
    //   })
    //   .catch((e) => {
    //     logger.error(e.message);
    //     logger.error(e.message);
    //     logger.error(e.stack);
    //     return reply(Boom.wrap(e));
    //   });
    return reply({});
  }
});
