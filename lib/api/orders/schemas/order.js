'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

var _common = require('./common');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = _joi2.default.object().keys({
  store: _common.store.required(),
  date: _joi2.default.number().min(0),
  invoiceNumber: _joi2.default.number().min(1300),
  lineItems: _joi2.default.array().items(_common.lineItem).required(),
  displayItems: _joi2.default.array().items(_common.displayItem).required(),
  notesToCustomer: _joi2.default.string().max(10000).allow(''),
  internalNotes: _joi2.default.string().max(10000).allow(''),
  salesRep: _joi2.default.object().keys({ name: _joi2.default.string().max(100).required() }),
  show: _joi2.default.object().keys({ name: _joi2.default.string().max(100).required() }),
  discount: _joi2.default.number().min(0).max(10000),
  payments: _joi2.default.array().items(_common.payment),
  commissions: _joi2.default.array().items(_common.commission),
  shipping: _joi2.default.number().min(0).max(10000)
});