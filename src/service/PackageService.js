import GoogleSpreadsheet from 'google-spreadsheet';
import Promise from 'bluebird';
import moment from 'moment';

import config from '../config';
import logger from '../logger';
import PackageRepository from '../models/PackageRepository';

let packageRepo = null;
let lastUpdate = null;

export default class PackageService {
  constructor() {
    /* Grab packages from the google sheet */
    // TODO: Do caching for this
    // TODO: Move this to a provider pattern
    // spreadsheet key is the long id in the sheets URL
    this.doc = new GoogleSpreadsheet(config('CONFIG_SHEET'));
    this.useServiceAccountAuth = Promise.promisify(this.doc.useServiceAccountAuth, { context: this.doc });
    this.getInfo = Promise.promisify(this.doc.getInfo, { context: this.doc });
  }

  getAll() {
    const me = this;
    const cacheAge = lastUpdate ? moment().unix() - lastUpdate : 0;
    if (packageRepo !== null && cacheAge < 60) {
      logger.debug('Using cache because cacheAge: ', cacheAge);
      return new Promise(resolve => resolve(packageRepo.getAll()));
    }

    if (packageRepo !== null) logger.info('Updating package cache: ', cacheAge);

    return this.useServiceAccountAuth(JSON.parse(config('BFD_SERVICE_ACCOUNT_CREDS')))
      .then(() => me.getInfo())
      .then((info) => {
        logger.debug('Loaded doc!');

        const packagesSheet = info.worksheets[8];
        if (!packagesSheet || packagesSheet.title !== 'Packages') {
          const e = new Error(`Bad packages sheet: ${packagesSheet ? packagesSheet.title : 'none found'}`);
          return Promise.reject(e);
        }

        return PackageRepository.createFromSheet(packagesSheet)
          .then((packageRepoInstance) => {
            lastUpdate = moment().unix();
            packageRepo = packageRepoInstance;
            return packageRepoInstance.getAll();
          })
          .catch(err => Promise.reject(err));
      });
  }
}
