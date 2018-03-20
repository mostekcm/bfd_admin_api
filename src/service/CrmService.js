import _ from 'lodash';
import moment from 'moment';
import Promise from 'bluebird';
import mongo from 'mongodb';
import request from 'superagent';

import logger from '../logger';
import config from '../config';

export default class CrmService {
  constructor() {
    // TODO: Do caching for this
    // TODO: Move this to a provider pattern
    this.db = null;
  }

  static mapHubSpotCompaniesToBfd(companies) {
    return _(companies)
      .map(company => CrmService.mapHubSpotCompanyToBfd(company))
      .sortBy('name')
      .value();
  }

  static mapHubSpotContactPropertiesToInfo(contact) {
    const properties = _.mapValues(contact.properties, 'value');
    return {
      id: contact.vid,
      name: `${properties.firstname} ${properties.lastname}`,
      phone: properties.phone,
      email: properties.email
    };
  }

  static mapHubSpotContactsToBfd(contacts, company) {
    company.contacts = _(contacts)
      .map(contact => CrmService.mapHubSpotContactPropertiesToInfo(contact))
      .value();

    return company;
  }

  static mapHupSpotPropertiesToStoreInfo(properties) {
    const billingAddress = properties.billing_street_address ?
      `${properties.billing_street_address}${properties.billing_street_address_2 ? ', ' + properties.billing_street_address_2 : ''}, ${properties.billing_city}, ${properties.billing_state}  ${properties.billing_postal_code}` :
      undefined;

    const shippingAddress = properties.address ?
      `${properties.address}${properties.address2 ? ', ' + properties.address2 : ''}, ${properties.city}, ${properties.state}  ${properties.zip}` :
      undefined;

    return {
      name: properties.name,
      shippingAddress,
      billingAddress
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

  addTokens(id, tokens) {
    return this.getDb()
      .then((db) => {
        const expiresAt = moment().unix() + tokens.expires_in;
        const hubSpot = db.collection('hubspot');
        return hubSpot.insertOne(_.assign({}, {
          id,
          expiresAt
        }, tokens));
      });
  }

  getAccessToken(id) {
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

  getCompanies(id) {
    return this.getAccessToken(id)
      .then(accessToken => request
        .get('https://api.hubapi.com/companies/v2/companies/paged?properties=name')
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

  getCompany(requestId, companyId) {
    return this.getAccessToken(requestId)
      .then(accessToken => request
        .get(`https://api.hubapi.com/companies/v2/companies/${companyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .then(response => CrmService.mapHubSpotCompanyToBfd(response.body))
        .then(company => CrmService.getContactInfo(accessToken, company)));
  }

  getCompanyByName(requestId, companyName) {
    return this.getCompanies(requestId)
      .then(companies => _.find(companies, company => company.name === companyName))
      .then((company) => {
        if (!company) return company; // return early if not defined

        return this.getCompany(requestId, company.id);
      });
  }
}
