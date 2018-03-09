import _ from 'lodash';
import Promise from 'bluebird';
import logger from '../logger';

/**
 * This takes in a google sheet and converts it into an PACKAGE object
 */
class PackageRepository {
  constructor(packages) {
    this.packages = packages;
  }

  /* Private function */
  static createFromSheet(sheet) {
    const packages = [];
    const getRows = Promise.promisify(sheet.getRows, { context: sheet });

    /* Loop through and initialize the set of packages from the product tab */
    return getRows({
      offset: 1,
      limit: 1000
    })
      .then((rows) => {
        logger.debug(`found ${rows.length} packages`);

        rows.forEach((row) => {
          const newCaseItem = {
            product: {
              name: row.productname
            },
            size: row.unitsize,
            numCases: row.numcases
          };
          const existingPackage = _.find(packages, aPackage => aPackage.name === row.name);
          if (existingPackage) return existingPackage.cases.push(newCaseItem);
          return packages.push({
            name: row.name,
            cases: [newCaseItem]
          });
        });

        return new PackageRepository(packages);
      });
  }

  getAll() {
    return this.packages;
  }
}

export default PackageRepository;
