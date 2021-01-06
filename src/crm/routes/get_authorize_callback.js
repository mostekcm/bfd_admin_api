import request from 'superagent';
import Joi from 'joi';
import Boom from 'boom';

import config from '../../config';
import logger from '../../logger';

import CrmService from '../../service/CrmService';

const getHubspotState = (state) => {
  let hubspotState = state;
  if (state) {
    hubspotState = state.hubspotState;
  }

  return hubspotState;
};

export default () => ({
  method: 'GET',
  path: '/crm/callback',
  config: {
    description: 'Authorize the app for access to hubspot.',
    tags: ['api'],
    auth: {
      strategies: ['jwt'],
      scope: ['sync:crm'],
      mode: 'optional'
    },
    state: {
      parse: true, // parse and store in request.state
      failAction: 'log' // may also be 'ignore' or 'log'
    },
    validate: {
      query: Joi.object({
        code: Joi.string().max(100),
        state: Joi.string().max(100)
      })
    }
  },
  handler: async (req, h) => {
    const state = req.query.state;
    const hubspotState = getHubspotState(req.state);
    const storedState = hubspotState;
    const returnTo = storedState.returnTo || '/orders';
    // TODO: Figure out how to get stupid state working with HAPI!!!
    if (state !== storedState.nonce) {
      return h.response(Boom.wrap(new Error(`Bad states: ${state} v ${storedState}`))).state('hubspotState', null);
    }
    const redirectUri = config('HUBSPOT_REDIRECT_URI');

    try {
      const response = await request
        .post('https://api.hubapi.com/oauth/v1/token')
        .type('form')
        .send({
          grant_type: 'authorization_code',
          client_id: config('HUBSPOT_CLIENT_ID'),
          client_secret: config('HUBSPOT_CLIENT_SECRET'),
          redirect_uri: redirectUri,
          code: req.query.code
        });
      const service = new CrmService(storedState.user);
      await service.addTokens(response.body);
      return h.redirect(config('FRONTEND_URL') + returnTo).state('hubspotState', null);
    } catch (err) {
      logger.error('Bad request for tokens: ', err, req.query);
      return h.response(Boom.wrap(err)).state('hubspotState', null);
    }
  }
});
