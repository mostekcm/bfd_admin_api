import getCases from './api/cases/routes/get_cases';

const register = (server, options, next) => {
  server.route(getCases(server));
  next();
};

register.attributes = {
  name: 'routes'
};

export default register;
