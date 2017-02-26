import Promise from 'bluebird';

import logger from '../logger';

/**
 * This takes in a google sheet and converts it into an SKU object
 */
export default class CaseRepository {
  constructor(cases) {
    this.cases = cases;
  }

  /* private function */
  static createFromSheet(sheet, skuRepo) {
    const getCaseRows = Promise.promisify(sheet.getRows, { context: sheet });

    /* Loop through and initialize the set of cases from the case4s tab */
    return getCaseRows({
      offset: 1,
      limit: 1000
      // orderby: 'col2'
    })
      .then((rows) => {
        const cases = [];
        logger.debug('Read ' + rows.length + ' case rows');

        rows.forEach((row) => {
          if (row.productname) {
            const sku = skuRepo.find(row.productname, row.unitsize);
            cases.push({
              cpu: row.cpu,
              size: row.casesize,
              description: row.description,
              sku: sku
            });
          } else {
            logger.warn(`Skipping row with this data: ${JSON.stringify(row)}`);
          }
        });

        return new CaseRepository(cases);
      });
  }

  /*
   * Returns a promise which will return the cases
   */
  getAll() {
    return this.cases;
  }
}
