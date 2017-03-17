// import _ from 'lodash';
import Joi from 'joi';
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
      query: {
        q: Joi.string().max(1000).allow('').default(''),
        field: Joi.string().max(1000).allow('').default('')
      }
    }
  },
  handler: (req, reply) => {
    const labelService = new LabelService();
    labelService.getAll()
      .then(labels => reply(labels))
      .catch((e) => {
        if (e.message) {
          logger.error('Error trying to get labels data: ', e.message);
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
