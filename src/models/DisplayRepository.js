import Promise from 'bluebird';

import logger from '../logger';

/**
 * This takes in a google sheet and converts it into an SKU object
 */
export default class DisplayRepository {
  /* This class is for containing all of the displays and providing search functions for it. */
  constructor(displays) {
    this.displays = displays;
  }

  /*
   * Returns a promise that will contain a displayRepository instance or throw an error
   */
  static createFromSheet(sheet, skuRepo) {
    const getDisplayRows = Promise.promisify(sheet.getRows, { context: sheet });

    /* Loop through and initialize the set of displays from the display4s tab */
    return getDisplayRows({
      offset: 1,
      limit: 1000
      // orderby: 'col2'
    })
      .then((rows) => {
        const displays = [];
        logger.debug('Read ' + rows.length + ' display rows');

        rows.forEach((row) => {
          if (row.name) {
            displays.push({
              name: row.name,
              product: { name: row.productname },
              description: row.description,
              offsetMerch: {
                quantity: row.offsetmerchquantity,
                sku: {
                  product: { name: row.offsetmerchskuproductname },
                  size: row.offsetmerchskusize,
                  msrp: skuRepo.find(row.offsetmerchskuproductname, row.offsetmerchskusize).msrp
                }
              },
              cost: row.cost
            });
          } else {
            logger.warn(`Skipping row with this data: ${JSON.stringify(row)}`);
          }
        });

        return new DisplayRepository(displays);
      });
  }

  /*
   * Returns a promise which will return the displays
   */
  getAll() {
    return this.displays;
  }
}
