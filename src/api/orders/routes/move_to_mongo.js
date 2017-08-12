import Boom from 'boom';
import _ from 'lodash';
import logger from '../../../logger';
import OrderService from '../../../service/OrderService';
import DbOrderService from '../../../service/DbOrderService';

export default () => ({
  method: 'POST',
  path: '/api/move_orders_to_mongo',
  config: {
    auth: {
      strategies: ['jwt'],
      scope: ['create:orders']
    },
    description: 'Create a new order..',
    tags: ['api']
  },
  handler: (req, reply) => {
    const service = new OrderService();
    const dbService = new DbOrderService();
    service.getAll()
      .then(orders =>
        dbService.init()
          .then(() => {
            const orderPromises = [];
            _.values(orders).forEach(order => orderPromises.push(dbService.addOrder(order)));
            return Promise.all(orderPromises).then(() => reply({ message: `Successfully transferred ${orderPromises.length} orders` }));
          }))
      .catch((e) => {
        logger.error('Error transferring orders: ', e.message);
        logger.error(e.stack);
        return reply(Boom.wrap(e));
      });
  }
});
