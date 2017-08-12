import getCases from './api/cases/routes/get_cases';
import getDisplays from './api/displays/routes/get_displays';
import moveToMongo from './api/orders/routes/move_to_mongo';
import getOrders from './api/orders/routes/get_orders';
import getOrder from './api/orders/routes/get_order';
import postOrder from './api/orders/routes/post_order';
import patchOrder from './api/orders/routes/patch_order';
import deleteOrder from './api/orders/routes/delete_order';
import getCommissionDueReport from './api/reports/routes/get_commission_due';
import getShowReport from './api/reports/routes/get_show';
import getMonthReport from './api/reports/routes/get_month';
import getLabelUses from './api/labels/routes/get_label_uses';

const register = (server, options, next) => {
  server.route(getCases(server));
  server.route(getDisplays(server));
  server.route(getOrders(server));
  server.route(getOrder(server));
  server.route(moveToMongo(server));
  server.route(postOrder(server));
  server.route(patchOrder(server));
  server.route(deleteOrder(server));
  server.route(getCommissionDueReport(server));
  server.route(getShowReport(server));
  server.route(getMonthReport(server));
  server.route(getLabelUses(server));
  next();
};

register.attributes = {
  name: 'routes'
};

export default register;
