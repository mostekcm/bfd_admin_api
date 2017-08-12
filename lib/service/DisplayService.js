'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _googleSpreadsheet = require('google-spreadsheet');

var _googleSpreadsheet2 = _interopRequireDefault(_googleSpreadsheet);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _config = require('../config');

var _config2 = _interopRequireDefault(_config);

var _logger = require('../logger');

var _logger2 = _interopRequireDefault(_logger);

var _DisplayRepository = require('../models/DisplayRepository');

var _DisplayRepository2 = _interopRequireDefault(_DisplayRepository);

var _SkuRepository = require('../models/SkuRepository');

var _SkuRepository2 = _interopRequireDefault(_SkuRepository);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var displayRepo = null;
var lastUpdate = null;

var DisplayService = function () {
  function DisplayService() {
    _classCallCheck(this, DisplayService);

    /* Grab displays from the google sheet */
    // TODO: Move this to a provider pattern
    // spreadsheet key is the long id in the sheets URL
    this.doc = new _googleSpreadsheet2.default((0, _config2.default)('CONFIG_SHEET'));
    this.useServiceAccountAuth = _bluebird2.default.promisify(this.doc.useServiceAccountAuth, { context: this.doc });
    this.getInfo = _bluebird2.default.promisify(this.doc.getInfo, { context: this.doc });
  }

  _createClass(DisplayService, [{
    key: 'getAll',
    value: function getAll() {
      var me = this;
      var cacheAge = lastUpdate ? (0, _moment2.default)().unix() - lastUpdate : 0;
      if (displayRepo !== null && cacheAge < 60) {
        _logger2.default.debug('Using display cache because cacheAge: ', cacheAge);
        return new _bluebird2.default(function (resolve) {
          return resolve(displayRepo.getAll());
        });
      }

      if (displayRepo !== null) _logger2.default.info('Updating display cache: ', cacheAge);

      return this.useServiceAccountAuth(JSON.parse((0, _config2.default)('BFD_SERVICE_ACCOUNT_CREDS'))).then(function () {
        return me.getInfo();
      }).then(function (info) {
        _logger2.default.debug('Loaded display doc!');

        var displaysSheet = info.worksheets[2];
        if (!displaysSheet || displaysSheet.title !== 'Displays') {
          var e = new Error('Bad skus sheet: ' + (displaysSheet ? displaysSheet.title : 'none found'));
          return _bluebird2.default.reject(e);
        }

        var skusSheet = info.worksheets[1];
        if (!skusSheet || skusSheet.title !== 'Skus') {
          var _e = new Error('Bad skus sheet: ' + (skusSheet ? skusSheet.title : 'none found'));
          return _bluebird2.default.reject(_e);
        }

        return _SkuRepository2.default.create(skusSheet).then(function (skuRepo) {
          return _DisplayRepository2.default.createFromSheet(displaysSheet, skuRepo).then(function (displayRepoInstance) {
            lastUpdate = (0, _moment2.default)().unix();
            displayRepo = displayRepoInstance;
            return displayRepo.getAll();
          });
        }).catch(function (err) {
          return _bluebird2.default.reject(err);
        });
      });
    }
  }]);

  return DisplayService;
}();

exports.default = DisplayService;