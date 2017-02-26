import jwks from 'jwks-rsa';
import logger from './logger';

const validateUser = (decoded, request, callback) => {
  logger.info('Validating user:', decoded);

  if (decoded && decoded.sub) {
    return callback(null, true);
  }

  return callback(null, false);
};

const register = (server, options, next) => {
  server.auth.strategy('jwt', 'jwt', {
    // Get the complete decoded token, because we need info from the header (the kid)
    complete: true,

    // Dynamically provide a signing key based on the kid in the header and the singing keys provided by the JWKS endpoint.
    key: jwks.hapiJwt2Key({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 2,
      jwksUri: 'https://beautyfullday.auth0.com/.well-known/jwks.json'
    }),

    // Your own logic to validate the user.
    validateFunc: validateUser,

    // Validate the audience and the issuer.
    verifyOptions: {
      audience: 'https://bfd_admin.beautyfullday.com/api/v1',
      issuer: 'https://beautyfullday.auth0.com/',
      algorithms: ['RS256']
    }
  });

  server.auth.default('jwt');

  next();
};

register.attributes = {
  name: 'auth'
};

export default register;
