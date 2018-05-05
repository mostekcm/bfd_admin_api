import Boom from 'boom';
import Joi from 'joi';
import logger from '../../../logger';
import DbOrderService from '../../../service/OrderService';
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
      params: {
        id: Joi.string().guid().required()
      }
    }
  },
  handler: (req, reply) => {
    const crmService = new CrmService(req.auth.credentials.sub);
    const orderService = new DbOrderService(req.auth.credentials.sub);
    orderService.getOrder(req.params.id)
      .then((order) => {
        if (order.store.id) {
          return crmService.getCompany(order.store.id)
            .then(company => orderService.updateCompany(order.id, company))
            .then(company => reply(company));
        }

        return crmService.getCompanyByName(order.store.name)
          .then((companyFromName) => {
            if (companyFromName) {
              return orderService.updateCompany(order.id, companyFromName).then(company => reply(company));
            }
            return reply(Boom.notFound(`No Hubspot Company Found for store: ${order.store.name}`));
          });
      })
      .catch((e) => {
        logger.error(e.message);
        logger.error(e.message);
        logger.error(e.stack);
        return reply(Boom.wrap(e));
      });
  }
});
