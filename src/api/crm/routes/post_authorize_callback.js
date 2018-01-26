import request from 'superagent';
import Joi from 'joi';

import config from '../../../config';
import logger from '../../../logger';
import { STATE_COOKIE_NAME } from './constants';

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
        code: Joi.string().max(1000)
      }
    }
  },
  handler: (req, reply) => request
    .post('https://api.hubapi.com/oauth/v1/token')
    .type('form')
    .send({
      grant_type: 'authorization_code',
      client_id: config('HUBSPOT_CLIENT_ID'),
      client_secret: config('HUBSPOT_CLIENT_SECRET'),
      redirect_uri: config('HUBSPOT_REDIRECT_URI'),
      code: req.payload.code
    })
    .set('accept', 'json')
    .then((response) => {
      console.log('carlos: response body: ', response.body);
      reply({ message: 'it worked!!' }).unstate(STATE_COOKIE_NAME);
    })
    .catch((err) => {
      logger.error('Bad request for tokens: ', err);
      reply({
        status: 500,
        error: 'Internal Server Error',
        message: 'internal error occurred'
      }).unstate(STATE_COOKIE_NAME);
    })
});
