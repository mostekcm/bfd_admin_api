import Joi from 'joi';

const product = Joi.object().keys({
  name: Joi.string().max(500).required(),
  category: Joi.object().keys({
    name: Joi.string().min(1).max(100).allow(''),
    order: Joi.string().min(1).max(50).allow('')
  })
});

const sku = Joi.object().keys({
  product: product.required(),
  size: Joi.string().min(1).max(100).required(),
  variety: Joi.string()
    .allow('')
    .max(100),
  varieties: Joi.array(),
  time: Joi.object().keys({
    toLabel: Joi.number().allow(''),
    toFill: Joi.number().allow('')
  }),
  cpu: Joi.number(),
  msrp: Joi.number(),
  upc: Joi.string().max(50).allow(''),
  weight: Joi.number()
});

export const lineItem = Joi.object().keys({
  sku: sku.required(),
  description: Joi.string().max(500).allow(''),
  cpu: Joi.number().required(),
  size: Joi.number(),
  quantity: Joi.number().min(0).max(100000),
  weight: Joi.number(),
  tester: Joi.object().keys({
    quantity: Joi.number().min(1).max(100000).allow(''),
    cpu: Joi.number().min(0).max(1000),
    weight: Joi.number()
  })
});

const offsetMerch = Joi.object().keys({
  sku: sku.required(),
  quantity: Joi.number().min(1).max(100000).required()
});

export const displayItem = Joi.object().keys({
  name: Joi.string().max(100).required(),
  description: Joi.string().max(500).allow(''),
  product: product.required(),
  cost: Joi.number().required(),
  offsetMerch: Joi.array().items(offsetMerch).required(),
  quantity: Joi.number().min(1).max(100000).allow(''),
  testers: Joi.number().min(0).max(100000).allow(''),
  weight: Joi.number()
});

export const store = Joi.object().keys({
  id: Joi.number().min(100000000).max(100000000000),
  name: Joi.string().max(500).required(),
  shippingAddress: Joi.string().max(500).allow(''),
  phone: Joi.string().max(30).allow(''),
  email: Joi.string().max(100).allow(''),
  contact: Joi.string().max(100).allow(''),
  billingAddress: Joi.string().max(500).allow('')
});

export const payment = Joi.object().keys({
  date: Joi.number().min(1).required(),
  amount: Joi.number().min(0.01).max(1000000).required()
});

export const commission = Joi.object().keys({
  payee: Joi.string().min(1).required(),
  paidDate: Joi.number().min(1).required(),
  paidAmount: Joi.number().min(0.01).max(1000000).required(),
  multiplier: Joi.number().min(0.01).max(1.0)
});
