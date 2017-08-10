import _ from 'lodash';
import Promise from 'bluebird';

import logger from '../logger';

/**
 * This takes in a google sheet and converts it into an SKU object
 */
export default class CaseRepository {
  /* This class is for containing all of the cases and providing search functions for it. */
  constructor(cases) {
    this.cases = cases;
    this.casesIndex = _(cases).groupBy(caseInfo => caseInfo.sku.product.name).value();
  }

  /*
   * Returns a promise that will contain a caseRepository instance or throw an error
   */
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
          if (row.productname && !row.deleted) {
            const sku = skuRepo.find(row.productname, row.unitsize);
            cases.push({
              cpu: row.cpu,
              size: row.casesize,
              description: row.description,
              sku: sku,
              tester: { cpu: row.testercpu, weight: row.testerweight }
            });
          } else {
            logger.warn(`Skipping row with this data: ${JSON.stringify(row)}`);
          }
        });

        return new CaseRepository(cases);
      });
  }

  find(productName, size) {
    return _.filter(this.casesIndex[productName], caseInfo => caseInfo.sku.size === size)[0];
  }

  /*
   * Returns a promise which will return the cases
   */
  getAll() {
    return this.cases;
  }
}
