import { GoogleSpreadsheet } from 'google-spreadsheet';
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
  }

  async getAll() {
    const cacheAge = lastUpdate ? moment().unix() - lastUpdate : 0;
    if (displayRepo !== null && cacheAge < 60) {
      logger.debug('Using display cache because cacheAge: ', cacheAge);
      return displayRepo.getAll();
    }

    if (displayRepo !== null) logger.info('Updating display cache: ', cacheAge);

    await this.doc.useServiceAccountAuth(JSON.parse(config('BFD_SERVICE_ACCOUNT_CREDS')));
    await this.doc.loadInfo();

    logger.debug('Loaded display doc!');

    const displaysSheet = this.doc.sheetsByIndex[2];
    if (!displaysSheet || displaysSheet.title !== 'Displays') {
      throw new Error(`Bad skus sheet: ${displaysSheet ? displaysSheet.title : 'none found'}`);
    }

    const skusSheet = this.doc.sheetsByIndex[1];
    if (!skusSheet || skusSheet.title !== 'Skus') {
      throw new Error(`Bad skus sheet: ${skusSheet ? skusSheet.title : 'none found'}`);
    }

    const skuRepo = await SkuRepository.create(skusSheet);
    const displayRepoInstance = await DisplayRepository.createFromSheet(displaysSheet, skuRepo);
    lastUpdate = moment().unix();
    displayRepo = displayRepoInstance;
    return displayRepo.getAll();
  }
}
