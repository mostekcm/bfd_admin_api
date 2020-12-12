import jwks from 'jwks-rsa';
import jwt from 'jsonwebtoken';
import Boom from 'boom';
// import logger from './logger';
import config from './config';

const validateUser = async (decoded) => {
  if (decoded && decoded.sub) {
    return { isValid: true, credentials: decoded };
  }

  return { isValid: false };
};

const jwtOptions = {
  // Dynamically provide a signing key based on the kid in the header and the singing keys provided by the JWKS endpoint.
  key: jwks.hapiJwt2Key({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 2,
    jwksUri: `https://${config('AUTH0_DOMAIN')}/.well-known/jwks.json`
  }),

  // Validate the audience and the issuer.
  verifyOptions: {
    audience: config('AUDIENCE'),
    issuer: `https://${config('AUTH0_DOMAIN')}/`,
    algorithms: ['RS256']
  }
};

const verifyFunc = async (decoded, req) => {
  if (!decoded) {
    return { isValid: false };
  }
  let token = null;
  if (req.headers.authorization && req.headers.authorization.indexOf('Bearer ') === 0) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token && req.body.token) {
    token = req.body.token;
  }
  if (token) {
    if (decoded && decoded.payload && decoded.payload.iss === `https://${config('AUTH0_DOMAIN')}/`) {
      return new Promise((resolve, reject) => {
        jwtOptions.key(decoded, (keyErr, key) => {
          if (keyErr) {
            return reject(Boom.wrap(keyErr));
          }

          return jwt.verify(token, key, jwtOptions.verifyOptions, (err) => {
            if (err) {
              return reject(Boom.unauthorized('Invalid token', 'Token'));
            }

            if (decoded.payload.scope && typeof decoded.payload.scope === 'string') {
              decoded.payload.scope = decoded.payload.scope.split(' '); // eslint-disable-line no-param-reassign
            }

            if (decoded.payload['http://beautyfullday.com/claims/email']) {
              decoded.payload.email = decoded.payload['http://beautyfullday.com/claims/email'];
            }

            return resolve(validateUser(decoded.payload, req));
          });
        });
      });
    }
  }

  return { isValid: false };
};

const plugin = {
  register: async (server) => {
    server.auth.strategy('jwt', 'jwt', {
      // Get the complete decoded token, because we need info from the header (the kid)
      complete: true,

      // // Your own logic to validate the user.
      // validate: validateUser,
      urlKey: false,

      attemptToExtractTokenInPayload: true,

      payload: verifyFunc,

      payloadFunc: verifyFunc,

      // Our own verify function because the hapi one is no good
      verify: verifyFunc

    });

    server.auth.default('jwt');
  },
  name: 'auth',
  version: '1.0.0'
};

export default plugin;
