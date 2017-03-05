// import _ from 'lodash';
import orderSchema from '../schemas/order';
// import GoogleSpreadsheet from 'google-spreadsheet';
// import Promise from 'bluebird';
// import config from '../../../config';
import logger from '../../../logger';

export default () => ({
  method: 'POST',
  path: '/api/orders/',
  config: {
    auth: {
      strategies: ['jwt'],
      scope: ['create:orders']
    },
    description: 'Get all orders in the system.',
    tags: ['api'],
    validate: {
      payload: orderSchema
    }
  },
  handler: (req, reply) => {
    const order = req.payload;
    logger.info('Carlos order: ', JSON.stringify(order));
    reply(order);
  }
});
