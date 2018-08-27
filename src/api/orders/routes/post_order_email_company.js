import moment from 'moment';
import Boom from 'boom';
import Joi from 'joi';
import logger from '../../../logger';
import OrderService from '../../../service/OrderService';
import CrmService from '../../../service/CrmService';
import PdfService from '../../../service/PdfService';

export default () => ({
  method: 'POST',
  path: '/api/orders/{id}/email',
  config: {
    auth: {
      strategies: ['jwt'],
      scope: ['update:orders']
    },
    description: 'Send an email to the company for the current stage',
    tags: ['api'],
    payload: {
      maxBytes: 100000000
    },
    validate: {
      params: {
        id: Joi.string().guid().required()
      },
      payload: {
        emailText: Joi.string().required(),
        pdf: Joi.binary().required().max(100000000)
      }
    }
  },
  handler: (req, reply) => {
    const crmService = new CrmService(req.auth.credentials);
    const orderService = new OrderService(req.auth.credentials);

    orderService.getOrder(req.params.id)
      .then((order) => {
        if (!order.dealId) return reply(Boom.notFound('Must Pull Company from HubSpot before you can send emails'));

        return PdfService.FromImageToBuffer(req.payload.pdf)
          .then(pdfBuffer =>
            crmService.sendEmail(order, req.payload.emailText, pdfBuffer)
              .then((emailStage) => {
                const emailsSent = order.emailsSent || [];
                emailsSent.push({
                  date: moment().unix(),
                  stage: emailStage
                });
                return orderService.patchOrder(order.id, { emailsSent })
                  .then(reply);
              }));
      })
      .catch((e) => {
        logger.error(e.message);
        logger.error(e.message);
        logger.error(e.stack);
        return reply(Boom.wrap(e));
      });
  }
});
