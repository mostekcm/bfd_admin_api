import { createObjectCsvWriter } from 'csv-writer';
import moment from 'moment';
import logger from '../../../logger';
import DbOrderService from '../../../service/OrderService';

export default () => ({
  method: 'GET',
  path: '/api/reports/sales_to_csv',
  config: {
    auth: {
      strategies: ['jwt'],
      scope: ['read:reports']
    },
    description: 'Get sales data to logzio.',
    tags: ['api']
  },
  handler: async (req) => {
    const orderService = new DbOrderService(req.auth.credentials);
    try {
      const orders = await orderService.getAllNotCancelled();
      const csvWriter = createObjectCsvWriter({
        path: req.query.path,
        header: [
          { id: 'invoiceNumber', title: 'Invoice Number' },
          { id: 'customerName', title: 'Customer' },
          { id: 'shippedUnixDate', title: 'Unix Date' },
          { id: 'shippedIsoDate', title: 'Iso Date' },
          { id: 'shippedMonth', title: 'Month' },
          { id: 'lineItemName', title: 'Item Name' },
          { id: 'lineItemVariety', title: 'Variety' },
          { id: 'lineItemSize', title: 'Size' },
          { id: 'lineItemCpu', title: 'CPU' },
          { id: 'quantity', title: 'Quantity' },
          { id: 'testerQuantity', title: 'Tester Quantity' },
          { id: 'testerCpu', title: 'Tester CPU' },
          { id: 'show', title: 'Show' }
        ]
      });

      const ordersToWrite = [];

      orders.forEach((order) => {
        if (order.shippedDate) {
          order.lineItems.forEach((lineItem) => {
            const quantity = Math.round(parseFloat(lineItem.size) * parseFloat(lineItem.quantity));
            if (quantity !== 0) {
              const date = moment.unix(order.shippedDate);
              ordersToWrite.push({
                invoiceNumber: order.invoiceNumber,
                customerName: order.store.name,
                show: order.show.name,
                shippedUnixDate: order.shippedDate,
                shippedIsoDate: date.format(),
                shippedMonth: date.format('YYYYMM'),
                lineItemName: lineItem.sku.product.name,
                lineItemVariety: lineItem.sku.variety,
                lineItemSize: lineItem.sku.size,
                lineItemCpu: parseFloat(lineItem.cpu),
                quantity,
                testerQuantity: parseFloat(lineItem.tester.quantity),
                testerCpu: parseFloat(lineItem.tester.cpu)
              });
            }
          });
        }
      });

      await csvWriter.writeRecords(ordersToWrite);

      return { message: 'success' };
    } catch (e) {
      if (e.message) {
        logger.error('Error trying to get order data: ', e.message);
        logger.error(e.stack);
      } else {
        logger.error(e);
      }

      return {
        statusCode: 500,
        error: 'Internal Configuration Error',
        message: e.message ? e.message : e
      };
    }
  }
});
