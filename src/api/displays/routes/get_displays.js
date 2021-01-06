// import _ from 'lodash';
import Joi from 'joi';
import Boom from 'boom';
import logger from '../../../logger';

import DisplayService from '../../../service/DisplayService';

export default () => ({
  method: 'GET',
  path: '/api/displays',
  config: {
    auth: {
      strategies: ['jwt'],
      scope: ['read:displays']
    },
    description: 'Get all displays in the system.',
    tags: ['api'],
    validate: {
      query: Joi.object({
        q: Joi.string().max(1000).allow('').default(''),
        field: Joi.string().max(1000).allow('').default('')
      })
    }
  },
  handler: async () => {
    const displayService = new DisplayService();
    try {
      return displayService.getAll();
    } catch (e) {
      if (e.message) {
        logger.error('Error trying to get displays data: ', e.message);
        logger.error(e.stack);
      } else {
        logger.error(e);
      }

      return Boom.wrap(e);
    }
  }
});
