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
var LabelRepository = function () {
  /* This class is for containing all of the labels and providing search functions for it. */
  function LabelRepository(labelUse) {
    _classCallCheck(this, LabelRepository);

    this.labelUse = labelUse;
  }

  _createClass(LabelRepository, [{
    key: 'getAll',


    /*
     * Returns a promise which will return the labels
     */
    value: function getAll() {
      return this.labelUse;
    }
  }], [{
    key: 'createLabelInfo',
    value: function createLabelInfo(labelSheet) {
      var getLabelRows = _bluebird2.default.promisify(labelSheet.getRows, { context: labelSheet });

      return getLabelRows({
        offset: 1,
        limit: 1000
        // orderby: 'col2'
      }).then(function (rows) {
        var labels = {};
        _logger2.default.debug('Read ' + rows.length + ' label rows');

        rows.forEach(function (row) {
          var key = row.size + ',' + row.type + ',' + row.shape;

          labels[key] = {
            labelKey: key,
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

  }, {
    key: 'createFromSheets',
    value: function createFromSheets(labelSheet, labelUseSheet) {
      var getLabelUseRows = _bluebird2.default.promisify(labelUseSheet.getRows, { context: labelUseSheet });

      /* Loop through and initialize the set of labels from the label4s tab */
      return this.createLabelInfo(labelSheet).then(function (labelInfo) {
        return getLabelUseRows({
          offset: 1,
          limit: 1000
          // orderby: 'col2'
        }).then(function (rows) {
          var labelUse = {};
          _logger2.default.debug('Read ' + rows.length + ' label use rows');

          rows.forEach(function (row) {
            var key = row.skuproductname + ',' + row.skusize;
            if (!(key in labelUse)) labelUse[key] = [];
            var labelKey = row.size + ',' + row.type + ',' + row.shape;
            if (!(labelKey in labelInfo)) {
              throw new ReferenceError('Could not find any labels that match (' + labelKey + ') for label use (' + key + ')');
            }
            labelUse[key].push({
              productKey: key,
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
        });
      });
    }
  }]);

  return LabelRepository;
}();

exports.default = LabelRepository;