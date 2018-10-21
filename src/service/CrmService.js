import _ from 'lodash';
import moment from 'moment';
import Promise from 'bluebird';
import mongo from 'mongodb';
import request from 'superagent';

import logger from '../logger';
import config from '../config';

import EmailService from './EmailService';

const EMAIL_STAGE = {
  PAID_INVOICE: 'PAID_INVOICE',
  INVOICE: 'INVOICE',
  ORDER_CONFIRMATION: 'ORDER_CONFIRMATION'
};

const DEAL_STAGE = {
  CLOSED_WON: 'Closed Won',
  CLOSED_LOST: 'Closed Lost',
  QUALIFYING: 'Qualifying',
  PENDING: 'Pending Approval',
  APPROVED: 'Approved'
};

const PAYMENT_METHOD = {
  CREDIT: 'credit',
  CHECK: 'check'
};

const PAYMENT_NET = {
  NET_0: 'NET 0',
  NET_30: 'NET 30',
  NET_45: 'NET 45'
};

export default class CrmService {
  constructor(admin) {
    // TODO: Do caching for this
    // TODO: Move this to a provider pattern
    this.db = null;
    this.adminId = admin.sub;
    this.admin = admin;
  }

  static mapHubSpotCompaniesToBfd(companies) {
    return _(companies)
      .map(company => CrmService.mapHubSpotCompanyToBfd(company))
      .sortBy('name')
      .value();
  }

  static mapHubSpotContactPropertiesToInfo(contact) {
    const properties = _.mapValues(contact.properties, 'value');
    const firstName = properties.firstname && properties.firstname.length > 0 ? properties.firstname : undefined;
    const lastName = properties.lastname && properties.lastname.length > 0 ? properties.lastname : undefined;
    let name = `${firstName} ${lastName}`;
    if (!firstName || !lastName) {
      if (!firstName && !lastName) {
        name = undefined;
      } else {
        name = `${firstName || lastName}`;
      }
    }
    return {
      id: contact.vid,
      name,
      phone: properties.phone,
      email: properties.email,
      include_on_orders: properties.include_on_orders
    };
  }

  static mapHubSpotContactsToBfd(contacts, company) {
    company.contacts = _(contacts)
      .map(contact => CrmService.mapHubSpotContactPropertiesToInfo(contact))
      .value();

    const includeOnly = _(company.contacts)
      .filter(contact => contact.include_on_orders === 'true')
      .value();

    if (includeOnly && includeOnly.length > 0) {
      company.contacts = includeOnly;
    } else {
      company.contacts = _(company.contacts)
        .filter(contact => contact.include_on_orders !== 'false')
        .value();
    }

    return company;
  }

  static mapHupSpotPropertiesToStoreInfo(properties) {
    const billingAddress = properties.billing_street_address ?
      `${properties.billing_street_address}${properties.billing_street_address_2 ? ', ' + properties.billing_street_address_2 : ''}, ${properties.billing_city}, ${properties.billing_state}  ${properties.billing_postal_code}` :
      undefined;

    const shippingAddress = properties.address ?
      `${properties.address}${properties.address2 ? ', ' + properties.address2 : ''}, ${properties.city}, ${properties.state}  ${properties.zip}` :
      undefined;

    const paymentTerms = {
      net: properties.payment_net ? properties.payment_net : PAYMENT_NET.NET_0,
      method: properties.payment_method || PAYMENT_METHOD.CREDIT
    };

    return {
      name: properties.name,
      shippingAddress,
      billingAddress,
      paymentTerms
    };
  }

  static mapHubSpotCompanyToBfd(company) {
    return _.assign({},
      { id: company.companyId },
      CrmService.mapHupSpotPropertiesToStoreInfo(_.mapValues(company.properties, 'value')));
  }

  getDb() {
    if (this.db !== null) {
      logger.debug('Using cached db');
      return Promise.resolve(this.db);
    }

    const me = this;

    return mongo.MongoClient.connect(config('MONGO_URI'))
      .then((db) => {
        me.db = db;
        return db;
      });
  }

  init() {
    return this.getDb().then(() => true);
  }

  addTokens(tokens) {
    return this.getDb()
      .then((db) => {
        const expiresAt = moment().unix() + tokens.expires_in;
        const hubSpot = db.collection('hubspot');
        return hubSpot.update({ id: this.adminId },
          _.assign({}, {
            id: this.adminId,
            expiresAt
          }, tokens),
          { upsert: true });
      });
  }

  getAccessToken() {
    const id = this.adminId;
    return this.getDb()
      .then((db) => {
        const hubSpot = db.collection('hubspot');
        return hubSpot.findOne({
          id
        })
          .then((hubSpotInfo) => {
            if (hubSpotInfo.expiresAt < moment().unix()) {
              /* Use Refresh Token to get a new access token */
              const redirectUri = config('HUBSPOT_REDIRECT_URI') + `?state=${hubSpotInfo.state}`;

              return request
                .post('https://api.hubapi.com/oauth/v1/token')
                .type('form')
                .send({
                  grant_type: 'refresh_token',
                  client_id: config('HUBSPOT_CLIENT_ID'),
                  client_secret: config('HUBSPOT_CLIENT_SECRET'),
                  redirect_uri: redirectUri,
                  refresh_token: hubSpotInfo.refresh_token
                })
                .then((response) => {
                  const expiresAt = moment().unix() + response.body.expires_in;
                  return hubSpot.updateOne({ id }, {
                    $set: _.assign({}, {
                      expiresAt
                    }, response.body)
                  })
                    .then(() => response.body.access_token);
                });
            }

            return hubSpotInfo.access_token;
          });
      });
  }

  getCompanies() {
    return this.getAccessToken()
      .then(accessToken => request
        .get('https://api.hubapi.com/companies/v2/companies/paged?limit=250&properties=name')
        .set('Authorization', `Bearer ${accessToken}`)
        .then(response => CrmService.mapHubSpotCompaniesToBfd(response.body.companies)));
  }

  static getContactInfo(accessToken, company) {
    return request
      .get(`https://api.hubapi.com/companies/v2/companies/${company.id}/vids`)
      .set('Authorization', `Bearer ${accessToken}`)
      .then(response => Promise.map(response.body.vids, vid => request
        .get(`https://api.hubapi.com/contacts/v1/contact/vid/${vid}/profile`)
        .set('Authorization', `Bearer ${accessToken}`)))
      .then(contacts => CrmService.mapHubSpotContactsToBfd(_.map(contacts, contact => contact.body), company));
  }

  getCompany(companyId) {
    return this.getAccessToken(this.adminId)
      .then(accessToken => request
        .get(`https://api.hubapi.com/companies/v2/companies/${companyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .then(response => CrmService.mapHubSpotCompanyToBfd(response.body))
        .then(company => CrmService.getContactInfo(accessToken, company)));
  }

  getShortCompanyByName(companyName) {
    return this.getCompanies()
      .then(companies => _.find(companies, company => company.name === companyName));
  }

  getCompanyByName(companyName) {
    return this.getShortCompanyByName(companyName)
      .then((company) => {
        if (!company) return company; // return early if not defined

        return this.getCompany(company.id);
      });
  }

  /**
   * Email methods
   */
  static getEmailStage(order) {
    if (order.dealStage === DEAL_STAGE.CLOSED_WON) {
      if (Math.abs(order.totals.owed) > 0.01) {
        return EMAIL_STAGE.INVOICE;
      }
      return EMAIL_STAGE.PAID_INVOICE;
    }

    return EMAIL_STAGE.ORDER_CONFIRMATION;
  }

  sendEmail(order, emailText, pdfBuffer) {
    const emailStage = CrmService.getEmailStage(order);
    const pdfName = `${order.store.name} ${emailStage} ${order.invoiceNumber} ${moment().format('MM-DD-YY')}.pdf`;

    /* Create engagement */
    const emailService = new EmailService(this.admin);
    return emailService.sendEmail(this.admin.email, _.map(order.store.contacts, contact => contact.email), undefined, undefined, emailStage, emailText, pdfName, pdfBuffer)
      .then(() =>
        this.getAccessToken(this.adminId)
          .then(accessToken => request
            .post('https://api.hubapi.com/filemanager/api/v2/files?hidden=true')
            .set('Authorization', `Bearer ${accessToken}`)
            .attach('files', pdfBuffer, pdfName)
            .field('folder_paths', `emails/deals/${order.invoiceNumber}`)
            .then((response) => {
              const engagement = {
                engagement: {
                  active: true,
                  type: 'EMAIL'
                },
                associations: {
                  contactIds: _.map(order.store.contacts, contact => contact.id),
                  companyIds: [order.store.id],
                  dealIds: [order.dealId]
                },
                attachments: [
                  {
                    id: response.body.objects[0].id
                  }
                ],
                metadata: {
                  from: {
                    email: this.admin.email
                  },
                  to: _.map(order.store.contacts, contact => ({ email: contact.email })),
                  cc: [],
                  bcc: [],
                  subject: emailStage,
                  // html: " email body in html ",
                  text: emailText
                }
              };
              return request
                .post('https://api.hubapi.com/engagements/v1/engagements')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(engagement);
            }))
          .then(() => emailStage));
  }
}
