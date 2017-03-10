'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _get_cases = require('./api/cases/routes/get_cases');

var _get_cases2 = _interopRequireDefault(_get_cases);

var _get_displays = require('./api/displays/routes/get_displays');

var _get_displays2 = _interopRequireDefault(_get_displays);

var _get_orders = require('./api/orders/routes/get_orders');

var _get_orders2 = _interopRequireDefault(_get_orders);

var _get_order = require('./api/orders/routes/get_order');

var _get_order2 = _interopRequireDefault(_get_order);

var _post_order = require('./api/orders/routes/post_order');

var _post_order2 = _interopRequireDefault(_post_order);

var _delete_order = require('./api/orders/routes/delete_order');

var _delete_order2 = _interopRequireDefault(_delete_order);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var register = function register(server, options, next) {
  server.route((0, _get_cases2.default)(server));
  server.route((0, _get_displays2.default)(server));
  server.route((0, _get_orders2.default)(server));
  server.route((0, _get_order2.default)(server));
  server.route((0, _post_order2.default)(server));
  server.route((0, _delete_order2.default)(server));
  next();
};

register.attributes = {
  name: 'routes'
};

exports.default = register;