import getCases from './api/cases/routes/get_cases';
import getOrders from './api/orders/routes/get_orders';
import postOrder from './api/orders/routes/post_order';

const register = (server, options, next) => {
  server.route(getCases(server));
  server.route(getOrders(server));
  server.route(postOrder(server));
  next();
};

register.attributes = {
  name: 'routes'
};

export default register;
