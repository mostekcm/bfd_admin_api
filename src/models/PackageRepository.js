import _ from 'lodash';
import logger from '../logger';

/**
 * This takes in a google sheet and converts it into an PACKAGE object
 */
class PackageRepository {
  constructor(packages) {
    this.packages = packages;
  }

  /* Private function */
  static async createFromSheet(sheet) {
    const packages = [];

    /* Loop through and initialize the set of packages from the product tab */
    const rows = await sheet.getRows({
      offset: 1,
      limit: 1000
    });
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
  }

  getAll() {
    return this.packages;
  }
}

export default PackageRepository;
