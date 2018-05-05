import Boom from 'boom';
import logger from '../../../logger';
import DbOrderService from '../../../service/OrderService';
import WholesaleCustomerSheetService from '../../../service/WholesaleCustomerSheetService';

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
  handler: (req, reply) => {
    const orderService = new DbOrderService(req.auth.credentials.sub);
    const wholesaleService = new WholesaleCustomerSheetService();

    orderService.getAll()
      .then(orders => wholesaleService.syncFromOrders(orders))
      .then(response => reply(response))
      .catch((e) => {
        logger.error(e.message);
        logger.error(e.message);
        logger.error(e.stack);
        return reply(Boom.wrap(e));
      });
  }
});
