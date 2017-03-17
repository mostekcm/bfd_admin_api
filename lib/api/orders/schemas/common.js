'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.payment = exports.store = exports.displayItem = exports.lineItem = undefined;

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var product = _joi2.default.object().keys({
  name: _joi2.default.string().max(500).required(),
  category: _joi2.default.object().keys({
    name: _joi2.default.string().min(1).max(100).allow(''),
    order: _joi2.default.string().min(1).max(50).allow('')
  })
});

var sku = _joi2.default.object().keys({
  product: product.required(),
  size: _joi2.default.string().min(1).max(100).required(),
  variety: _joi2.default.string().allow('').max(100),
  varieties: _joi2.default.array(),
  time: _joi2.default.object().keys({
    toLabel: _joi2.default.number().allow(''),
    toFill: _joi2.default.number().allow('')
  }),
  cpu: _joi2.default.number(),
  msrp: _joi2.default.number(),
  upc: _joi2.default.string().max(50).allow('')
});

var lineItem = exports.lineItem = _joi2.default.object().keys({
  sku: sku.required(),
  description: _joi2.default.string().max(500).allow(''),
  cpu: _joi2.default.number().required(),
  size: _joi2.default.number(),
  quantity: _joi2.default.number().min(0).max(100000).allow(''),
  tester: _joi2.default.object().keys({
    quantity: _joi2.default.number().min(0).max(100000).allow(''),
    cpu: _joi2.default.number().min(0).max(1000)
  })
});

var offsetMerch = _joi2.default.object().keys({
  sku: sku.required(),
  quantity: _joi2.default.number().min(1).max(100000).required()
});

var displayItem = exports.displayItem = _joi2.default.object().keys({
  name: _joi2.default.string().max(100).required(),
  description: _joi2.default.string().max(500).allow(''),
  product: product.required(),
  cost: _joi2.default.number().required(),
  offsetMerch: offsetMerch.required(),
  quantity: _joi2.default.number().min(1).max(100000).allow(''),
  testers: _joi2.default.number().min(0).max(100000).allow('')
});

var store = exports.store = _joi2.default.object().keys({
  name: _joi2.default.string().max(500).required(),
  shippingAddress: _joi2.default.string().max(500).required(),
  phone: _joi2.default.string().max(15).required(),
  email: _joi2.default.string().max(100).required(),
  contact: _joi2.default.string().max(100).required(),
  billingAddress: _joi2.default.string().max(500)
});

var payment = exports.payment = _joi2.default.object().keys({
  date: _joi2.default.date().timestamp().required(),
  amount: _joi2.default.number().min(0.01).max(1000000).required()
});