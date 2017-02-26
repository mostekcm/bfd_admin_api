import Promise from 'bluebird';
import logger from '../logger';

/**
 * This takes in a google sheet and converts it into an SKU object
 */
class SkuRepository {
  constructor(skus) {
    this.skus = skus;
  }

  /* Private function */
  static create(sheet) {
    const skus = [];
    const getRows = Promise.promisify(sheet.getRows, { context: sheet });

    /* Loop through and initialize the set of skus from the product tab */
    return getRows({
      offset: 1,
      limit: 1000
      // orderby: 'col2'
    })
      .then((rows) => {
        logger.debug(`found ${rows.length} skus`);

        rows.forEach((row) => {
          if (!(row.productname in skus)) skus[row.productname] = {};
          skus[row.productname][row.size] = {
            product: {
              name: row.productname,
              category: {
                name: row.categoryname,
                order: row.categoryorder
              }
            },
            varieties: row.varieties ? row.varieties.split(',') : [],
            time: {
              toLabel: row.timetolabel,
              toFill: row.timetofill
            },
            msrp: row.msrp,
            upc: row.upc
          };
        });

        return new SkuRepository(skus);
      });
  }

  find(productName, size) {
    /* Find the product */
    if (!(productName in this.skus)) {
      throw new ReferenceError(`Could not find any skus that match product (${productName}), only found these (${Object.keys(this.skus).join(',')})`);
    }

    /* Found the product, check the size */
    if (!(size in this.skus[productName])) {
      throw new ReferenceError(`Could not find any skus that match size (${size}) for product (${productName}) only have sizes (${Object.keys(this.skus[productName]).join(',')})`);
    }

    return this.skus[productName][size];
  }
}

export default SkuRepository;
