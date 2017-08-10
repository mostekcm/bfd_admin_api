import GoogleSpreadsheet from 'google-spreadsheet';
import Promise from 'bluebird';

import config from '../config';
import logger from '../logger';
import LabelRepository from '../models/LabelRepository';

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
    if (this.labelRepo != null) return new Promise(resolve => resolve(this.labelRepo.getAll()));

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
          .then((labelRepo) => {
            me.labelRepo = labelRepo;
            return labelRepo.getAll();
          })
          .catch(err => Promise.reject(err));
      });
  }
}
