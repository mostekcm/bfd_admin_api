import Joi from 'joi';

const product = Joi.object().keys({
  name: Joi.string().max(500).required()
});

const sku = Joi.object().keys({
  product: product,
  size: Joi.string().min(1).max(100).required(),
  variety: Joi.string()
    .allow('')
    .min(1)
    .max(100)
    .required()
});

const lineItem = Joi.object().keys({
  sku: sku.required(),
  description: Joi.string().max(500).allow(''),
  cpu: Joi.number().required(),
  size: Joi.number(),
  quantity: Joi.number().min(1).max(100000).allow(''),
  testers: Joi.number().min(0).max(100000).allow('')
});

export default Joi.object().keys({
  lineItems: Joi.array().items(lineItem).required()
});
