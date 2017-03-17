import Promise from 'bluebird';

import logger from '../logger';

/**
 * This takes in a google sheet and converts it into an SKU object
 */
export default class LabelRepository {
  /* This class is for containing all of the labels and providing search functions for it. */
  constructor(labelUse) {
    this.labelUse = labelUse;
  }

  static createLabelInfo(labelSheet) {
    const getLabelRows = Promise.promisify(labelSheet.getRows, { context: labelSheet });

    return getLabelRows({
      offset: 1,
      limit: 1000
      // orderby: 'col2'
    })
      .then((rows) => {
        const labels = {};
        logger.debug('Read ' + rows.length + ' label rows');

        rows.forEach((row) => {
          const key = `${row.size},${row.type},${row.shape}`;

          labels[key] = {
            size: row.size,
            type: row.type,
            shape: row.shape,
            vendor: {
              name: row.vendorname,
              code: row.vendorcode
            },
            labelsPerSheet: parseInt(row.labelspersheet, 10)
          };
        });

        return labels;
      });
  }

  /*
   * Returns a promise that will contain a labelRepository instance or throw an error
   */
  static createFromSheet(labelSheet, labelUseSheet) {
    const getLabelUseRows = Promise.promisify(labelUseSheet.getRows, { context: labelUseSheet });

    /* Loop through and initialize the set of labels from the label4s tab */
    return this.createLabelInfo(labelSheet)
      .then(labelInfo => getLabelUseRows({
        offset: 1,
        limit: 1000
        // orderby: 'col2'
      })
        .then((rows) => {
          const labelUse = {};
          logger.debug('Read ' + rows.length + ' label use rows');

          rows.forEach((row) => {
            const key = `${row.skuproductname},${row.skusize}`;
            if (!(key in labelUse)) labelUse[key] = [];
            const labelKey = `${row.size},${row.type},${row.shape}`;
            if (!(labelKey in labelInfo)) {
              throw new ReferenceError(`Could not find any labels that match (${labelKey}) for label use (${key})`);
            }
            labelUse[key].push({
              sku: {
                product: { name: row.skuproductname },
                size: row.skusize
              },
              location: row.location,
              needsPrinting: row.needsprinting,
              labelInfo: labelInfo[labelKey]
            });
          });

          return new LabelRepository(labelUse);
        }));
  }

  /*
   * Returns a promise which will return the labels
   */
  getAll() {
    return this.labelUse;
  }
}
