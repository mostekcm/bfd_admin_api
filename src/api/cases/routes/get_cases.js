// import _ from 'lodash';
import Joi from 'joi';
import GoogleSpreadsheet from 'google-spreadsheet';
import Promise from 'bluebird';
import config from '../../../config';
import logger from '../../../logger';

import SkuRepository from '../../../models/sku_repository';
import CaseRepository from '../../../models/case_repository';

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
    /* Grab cases from the google sheet */
    // spreadsheet key is the long id in the sheets URL
    const doc = new GoogleSpreadsheet('1u_uTiO5kxHmBsbf1YbKocn18ZSzRwge9xF1ZRFEGvF0');
    const useServiceAccountAuth = Promise.promisify(doc.useServiceAccountAuth, { context: doc });
    const getInfo = Promise.promisify(doc.getInfo, { context: doc });

    useServiceAccountAuth(config('BFD_SERVICE_ACCOUNT_CREDS'))
      .then(() => getInfo())
      .then((info) => {
        logger.debug('Loaded doc!');

        const casesSheet = info.worksheets[0];
        if (!casesSheet || casesSheet.title !== 'Cases') {
          const e = new Error(`Bad skus sheet: ${casesSheet ? casesSheet.title : 'none found'}`);
          return Promise.reject(e);
        }

        const skusSheet = info.worksheets[1];
        if (!skusSheet || skusSheet.title !== 'Skus') {
          const e = new Error(`Bad skus sheet: ${skusSheet ? skusSheet.title : 'none found'}`);
          return Promise.reject(e);
        }

        return SkuRepository.create(skusSheet)
          .then(skuRepo => CaseRepository.createFromSheet(casesSheet, skuRepo))
          .then(caseRepo => reply(caseRepo.getAll()))
          .catch(err => Promise.reject(err));
      })
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
