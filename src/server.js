import Hapi from '@hapi/hapi';
import jwt from 'hapi-auth-jwt2';
import cors from 'hapi-cors';

import logger from './logger';
import config from './config';
import routes from './routes';
import auth from './auth';

const corsPlugin = {
  plugin: cors,
  options: {
    methods: ['POST, GET, OPTIONS, DELETE, PUT, PATCH'],
    origins: JSON.parse(config('BFD_CORS_ORIGINS'))
  }
};

// Start the server.
const server = new Hapi.Server({
  host: '0.0.0.0',
  port: config('PORT'),
  routes: {
    cors: true
  }
});

// const jwtPlugin = { plugin: jwt };
const authPlugin = { plugin: auth };
const routesPlugin = { plugin: routes };

const startService = {
  start: async () => {
    await server.register([jwt, corsPlugin, authPlugin, routesPlugin])
      .catch((err) => {
        logger.debug('origins: ', config('BFD_CORS_ORIGINS'));
        if (err) {
          logger.error(err);
        }

        try {
          server.route([
            {
              method: 'GET',
              path: '/',
              config: {
                cors: true,
                auth: 'jwt'
              },
              handler: (request, reply) => {
                // This is the user object
                // TODO: Is this leaking the token?
                reply(request.auth.credentials);
              }
            }
          ]);
        } catch (e) {
          logger.error(e.message);
          logger.error(e.stack);
        }
      });

    await server.state('hubspotState', {
      ttl: 1000 * 60 * 60 * 24, // 1 day lifetime
      encoding: 'base64json', // cookie data is JSON-stringified and Base64 encoded,
      isSameSite: false,
      path: '/'
    });

    await server.start();
  }
};

export default startService;
