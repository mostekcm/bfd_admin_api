import GoogleSpreadsheet from 'google-spreadsheet';
import Promise from 'bluebird';

import config from '../config';
import logger from '../logger';
import DisplayRepository from '../models/DisplayRepository';

export default class DisplayService {
  constructor() {
    /* Grab displays from the google sheet */
    // TODO: Do caching for this
    // TODO: Move this to a provider pattern
    // spreadsheet key is the long id in the sheets URL
    this.doc = new GoogleSpreadsheet('1u_uTiO5kxHmBsbf1YbKocn18ZSzRwge9xF1ZRFEGvF0');
    this.useServiceAccountAuth = Promise.promisify(this.doc.useServiceAccountAuth, { context: this.doc });
    this.getInfo = Promise.promisify(this.doc.getInfo, { context: this.doc });
    this.displayRepo = null;
  }

  getAll() {
    const me = this;
    if (this.displayRepo != null) return new Promise(resolve => resolve(this.displayRepo.getAll()));

    return this.useServiceAccountAuth(JSON.parse(config('BFD_SERVICE_ACCOUNT_CREDS')))
      .then(() => me.getInfo())
      .then((info) => {
        logger.debug('Loaded display doc!');

        const displaysSheet = info.worksheets[2];
        if (!displaysSheet || displaysSheet.title !== 'Displays') {
          const e = new Error(`Bad skus sheet: ${displaysSheet ? displaysSheet.title : 'none found'}`);
          return Promise.reject(e);
        }

        return DisplayRepository.createFromSheet(displaysSheet)
          .then((displayRepo) => {
            me.displayRepo = displayRepo;
            return displayRepo.getAll();
          })
          .catch(err => Promise.reject(err));
      });
  }
}
