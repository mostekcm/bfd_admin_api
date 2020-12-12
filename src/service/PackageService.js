import { GoogleSpreadsheet } from 'google-spreadsheet';
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
  }

  async getAll() {
    const cacheAge = lastUpdate ? moment().unix() - lastUpdate : 0;
    if (packageRepo !== null && cacheAge < 60) {
      logger.debug('Using cache because cacheAge: ', cacheAge);
      return packageRepo.getAll();
    }

    if (packageRepo !== null) logger.info('Updating package cache: ', cacheAge);

    await this.doc.useServiceAccountAuth(JSON.parse(config('BFD_SERVICE_ACCOUNT_CREDS')));
    await this.doc.getInfo();

    logger.debug('Loaded doc!');

    const packagesSheet = this.doc.sheetsByIndex[8];
    if (!packagesSheet || packagesSheet.title !== 'Packages') {
      throw new Error(`Bad packages sheet: ${packagesSheet ? packagesSheet.title : 'none found'}`);
    }

    const packageRepoInstance = await PackageRepository.createFromSheet(packagesSheet);
    lastUpdate = moment().unix();
    packageRepo = packageRepoInstance;
    return packageRepoInstance.getAll();
  }
}
