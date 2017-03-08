'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var product = _joi2.default.object().keys({
  name: _joi2.default.string().max(500).required()
});

var sku = _joi2.default.object().keys({
  product: product,
  size: _joi2.default.string().min(1).max(100).required(),
  variety: _joi2.default.string().allow('').min(1).max(100).required()
});

var lineItem = _joi2.default.object().keys({
  sku: sku.required(),
  description: _joi2.default.string().max(500).allow(''),
  cpu: _joi2.default.number().required(),
  size: _joi2.default.number(),
  quantity: _joi2.default.number().min(1).max(100000).allow(''),
  testers: _joi2.default.number().min(0).max(100000).allow('')
});

exports.default = _joi2.default.object().keys({
  lineItems: _joi2.default.array().items(lineItem).required()
});