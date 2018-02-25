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
        .get('https://api.hubapi.com/companies/v2/companies/paged?properties=address&properties=name&properties=state&properties=city')
        .set('Authorization', `Bearer ${accessToken}`)
        .then(response => response.body.companies));
  }
}
