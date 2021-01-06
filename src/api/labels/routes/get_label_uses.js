// import _ from 'lodash';
import Joi from 'joi';
import Boom from 'boom';
import logger from '../../../logger';

import LabelService from '../../../service/LabelService';

export default () => ({
  method: 'GET',
  path: '/api/labels',
  config: {
    auth: {
      strategies: ['jwt'],
      scope: ['read:labels']
    },
    description: 'Get all labels in the system.',
    tags: ['api'],
    validate: {
      query: Joi.object({
        q: Joi.string().max(1000).allow('').default(''),
        field: Joi.string().max(1000).allow('').default('')
      })
    }
  },
  handler: async () => {
    const labelService = new LabelService();
    try {
      return labelService.getAll();
    } catch (e) {
      if (e.message) {
        logger.error('Error trying to get labels data: ', e.message);
        logger.error(e.stack);
      } else {
        logger.error(e);
      }

      return Boom.wrap(e);
    }
  }
});
