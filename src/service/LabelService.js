import GoogleSpreadsheet from 'google-spreadsheet';
import Promise from 'bluebird';
import moment from 'moment';

import config from '../config';
import logger from '../logger';
import LabelRepository from '../models/LabelRepository';

let labelRepo = null;
let lastUpdate = null;
export default class LabelService {
  constructor() {
    /* Grab labels from the google sheet */
    // TODO: Do caching for this
    // TODO: Move this to a provider pattern
    // spreadsheet key is the long id in the sheets URL
    this.doc = new GoogleSpreadsheet(config('CONFIG_SHEET'));
    this.useServiceAccountAuth = Promise.promisify(this.doc.useServiceAccountAuth, { context: this.doc });
    this.getInfo = Promise.promisify(this.doc.getInfo, { context: this.doc });
    this.labelRepo = null;
  }

  getAll() {
    const me = this;
    const cacheAge = lastUpdate ? moment().unix() - lastUpdate : 0;
    if (labelRepo !== null && cacheAge < 60) {
      logger.debug('Using label cache because cacheAge: ', cacheAge);
      return new Promise(resolve => resolve(labelRepo.getAll()));
    }

    if (labelRepo !== null) logger.info('Updating label cache: ', cacheAge);

    return this.useServiceAccountAuth(JSON.parse(config('BFD_SERVICE_ACCOUNT_CREDS')))
      .then(() => me.getInfo())
      .then((info) => {
        logger.debug('Loaded labels doc!');

        const labelsSheet = info.worksheets[4];
        if (!labelsSheet || labelsSheet.title !== 'Labels') {
          const e = new Error(`Bad labels sheet: ${labelsSheet ? labelsSheet.title : 'none found'}`);
          return Promise.reject(e);
        }

        const labelUseSheet = info.worksheets[3];
        if (!labelUseSheet || labelUseSheet.title !== 'Label Use') {
          const e = new Error(`Bad label use sheet: ${labelUseSheet ? labelUseSheet.title : 'none found'}`);
          return Promise.reject(e);
        }

        return LabelRepository.createFromSheets(labelsSheet, labelUseSheet)
          .then((labelRepoInstance) => {
            lastUpdate = moment().unix();
            labelRepo = labelRepoInstance;
            return labelRepoInstance.getAll();
          })
          .catch(err => Promise.reject(err));
      });
  }
}
