'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

var _logger = require('../../../logger');

var _logger2 = _interopRequireDefault(_logger);

var _CaseService = require('../../../service/CaseService');

var _CaseService2 = _interopRequireDefault(_CaseService);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function () {
  return {
    method: 'GET',
    path: '/api/cases',
    config: {
      auth: {
        strategies: ['jwt'],
        scope: ['read:cases']
      },
      description: 'Get all cases in the system.',
      tags: ['api'],
      validate: {
        query: {
          q: _joi2.default.string().max(1000).allow('').default(''),
          field: _joi2.default.string().max(1000).allow('').default('')
        }
      }
    },
    handler: function handler(req, reply) {
      var caseService = new _CaseService2.default();
      caseService.getAll().then(function (cases) {
        return reply(cases);
      }).catch(function (e) {
        if (e.message) {
          _logger2.default.error('Error trying to get cases data: ', e.message);
          _logger2.default.error(e.stack);
        } else {
          _logger2.default.error(e);
        }

        return reply({
          statusCode: 500,
          error: 'Internal Configuration Error',
          message: e.message ? e.message : e
        });
      });
    }
  };
}; // import _ from 'lodash';