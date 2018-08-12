import Boom from 'boom';
import moment from 'moment';
import fs from 'fs';
import Joi from 'joi';
import pdfkit from 'pdfkit';
import sharp from 'sharp';
import logger from '../../../logger';
import DbOrderService from '../../../service/OrderService';
// import CrmService from '../../../service/CrmService';

const letterWidth = 612.0;
const letterHeight = 792.0;
const bottomMargin = 75.0;
const topMargin = 75.0;
const imageHeight = letterHeight - topMargin - bottomMargin;

const addImagePage = (doc, scale, imageData) => {
  doc.addPage({
    margins: {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0
    }
  });
  doc.image(imageData, 0, topMargin, { scale });
};

const addNextPage = (doc, scale, imageData) => sharp(imageData)
  .metadata()
  .then((metadata) => {
    const rawHeight = parseInt(imageHeight / scale, 10);
    if (metadata.height > rawHeight) {
      return sharp(imageData)
        .resize(metadata.width, rawHeight)
        .crop(sharp.gravity.north)
        .toBuffer()
        .then((croppedImageData) => {
          addImagePage(doc, scale, croppedImageData);
          return sharp(imageData)
            .resize(metadata.width, metadata.height - rawHeight)
            .crop(sharp.gravity.south)
            .toBuffer()
            .then(finalCropped => addNextPage(doc, scale, finalCropped));
        });
    }

    addImagePage(doc, scale, imageData);
    return Promise.resolve();
  });

export default () => ({
  method: 'POST',
  path: '/api/orders/{id}/pdf',
  config: {
    auth: {
      strategies: ['jwt'],
      scope: ['update:orders']
    },
    description: 'Save PDF for this order',
    tags: ['api'],
    payload: {
      maxBytes: 100000000
    },
    validate: {
      params: {
        id: Joi.string().guid().required()
      },
      payload: {
        pdf: Joi.binary().required().max(100000000)
      }
    }
  },
  handler: (req, reply) => {
    const service = new DbOrderService(req.auth.credentials.sub);
    logger.info(`Posting PDF for order ${req.params.id}`);
    // const crmService = new CrmService(req.auth.credentials.sub);

    service.getOrder(req.params.id)
      .then((order) => {
        let scale = 0;
        const image = sharp(req.payload.pdf);
        image
          .metadata()
          .then((metadata) => {
            scale = letterWidth / metadata.width;
            return image
              .toBuffer()
              .then((imageData) => {
                const doc = new pdfkit({
                  autoFirstPage: false
                });
                doc.pipe(fs.createWriteStream(`${order.store.name} Invoice ${order.invoiceNumber} ${moment().format('MM-DD-YYYY')}.pdf`));

                return addNextPage(doc, scale, imageData)
                  .then(() => {
                    doc.end();
                    return reply().code(204);
                  });
              });
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
