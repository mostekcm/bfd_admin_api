import Joi from 'joi';
import { lineItem, displayItem, store, payment } from './common';

export default Joi.object().keys({
  store: store.required(),
  date: Joi.date().timestamp(),
  lineItems: Joi.array().items(lineItem).required(),
  displayItems: Joi.array().items(displayItem).required(),
  notesToCustomer: Joi.string().max(10000).allow(''),
  internalNotes: Joi.string().max(10000).allow(''),
  salesRep: Joi.object().keys({ name: Joi.string().max(100).required() }),
  show: Joi.object().keys({ name: Joi.string().max(100).required() }),
  discount: Joi.number().min(0).max(10000),
  payments: Joi.array().items(payment),
  shipping: Joi.number().min(0).max(10000)
});
