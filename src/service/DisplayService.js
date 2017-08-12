import GoogleSpreadsheet from 'google-spreadsheet';
import Promise from 'bluebird';
import moment from 'moment';

import config from '../config';
import logger from '../logger';
import DisplayRepository from '../models/DisplayRepository';
import SkuRepository from '../models/SkuRepository';

let displayRepo = null;
let lastUpdate = null;

export default class DisplayService {
  constructor() {
    /* Grab displays from the google sheet */
    // TODO: Move this to a provider pattern
    // spreadsheet key is the long id in the sheets URL
    this.doc = new GoogleSpreadsheet(config('CONFIG_SHEET'));
    this.useServiceAccountAuth = Promise.promisify(this.doc.useServiceAccountAuth, { context: this.doc });
    this.getInfo = Promise.promisify(this.doc.getInfo, { context: this.doc });
  }

  getAll() {
    const me = this;
    const cacheAge = lastUpdate ? moment().unix() - lastUpdate : 0;
    if (displayRepo !== null && cacheAge < 60) {
      logger.debug('Using display cache because cacheAge: ', cacheAge);
      return new Promise(resolve => resolve(displayRepo.getAll()));
    }

    if (displayRepo !== null) logger.info('Updating display cache: ', cacheAge);

    return this.useServiceAccountAuth(JSON.parse(config('BFD_SERVICE_ACCOUNT_CREDS')))
      .then(() => me.getInfo())
      .then((info) => {
        logger.debug('Loaded display doc!');

        const displaysSheet = info.worksheets[2];
        if (!displaysSheet || displaysSheet.title !== 'Displays') {
          const e = new Error(`Bad skus sheet: ${displaysSheet ? displaysSheet.title : 'none found'}`);
          return Promise.reject(e);
        }

        const skusSheet = info.worksheets[1];
        if (!skusSheet || skusSheet.title !== 'Skus') {
          const e = new Error(`Bad skus sheet: ${skusSheet ? skusSheet.title : 'none found'}`);
          return Promise.reject(e);
        }

        return SkuRepository.create(skusSheet)
          .then(skuRepo => DisplayRepository.createFromSheet(displaysSheet, skuRepo)
            .then((displayRepoInstance) => {
              lastUpdate = moment().unix();
              displayRepo = displayRepoInstance;
              return displayRepo.getAll();
            }))
          .catch(err => Promise.reject(err));
      });
  }
}
