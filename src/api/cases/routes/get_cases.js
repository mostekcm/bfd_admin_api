// import _ from 'lodash';
import Joi from 'joi';
import Boom from 'boom';
import logger from '../../../logger';

import CaseService from '../../../service/CaseService';

export default () => ({
  method: 'GET',
  path: '/api/cases',
  config: {
    auth: {
      strategies: ['jwt'],
      scope: ['read:cases']
    },
    description: 'Get all cases in the system.',
    tags: ['api'],
    validate: {
      query: Joi.object({
        q: Joi.string().max(1000).allow('').default(''),
        field: Joi.string().max(1000).allow('').default('')
      })
    }
  },
  handler: async () => {
    const caseService = new CaseService();
    try {
      return caseService.getAll();
    } catch (e) {
      if (e.message) {
        logger.error('Error trying to get cases data: ', e.message);
        logger.error(e.stack);
      } else {
        logger.error(e);
      }

      return Boom.wrap(e);
    }
  }
});
