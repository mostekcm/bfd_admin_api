import Promise from 'bluebird';

import logger from '../logger';
import { getPossibleJsonValue } from '../helper/sheetTools';
import getOffsetMerchFromRow from '../helper/displayItem';

/**
 * This takes in a google sheet and converts it into an SKU object
 */
export default class DisplayRepository {
  /* This class is for containing all of the displays and providing search functions for it. */
  constructor(displays) {
    this.displays = displays;
  }

  static getMsrp(skuRepo, productNameInput, productSizeInput) {
    const productName = getPossibleJsonValue(productNameInput);
    const productSize = getPossibleJsonValue(productSizeInput);

    if (Array.isArray(productName)) {
      const msrp = [];
      let i = 0;
      for (; i < productName.length; i += 1) {
        msrp.push(skuRepo.find(productName[i], productSize[i]).msrp);
      }
      return msrp;
    } else if (productName) {
      return skuRepo.find(productName, productSize).msrp;
    }

    return undefined;
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
              offsetMerch: getOffsetMerchFromRow(
                row.offsetmerchskuproductname,
                row.offsetmerchskusize,
                DisplayRepository.getMsrp(skuRepo, row.offsetmerchskuproductname, row.offsetmerchskusize),
                row.offsetmerchquantity
              ),
              cost: row.cost,
              weight: row.weight
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
