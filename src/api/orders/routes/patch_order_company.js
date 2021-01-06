import Boom from 'boom';
import Joi from 'joi';
import logger from '../../../logger';
import OrderService from '../../../service/OrderService';
import CrmService from '../../../service/CrmService';

export default () => ({
  method: 'PATCH',
  path: '/api/orders/{id}/company',
  config: {
    auth: {
      strategies: ['jwt'],
      scope: ['update:orders']
    },
    description: 'Update the company from hubspot',
    tags: ['api'],
    validate: {
      params: Joi.object({
        id: Joi.string().guid().required()
      })
    }
  },
  handler: async (req) => {
    const crmService = new CrmService(req.auth.credentials);
    const orderService = new OrderService(req.auth.credentials);

    const updateCompanyByName = async (order) => {
      const companyFromName = await crmService.getCompanyByName(order.store.name);
      if (companyFromName) {
        return orderService.updateCompany(order.id, companyFromName);
      }
      return Boom.notFound(`No Hubspot Company Found for store: ${order.store.name}`);
    };

    try {
      const order = await orderService.getOrder(req.params.id);
      if (order.store.id) {
        try {
          const company = await crmService.getCompany(order.store.id);
          return orderService.updateCompany(order.id, company);
        } catch (err) {
          if (err.message === 'Not Found') {
            return updateCompanyByName(order);
          }
          logger.error('Error updating company: ', err);
          return Boom.wrap(err);
        }
      }

      return updateCompanyByName(order);
    } catch (e) {
      logger.error(e.message);
      logger.error(e.stack);
      return Boom.wrap(e);
    }
  }
});
