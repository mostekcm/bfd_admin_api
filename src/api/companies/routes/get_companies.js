// import _ from 'lodash';
import Joi from 'joi';
import Boom from 'boom';
import logger from '../../../logger';

import CrmService from '../../../service/CrmService';

export default () => ({
  method: 'GET',
  path: '/api/companies',
  config: {
    auth: {
      strategies: ['jwt'],
      scope: ['read:companies']
    },
    description: 'Get all companies in the system.',
    tags: ['api'],
    validate: {
      query: {
        q: Joi.string().max(1000).allow('').default(''),
        field: Joi.string().max(1000).allow('').default('')
      }
    }
  },
  handler: async (req) => {
    const crmService = new CrmService(req.auth.credentials);
    return crmService.getCompanies()
      .catch((e) => {
        if (e.message) {
          logger.error('Error trying to get companies data: ', e.message);
          logger.error(e.stack);
        } else {
          logger.error(e);
        }

        return Boom.wrap(e);
      });
  }
});
