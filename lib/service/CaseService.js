'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _googleSpreadsheet = require('google-spreadsheet');

var _googleSpreadsheet2 = _interopRequireDefault(_googleSpreadsheet);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _config = require('../config');

var _config2 = _interopRequireDefault(_config);

var _logger = require('../logger');

var _logger2 = _interopRequireDefault(_logger);

var _CaseRepository = require('../models/CaseRepository');

var _CaseRepository2 = _interopRequireDefault(_CaseRepository);

var _SkuRepository = require('../models/SkuRepository');

var _SkuRepository2 = _interopRequireDefault(_SkuRepository);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var CaseService = function () {
  function CaseService() {
    _classCallCheck(this, CaseService);

    /* Grab cases from the google sheet */
    // TODO: Do caching for this
    // TODO: Move this to a provider pattern
    // spreadsheet key is the long id in the sheets URL
    this.doc = new _googleSpreadsheet2.default('1u_uTiO5kxHmBsbf1YbKocn18ZSzRwge9xF1ZRFEGvF0');
    this.useServiceAccountAuth = _bluebird2.default.promisify(this.doc.useServiceAccountAuth, { context: this.doc });
    this.getInfo = _bluebird2.default.promisify(this.doc.getInfo, { context: this.doc });
    this.caseRepo = null;
  }

  _createClass(CaseService, [{
    key: 'getAll',
    value: function getAll() {
      var _this = this;

      var me = this;
      if (this.caseRepo != null) return new _bluebird2.default(function (resolve) {
        return resolve(_this.caseRepo.getAll());
      });

      return this.useServiceAccountAuth((0, _config2.default)('BFD_SERVICE_ACCOUNT_CREDS')).then(function () {
        return me.getInfo();
      }).then(function (info) {
        _logger2.default.debug('Loaded doc!');

        var casesSheet = info.worksheets[0];
        if (!casesSheet || casesSheet.title !== 'Cases') {
          var e = new Error('Bad skus sheet: ' + (casesSheet ? casesSheet.title : 'none found'));
          return _bluebird2.default.reject(e);
        }

        var skusSheet = info.worksheets[1];
        if (!skusSheet || skusSheet.title !== 'Skus') {
          var _e = new Error('Bad skus sheet: ' + (skusSheet ? skusSheet.title : 'none found'));
          return _bluebird2.default.reject(_e);
        }

        return _SkuRepository2.default.create(skusSheet).then(function (skuRepo) {
          return _CaseRepository2.default.createFromSheet(casesSheet, skuRepo);
        }).then(function (caseRepo) {
          me.caseRepo = caseRepo;
          return caseRepo.getAll();
        }).catch(function (err) {
          return _bluebird2.default.reject(err);
        });
      });
    }
  }]);

  return CaseService;
}();

exports.default = CaseService;