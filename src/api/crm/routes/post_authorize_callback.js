import request from 'superagent';
import Joi from 'joi';

import config from '../../../config';
import logger from '../../../logger';

import CrmService from '../../../service/CrmService';

export default () => ({
  method: 'POST',
  path: '/api/crm/callback',
  config: {
    description: 'Authorize the app for access to hubspot.',
    tags: ['api'],
    auth: {
      strategies: ['jwt'],
      scope: ['sync:crm']
    },
    validate: {
      payload: {
        code: Joi.string().max(100),
        state: Joi.string().max(100)
      }
    }
  },
  handler: (req, reply) => {
    const state = req.payload.state;
    const redirectUri = config('HUBSPOT_REDIRECT_URI') + `?state=${state}`;
    return request
      .post('https://api.hubapi.com/oauth/v1/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        client_id: config('HUBSPOT_CLIENT_ID'),
        client_secret: config('HUBSPOT_CLIENT_SECRET'),
        redirect_uri: redirectUri,
        code: req.payload.code
      })
      .then((response) => {
        const service = new CrmService();
        service.addTokens(req.auth.credentials.sub, response.body)
          .then(() => reply({ message: 'it worked!!' }));
      })
      .catch((err, res) => {
        logger.error('Bad request for tokens: ', err, res.body);
        reply({
          status: 500,
          error: 'Internal Server Error',
          message: 'internal error occurred'
        });
      });
  }
});
