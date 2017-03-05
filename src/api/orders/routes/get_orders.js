// import _ from 'lodash';
import Joi from 'joi';
// import GoogleSpreadsheet from 'google-spreadsheet';
// import Promise from 'bluebird';
// import config from '../../../config';
// import logger from '../../../logger';

export default () => ({
  method: 'GET',
  path: '/api/orders',
  config: {
    auth: {
      strategies: ['jwt'],
      scope: ['read:orders']
    },
    description: 'Get all orders in the system.',
    tags: ['api'],
    validate: {
      query: {
        search: Joi.string().max(1000).allow('').default(''),
        page: Joi.number().integer().min(0).max(1000)
      }
    }
  },
  handler: (req, reply) => {
    reply([
      {
        orderId: '1234ABCD'
      },
      {
        orderId: '1235ABCD'
      }
    ]);
  }
});
