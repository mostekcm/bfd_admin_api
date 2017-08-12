'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _logger = require('../logger');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * This takes in a google sheet and converts it into an SKU object
 */
var CaseRepository = function () {
  /* This class is for containing all of the cases and providing search functions for it. */
  function CaseRepository(cases) {
    _classCallCheck(this, CaseRepository);

    this.cases = cases;
    this.casesIndex = (0, _lodash2.default)(cases).groupBy(function (caseInfo) {
      return caseInfo.sku.product.name;
    }).value();
  }

  /*
   * Returns a promise that will contain a caseRepository instance or throw an error
   */


  _createClass(CaseRepository, [{
    key: 'find',
    value: function find(productName, size) {
      return _lodash2.default.filter(this.casesIndex[productName], function (caseInfo) {
        return caseInfo.sku.size === size;
      })[0];
    }

    /*
     * Returns a promise which will return the cases
     */

  }, {
    key: 'getAll',
    value: function getAll() {
      return this.cases;
    }
  }], [{
    key: 'createFromSheet',
    value: function createFromSheet(sheet, skuRepo) {
      var getCaseRows = _bluebird2.default.promisify(sheet.getRows, { context: sheet });

      /* Loop through and initialize the set of cases from the case4s tab */
      return getCaseRows({
        offset: 1,
        limit: 1000
        // orderby: 'col2'
      }).then(function (rows) {
        var cases = [];
        _logger2.default.debug('Read ' + rows.length + ' case rows');

        rows.forEach(function (row) {
          if (row.productname && !row.deleted) {
            var sku = skuRepo.find(row.productname, row.unitsize);
            cases.push({
              cpu: row.cpu,
              size: row.casesize,
              description: row.description,
              sku: sku,
              tester: { cpu: row.testercpu, weight: row.testerweight }
            });
          } else if (row.deleted && row.productname) {
            _logger2.default.info('Skipping deleted product: ' + row.productname);
          } else {
            _logger2.default.warn('Skipping row with this data: ' + JSON.stringify(row));
          }
        });

        return new CaseRepository(cases);
      });
    }
  }]);

  return CaseRepository;
}();

exports.default = CaseRepository;