'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

var _common = require('./common');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = _joi2.default.object().keys({
  store: _common.store,
  date: _joi2.default.date().timestamp(),
  lineItems: _joi2.default.array().items(_common.lineItem),
  displayItems: _joi2.default.array().items(_common.displayItem),
  notesToCustomer: _joi2.default.string().max(10000).allow(''),
  internalNotes: _joi2.default.string().max(10000).allow(''),
  salesRep: _joi2.default.object().keys({ name: _joi2.default.string().max(100).required() }),
  show: _joi2.default.object().keys({ name: _joi2.default.string().max(100).required() }),
  discount: _joi2.default.number().min(0).max(10000),
  dueDate: _joi2.default.number().min(0),
  payments: _joi2.default.array().items(_common.payment),
  shipping: _joi2.default.number().min(0).max(10000),
  shippedDate: _joi2.default.number().min(0)
}).or('store', 'date', 'lineItems', 'displayItems', 'notesToCustomer', 'internalNotes', 'salesRep', 'show', 'discount', 'payments', 'dueDate', 'shipping', 'shippedDate');