"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "PluginLeaflet", {
  enumerable: true,
  get: function () {
    return _pluginLeaflet.default;
  }
});
Object.defineProperty(exports, "concatenation", {
  enumerable: true,
  get: function () {
    return _query.concatenation;
  }
});
Object.defineProperty(exports, "default", {
  enumerable: true,
  get: function () {
    return _layerManager.default;
  }
});
Object.defineProperty(exports, "replace", {
  enumerable: true,
  get: function () {
    return _query.replace;
  }
});
Object.defineProperty(exports, "substitution", {
  enumerable: true,
  get: function () {
    return _query.substitution;
  }
});
var _layerManager = _interopRequireDefault(require("./layer-manager"));
var _pluginLeaflet = _interopRequireDefault(require("./plugins/plugin-leaflet"));
var _query = require("./utils/query");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }