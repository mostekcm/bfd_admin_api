import { expect } from 'chai';
import Joi from 'joi';
import order from '../src/api/orders/schemas/order';

describe('#logger', () => {
  it('should write log', (done) => {
    const result = Joi.validate({ listItems: [] }, order);
    expect(result.error).to.be.null();
    done();
  });
});
