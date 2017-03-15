import Joi from 'joi';

import logger from '../../../logger';
import OrderService from '../../../service/OrderService';

const addLineItemToIndex = (skuIndex, productName, skuSize, variety, quantity, testerQuantity) => {
  if (!(productName in skuIndex)) skuIndex[productName] = {};
  const productIndex = skuIndex[productName];

  if (!(skuSize in productIndex)) productIndex[skuSize] = {};
  const sizeIndex = productIndex[skuSize];

  if (!(variety in sizeIndex)) {
    sizeIndex[variety] = {
      quantity: parseFloat(quantity),
      testerQuantity: testerQuantity ? parseFloat(testerQuantity) : 0
    };
  } else {
    sizeIndex[variety].quantity += parseFloat(quantity);
    sizeIndex[variety].testerQuantity += testerQuantity ? parseFloat(testerQuantity) : 0;
  }
};

export default () => ({
  method: 'GET',
  path: '/api/reports/show/{name}',
  config: {
    auth: {
      strategies: ['jwt'],
      scope: ['read:reports']
    },
    description: 'Get a report on a single show.',
    tags: ['api'],
    validate: {
      params: {
        name: Joi.string().max(100).required()
      }
    }
  },
  handler: (req, reply) => {
    const orderService = new OrderService();
    orderService.getShowOrders(req.params.name)
      .then((orders) => {
        const skuIndex = {};
        const displayItemIndex = {};

        orders.forEach((order) => {
          order.lineItems.forEach((lineItem) => {
            /* add line item to skus */
            addLineItemToIndex(skuIndex, lineItem.sku.product.name, lineItem.sku.size, lineItem.sku.variety,
              lineItem.quantity, lineItem.tester.quantity);
          });

          order.displayItems.forEach((displayItem) => {
            /* Add display item to index */
            if (!(displayItem.product.name in displayItemIndex)) displayItemIndex[displayItem.product.name] = JSON.parse(JSON.stringify(displayItem));
            else {
              displayItemIndex[displayItem.product.name].quantity =
                parseFloat(displayItemIndex[displayItem.product.name].quantity) + parseFloat(displayItem.quantity);
            }

            /* add offset merch to skuIndex */
            addLineItemToIndex(skuIndex, displayItem.offsetMerch.sku.product.name, displayItem.offsetMerch.sku.size, '',
              displayItem.offsetMerch.quantity, 0);
          });
        });

        reply({
          showName: req.params.name,
          skus: skuIndex,
          displays: displayItemIndex
        });
      })
      .catch((e) => {
        if (e.message) {
          logger.error('Error trying to get order data: ', e.message);
          logger.error(e.stack);
        } else {
          logger.error(e);
        }

        return reply({
          statusCode: 500,
          error: 'Internal Configuration Error',
          message: e.message ? e.message : e
        });
      });
  }
});
