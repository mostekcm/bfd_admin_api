import _ from 'lodash';
import queryString from 'querystring';
import uuid from 'uuid';

import config from '../../config';

export default () => ({
  method: 'POST',
  path: '/crm/authorize',
  config: {
    auth: {
      strategies: ['jwt'],
      scope: ['sync:crm']
    },
    description: 'Authorize the app for access to hubspot.',
    state: {
      parse: true, // parse and store in request.state
      failAction: 'log' // may also be 'ignore' or 'log'
    },
    tags: ['api']
  },
  handler: async (req, h) => {
    let returnTo = _.get(req, 'payload.returnTo', '/orders');
    if (!returnTo.startsWith('/') || returnTo.startsWith('//')) returnTo = '/orders';

    const state = {
      nonce: uuid.v4(),
      returnTo,
      user: req.auth.credentials
    };

    return h.response({
      url: `https://app.hubspot.com/oauth/authorize?${queryString.stringify({
        client_id: config('HUBSPOT_CLIENT_ID'),
        redirect_uri: config('HUBSPOT_REDIRECT_URI'),
        state: state.nonce,
        scope: 'contacts files'
      })}`
    })
      .state('hubspotState', state);
  }
});
