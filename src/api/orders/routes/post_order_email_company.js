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
      params: Joi.object({
        id: Joi.string().guid().required()
      }),
      payload: Joi.object({
        emailText: Joi.string().required(),
        pdf: Joi.binary().required().max(100000000)
      })
    }
  },
  handler: async (req) => {
    const crmService = new CrmService(req.auth.credentials);
    const orderService = new OrderService(req.auth.credentials);

    try {
      const order = await orderService.getOrder(req.params.id);
      if (!order.dealId) return Boom.notFound('Must Pull Company from HubSpot before you can send emails');

      const pdfBuffer = await PdfService.FromImageToBuffer(req.payload.pdf);
      const emailStage = await crmService.sendEmail(order, req.payload.emailText, pdfBuffer);
      const emailsSent = order.emailsSent || [];
      emailsSent.push({
        date: moment().unix(),
        stage: emailStage
      });
      return orderService.patchOrder(order.id, { emailsSent });
    } catch (e) {
      logger.error(e.message);
      logger.error(e.stack);
      return Boom.wrap(e);
    }
  }
});
