import pdfkit from 'pdfkit';
import sharp from 'sharp';

const letterWidth = 612.0;
const letterHeight = 792.0;
const bottomMargin = 75.0;
const topMargin = 75.0;
const imageHeight = letterHeight - topMargin - bottomMargin;

export default class PdfService {
  static FromImageToBuffer(rawImage) {
    let scale = 0;
    const image = sharp(rawImage);
    return image
      .metadata()
      .then((metadata) => {
        scale = letterWidth / metadata.width;
        return image
          .toBuffer()
          .then((imageData) => {
            const service = new PdfService(scale);
            return service.addNextPage(imageData)
              .then(() => service.getData());
          });
      });
  }

  constructor(scale) {
    this.scale = scale;
    this.buffers = [];
    this.doc = new pdfkit({
      autoFirstPage: false
    });
    this.doc.on('data', this.buffers.push.bind(this.buffers));
  }

  getData() {
    return new Promise((resolve) => {
      this.doc.on('end', () => {
        this.pdfData = Buffer.concat(this.buffers);
        resolve(this.pdfData);
      });
      this.doc.end();
    });
  }

  addImagePage(imageData) {
    this.doc.addPage({
      margins: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      }
    });
    this.doc.image(imageData, 0, topMargin, { scale: this.scale });
  }

  addNextPage(imageData) {
    return sharp(imageData)
      .metadata()
      .then((metadata) => {
        const rawHeight = parseInt(imageHeight / this.scale, 10);
        if (metadata.height > rawHeight) {
          return sharp(imageData)
            .resize({
              width: metadata.width,
              height: rawHeight,
              fit: 'cover',
              position: sharp.gravity.north
            })
            .toBuffer()
            .then((croppedImageData) => {
              this.addImagePage(croppedImageData);
              return sharp(imageData)
                .resize({
                  width: metadata.width,
                  height: metadata.height - rawHeight,
                  fit: 'cover',
                  position: sharp.gravity.south
                })
                .toBuffer()
                .then(finalCropped => this.addNextPage(finalCropped));
            });
        }

        this.addImagePage(imageData);
        return Promise.resolve();
      });
  }
}
