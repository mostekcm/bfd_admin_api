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

var _patch_order = require('./api/orders/routes/patch_order');

var _patch_order2 = _interopRequireDefault(_patch_order);

var _delete_order = require('./api/orders/routes/delete_order');

var _delete_order2 = _interopRequireDefault(_delete_order);

var _get_commission_due = require('./api/reports/routes/get_commission_due');

var _get_commission_due2 = _interopRequireDefault(_get_commission_due);

var _get_show = require('./api/reports/routes/get_show');

var _get_show2 = _interopRequireDefault(_get_show);

var _get_month = require('./api/reports/routes/get_month');

var _get_month2 = _interopRequireDefault(_get_month);

var _get_label_uses = require('./api/labels/routes/get_label_uses');

var _get_label_uses2 = _interopRequireDefault(_get_label_uses);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var register = function register(server, options, next) {
  server.route((0, _get_cases2.default)(server));
  server.route((0, _get_displays2.default)(server));
  server.route((0, _get_orders2.default)(server));
  server.route((0, _get_order2.default)(server));
  server.route((0, _post_order2.default)(server));
  server.route((0, _patch_order2.default)(server));
  server.route((0, _delete_order2.default)(server));
  server.route((0, _get_commission_due2.default)(server));
  server.route((0, _get_show2.default)(server));
  server.route((0, _get_month2.default)(server));
  server.route((0, _get_label_uses2.default)(server));
  next();
};

register.attributes = {
  name: 'routes'
};

exports.default = register;