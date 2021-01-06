// import _ from 'lodash';
import Joi from 'joi';
import Boom from 'boom';
import logger from '../../../logger';

import CrmService from '../../../service/CrmService';

export default () => ({
  method: 'GET',
  path: '/api/companies/{id}',
  config: {
    auth: {
      strategies: ['jwt'],
      scope: ['read:companies']
    },
    description: 'Get a specific company in the system.',
    tags: ['api'],
    validate: {
      params: Joi.object({
        id: Joi.number().required()
      })
    }
  },
  handler: async (req) => {
    const crmService = new CrmService(req.auth.credentials);
    try {
      return crmService.getCompany(req.params.id);
    } catch (e) {
      if (e.message) {
        logger.error('Error trying to get company data: ', e.message);
        logger.error(e.stack);
      } else {
        logger.error(e);
      }

      return Boom.wrap(e);
    }
  }
});
