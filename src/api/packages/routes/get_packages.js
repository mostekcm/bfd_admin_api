// import _ from 'lodash';
import Joi from 'joi';
import Boom from 'boom';
import logger from '../../../logger';

import PackageService from '../../../service/PackageService';

export default () => ({
  method: 'GET',
  path: '/api/packages',
  config: {
    auth: {
      strategies: ['jwt'],
      scope: ['read:cases']
    },
    description: 'Get all packages in the system.',
    tags: ['api'],
    validate: {
      query: {
        q: Joi.string().max(1000).allow('').default(''),
        field: Joi.string().max(1000).allow('').default('')
      }
    }
  },
  handler: async () => {
    const packageService = new PackageService();
    return packageService.getAll()
      .catch((e) => {
        if (e.message) {
          logger.error('Error trying to get packages data: ', e.message);
          logger.error(e.stack);
        } else {
          logger.error(e);
        }

        return Boom.wrap(e);
      });
  }
});
