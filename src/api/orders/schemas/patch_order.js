import Joi from 'joi';
import { lineItem, displayItem, store, payment, commission } from './common';

export default Joi.object().keys({
  store: store,
  date: Joi.number().min(0),
  invoiceNumber: Joi.number().min(1300),
  lineItems: Joi.array().items(lineItem),
  displayItems: Joi.array().items(displayItem),
  notesToCustomer: Joi.string().max(10000).allow(''),
  internalNotes: Joi.string().max(10000).allow(''),
  salesRep: Joi.object().keys({ name: Joi.string().max(100).required() }),
  show: Joi.object().keys({ name: Joi.string().max(100).required() }),
  discount: Joi.number().min(0).max(10000),
  dueDate: Joi.number().min(0),
  payments: Joi.array().items(payment),
  commissions: Joi.array().items(commission),
  shipping: Joi.number().min(0).max(10000),
  shippedDate: Joi.number().min(0),
  targetShipDate: Joi.number().min(0)
}).or(
  'store',
  'date',
  'invoiceNumber',
  'lineItems',
  'displayItems',
  'notesToCustomer',
  'internalNotes',
  'salesRep',
  'show',
  'discount',
  'payments',
  'commissions',
  'dueDate',
  'shipping',
  'shippedDate',
  'targetShipDate');
