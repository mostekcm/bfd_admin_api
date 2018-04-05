import getCases from './api/cases/routes/get_cases';
import getCompanies from './api/companies/routes/get_companies';
import getCompany from './api/companies/routes/get_company';
import getDisplays from './api/displays/routes/get_displays';
import getOrders from './api/orders/routes/get_orders';
import getOrder from './api/orders/routes/get_order';
import postOrder from './api/orders/routes/post_order';
import patchOrder from './api/orders/routes/patch_order';
import patchOrderCompany from './api/orders/routes/patch_order_company';
import deleteOrder from './api/orders/routes/delete_order';
import getCommissionDueReport from './api/reports/routes/get_commission_due';
import getShowReport from './api/reports/routes/get_show';
import getMonthReport from './api/reports/routes/get_month';
import getPackages from './api/packages/routes/get_packages';
import getPaymentsReport from './api/reports/routes/get_payments';
import getShipmentsReport from './api/reports/routes/get_shipments';
import getLabelUses from './api/labels/routes/get_label_uses';

// CRM
import syncWholesaleCustomerSheet from './api/crm/routes/post_sync_wholesale_customer_sheet';
import crmAuthorizeCallback from './api/crm/routes/post_authorize_callback';
import crmAuthorizeHubspot from './api/crm/routes/get_authorize_hubspot';

const register = (server, options, next) => {
  server.route(getCases(server));
  server.route(getCompanies(server));
  server.route(getCompany(server));
  server.route(getDisplays(server));
  server.route(getOrders(server));
  server.route(getOrder(server));
  server.route(postOrder(server));
  server.route(patchOrder(server));
  server.route(patchOrderCompany(server));
  server.route(deleteOrder(server));
  server.route(getCommissionDueReport(server));
  server.route(getShowReport(server));
  server.route(getMonthReport(server));
  server.route(getPackages(server));
  server.route(getPaymentsReport(server));
  server.route(getShipmentsReport(server));
  server.route(getLabelUses(server));
  // CRM
  server.route(syncWholesaleCustomerSheet(server));
  server.route(crmAuthorizeCallback(server));
  server.route(crmAuthorizeHubspot(server));

  next();
};

register.attributes = {
  name: 'routes'
};

export default register;
