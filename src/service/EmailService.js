import nodemailer from 'nodemailer';
import auth0 from 'auth0';

import logger from '../logger';
import config from '../config';

export default class EmailService {
  constructor(admin) {
    this.admin = admin;

    /* Using this admin, fetch the access token and refresh token from the management API */
  }

  getTransport() {
    if (!this.transport) {
      const me = this;
      this.transport = new Promise((resolve, reject) => {
        const authClient = new auth0.AuthenticationClient({
          domain: config('AUTH0_DOMAIN'),
          clientId: config('AUTH0_CLIENT_ID'),
          clientSecret: config('AUTH0_CLIENT_SECRET')
        });

        authClient.clientCredentialsGrant(
          {
            audience: `https://${config('AUTH0_DOMAIN')}/api/v2/`
          },
          (err, response) => {
            if (err) {
              return reject(err);
            }

            const mgmtClient = new auth0.ManagementClient({
              domain: config('AUTH0_DOMAIN'),
              token: response.access_token
            });

            return mgmtClient.users.get({ id: me.admin.sub })
              .then((user) => {
                me.transport = nodemailer.createTransport({
                  host: 'smtp.gmail.com',
                  port: 465,
                  secure: true,
                  auth: {
                    type: 'OAuth2',
                    user: me.admin.email,
                    clientId: config('GOOGLE_CLIENT_ID'),
                    clientSecret: config('GOOGLE_CLIENT_SECRET'),
                    refreshToken: user.app_metadata.google_refresh_token,
                    accessToken: user.identities[0].access_token
                  }
                });
                return resolve(me.transport);
              })
              .catch(reject);
          });
      });
    }

    return Promise.resolve(this.transport);
  }

  sendEmail(from, to, cc, bcc, subject, body, pdfName, pdf) {
    return new Promise((resolve, reject) =>
      this.getTransport()
        .then(transport => transport.sendMail({
          from,
          to,
          cc,
          bcc,
          subject,
          text: body,
          attachments: [{
            filename: pdfName,
            content: pdf,
            contentType: 'application/pdf'
          }]
        }, (err, emailInfo) => {
          if (err) {
            logger.error(err);
            return reject(err);
          }
          logger.info('Sent email and got: ', emailInfo);
          return resolve(emailInfo);
        })));
  }
}
