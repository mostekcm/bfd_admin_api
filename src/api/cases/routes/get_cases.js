// import _ from 'lodash';
import Joi from 'joi';
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
      query: {
        q: Joi.string().max(1000).allow('').default(''),
        field: Joi.string().max(1000).allow('').default('')
      }
    }
  },
  handler: (req, reply) => {
    const caseService = new CaseService();
    caseService.getAll()
      .then(cases => reply(cases))
      .catch((e) => {
        if (e.message) {
          logger.error('Error trying to get cases data: ', e.message);
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
