import GoogleSpreadsheet from 'google-spreadsheet';
import Promise from 'bluebird';

import config from '../config';
import logger from '../logger';
import CaseRepository from '../models/CaseRepository';
import SkuRepository from '../models/SkuRepository';

export default class CaseService {
  constructor() {
    /* Grab cases from the google sheet */
    // TODO: Do caching for this
    // TODO: Move this to a provider pattern
    // spreadsheet key is the long id in the sheets URL
    this.doc = new GoogleSpreadsheet(config('CONFIG_SHEET'));
    this.useServiceAccountAuth = Promise.promisify(this.doc.useServiceAccountAuth, { context: this.doc });
    this.getInfo = Promise.promisify(this.doc.getInfo, { context: this.doc });
    this.caseRepo = null;
  }

  getAll() {
    const me = this;
    if (this.caseRepo != null) return new Promise(resolve => resolve(this.caseRepo.getAll()));

    return this.useServiceAccountAuth(JSON.parse(config('BFD_SERVICE_ACCOUNT_CREDS')))
      .then(() => me.getInfo())
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
          .then((caseRepo) => {
            me.caseRepo = caseRepo;
            return caseRepo.getAll();
          })
          .catch(err => Promise.reject(err));
      });
  }
}
