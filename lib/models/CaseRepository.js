'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

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
  }

  _createClass(CaseRepository, [{
    key: 'getAll',


    /*
     * Returns a promise which will return the cases
     */
    value: function getAll() {
      return this.cases;
    }
  }], [{
    key: 'createFromService',
    value: function createFromService() {}

    /*
     * Returns a promise that will contain a caseRepository instance or throw an error
     */

  }, {
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
          if (row.productname) {
            var sku = skuRepo.find(row.productname, row.unitsize);
            cases.push({
              cpu: row.cpu,
              size: row.casesize,
              description: row.description,
              sku: sku,
              tester: { cpu: row.testercpu }
            });
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