import { GoogleSpreadsheet } from 'google-spreadsheet';
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
  }

  async getAll() {
    const cacheAge = lastUpdate ? moment().unix() - lastUpdate : 0;
    if (labelRepo !== null && cacheAge < 60) {
      logger.debug('Using label cache because cacheAge: ', cacheAge);
      return labelRepo.getAll();
    }

    if (labelRepo !== null) logger.info('Updating label cache: ', cacheAge);

    await this.doc.useServiceAccountAuth(JSON.parse(config('BFD_SERVICE_ACCOUNT_CREDS')));
    await this.doc.loadInfo();
    logger.debug('Loaded labels doc!');

    const labelsSheet = this.doc.sheetsByIndex[4];
    if (!labelsSheet || labelsSheet.title !== 'Labels') {
      throw new Error(`Bad labels sheet: ${labelsSheet ? labelsSheet.title : 'none found'}`);
    }

    const labelUseSheet = this.doc.sheetsByIndex[3];
    if (!labelUseSheet || labelUseSheet.title !== 'Label Use') {
      throw new Error(`Bad label use sheet: ${labelUseSheet ? labelUseSheet.title : 'none found'}`);
    }

    const labelRepoInstance = await LabelRepository.createFromSheets(labelsSheet, labelUseSheet);
    lastUpdate = moment().unix();
    labelRepo = labelRepoInstance;
    return labelRepoInstance.getAll();
  }
}
