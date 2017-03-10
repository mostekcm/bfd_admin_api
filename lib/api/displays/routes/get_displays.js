'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

var _logger = require('../../../logger');

var _logger2 = _interopRequireDefault(_logger);

var _DisplayService = require('../../../service/DisplayService');

var _DisplayService2 = _interopRequireDefault(_DisplayService);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function () {
  return {
    method: 'GET',
    path: '/api/displays',
    config: {
      auth: {
        strategies: ['jwt'],
        scope: ['read:displays']
      },
      description: 'Get all displays in the system.',
      tags: ['api'],
      validate: {
        query: {
          q: _joi2.default.string().max(1000).allow('').default(''),
          field: _joi2.default.string().max(1000).allow('').default('')
        }
      }
    },
    handler: function handler(req, reply) {
      var displayService = new _DisplayService2.default();
      displayService.getAll().then(function (displays) {
        return reply(displays);
      }).catch(function (e) {
        if (e.message) {
          _logger2.default.error('Error trying to get displays data: ', e.message);
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