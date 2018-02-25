import queryString from 'querystring';
import uuid from 'uuid';

import config from '../../../config';

export default () => ({
  method: 'GET',
  path: '/api/crm/authorize',
  config: {
    auth: {
      strategies: ['jwt'],
      scope: ['sync:crm']
    },
    description: 'Authorize the app for access to hubspot.',
    state: {
      parse: true,
      failAction: 'error'
    },
    tags: ['api']
  },
  handler: (req, reply) => {
    const state = uuid.v4();
    return reply({
      authorizeUrl: `https://app.hubspot.com/oauth/authorize?${queryString.stringify({
        client_id: config('HUBSPOT_CLIENT_ID'),
        redirect_uri: config('HUBSPOT_REDIRECT_URI') + `?state=${state}`,
        scope: 'contacts'
      })}`
    });
  }
});
