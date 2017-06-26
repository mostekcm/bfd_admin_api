'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var getPossibleJsonValue = exports.getPossibleJsonValue = function getPossibleJsonValue(value) {
  try {
    return JSON.parse(value);
  } catch (e) {
    return value;
  }
};

var writePossibleJsonValue = exports.writePossibleJsonValue = function writePossibleJsonValue(value) {
  if (Array.isArray(value) || value !== null && (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object') {
    return JSON.stringify(value);
  }

  return value;
};