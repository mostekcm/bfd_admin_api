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
      params: {
        id: Joi.number().required()
      }
    }
  },
  handler: (req, reply) => {
    const crmService = new CrmService(req.auth.credentials.sub);
    crmService.getCompany(req.params.id)
      .then(company => reply(company))
      .catch((e) => {
        if (e.message) {
          logger.error('Error trying to get company data: ', e.message);
          logger.error(e.stack);
        } else {
          logger.error(e);
        }

        return reply(Boom.wrap(e));
      });
  }
});
