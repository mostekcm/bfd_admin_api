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
var SkuRepository = function () {
  function SkuRepository(skus) {
    _classCallCheck(this, SkuRepository);

    this.skus = skus;
  }

  /* Private function */


  _createClass(SkuRepository, [{
    key: 'find',
    value: function find(productName, size) {
      /* Find the product */
      if (!(productName in this.skus)) {
        throw new ReferenceError('Could not find any skus that match product (' + productName + '), only found these (' + Object.keys(this.skus).join(',') + ')');
      }

      /* Found the product, check the size */
      if (!(size in this.skus[productName])) {
        throw new ReferenceError('Could not find any skus that match size (' + size + ') for product (' + productName + ') only have sizes (' + Object.keys(this.skus[productName]).join(',') + ')');
      }

      return this.skus[productName][size];
    }
  }], [{
    key: 'create',
    value: function create(sheet) {
      var skus = [];
      var getRows = _bluebird2.default.promisify(sheet.getRows, { context: sheet });

      /* Loop through and initialize the set of skus from the product tab */
      return getRows({
        offset: 1,
        limit: 1000
        // orderby: 'col2'
      }).then(function (rows) {
        _logger2.default.debug('found ' + rows.length + ' skus');

        rows.forEach(function (row) {
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
            upc: row.upc,
            size: row.size
          };
        });

        return new SkuRepository(skus);
      });
    }
  }]);

  return SkuRepository;
}();

exports.default = SkuRepository;