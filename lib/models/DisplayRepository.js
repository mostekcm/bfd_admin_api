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
var DisplayRepository = function () {
  /* This class is for containing all of the displays and providing search functions for it. */
  function DisplayRepository(displays) {
    _classCallCheck(this, DisplayRepository);

    this.displays = displays;
  }

  /*
   * Returns a promise that will contain a displayRepository instance or throw an error
   */


  _createClass(DisplayRepository, [{
    key: 'getAll',


    /*
     * Returns a promise which will return the displays
     */
    value: function getAll() {
      return this.displays;
    }
  }], [{
    key: 'createFromSheet',
    value: function createFromSheet(sheet, skuRepo) {
      var getDisplayRows = _bluebird2.default.promisify(sheet.getRows, { context: sheet });

      /* Loop through and initialize the set of displays from the display4s tab */
      return getDisplayRows({
        offset: 1,
        limit: 1000
        // orderby: 'col2'
      }).then(function (rows) {
        var displays = [];
        _logger2.default.debug('Read ' + rows.length + ' display rows');

        rows.forEach(function (row) {
          if (row.productname) {
            displays.push({
              name: row.name,
              product: { name: row.productname },
              description: row.description,
              offsetMerch: {
                quantity: row.offsetmerchquantity,
                sku: {
                  product: { name: row.offsetmerchskuproductname },
                  size: row.offsetmerchskusize,
                  msrp: skuRepo.find(row.offsetmerchskuproductname, row.offsetmerchskusize)
                }
              },
              cost: row.cost
            });
          } else {
            _logger2.default.warn('Skipping row with this data: ' + JSON.stringify(row));
          }
        });

        return new DisplayRepository(displays);
      });
    }
  }]);

  return DisplayRepository;
}();

exports.default = DisplayRepository;