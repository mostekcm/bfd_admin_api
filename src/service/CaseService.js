import { GoogleSpreadsheet } from 'google-spreadsheet';
import moment from 'moment';

import config from '../config';
import logger from '../logger';
import CaseRepository from '../models/CaseRepository';
import SkuRepository from '../models/SkuRepository';

let caseRepo = null;
let lastUpdate = null;

export default class CaseService {
  constructor() {
    /* Grab cases from the google sheet */
    // TODO: Do caching for this
    // TODO: Move this to a provider pattern
    // spreadsheet key is the long id in the sheets URL
    this.doc = new GoogleSpreadsheet(config('CONFIG_SHEET'));
  }

  async getAll() {
    const cacheAge = lastUpdate ? moment().unix() - lastUpdate : 0;
    if (caseRepo !== null && cacheAge < 60) {
      logger.debug('Using cache because cacheAge: ', cacheAge);
      return caseRepo.getAll();
    }

    if (caseRepo !== null) logger.info('Updating case cache: ', cacheAge);

    await this.doc.useServiceAccountAuth(JSON.parse(config('BFD_SERVICE_ACCOUNT_CREDS')));
    await this.doc.loadInfo();
    logger.debug('Loaded doc!');

    const casesSheet = this.doc.sheetsByIndex[0];
    if (!casesSheet || casesSheet.title !== 'Cases') {
      throw new Error(`Bad skus sheet: ${casesSheet ? casesSheet.title : 'none found'}`);
    }

    const skusSheet = this.doc.sheetsByIndex[1];
    if (!skusSheet || skusSheet.title !== 'Skus') {
      throw new Error(`Bad skus sheet: ${skusSheet ? skusSheet.title : 'none found'}`);
    }

    console.log('carlos creating skurepo');
    const skuRepo = await SkuRepository.create(skusSheet);
    console.log('carlos creating caserepo');
    const caseRepoInstance = await CaseRepository.createFromSheet(casesSheet, skuRepo);
    lastUpdate = moment().unix();
    caseRepo = caseRepoInstance;
    console.log('carlos getting all');
    return caseRepoInstance.getAll();
  }
}
