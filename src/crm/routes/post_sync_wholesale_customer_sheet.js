import Boom from 'boom';
import logger from '../../logger';
import DbOrderService from '../../service/OrderService';
import WholesaleCustomerSheetService from '../../service/WholesaleCustomerSheetService';

export default () => ({
  method: 'POST',
  path: '/api/crm/sync-wholesale-customer-sheet',
  config: {
    auth: {
      strategies: ['jwt'],
      scope: ['sync:crm']
    },
    description: 'Sync with the CRM sheet for wholesale customers',
    tags: ['api']
  },
  handler: async (req) => {
    const orderService = new DbOrderService(req.auth.credentials);
    const wholesaleService = new WholesaleCustomerSheetService();

    return orderService.getAll()
      .then(orders => wholesaleService.syncFromOrders(orders))
      .catch((e) => {
        logger.error(e.message);
        logger.error(e.message);
        logger.error(e.stack);
        return Boom.wrap(e);
      });
  }
});
