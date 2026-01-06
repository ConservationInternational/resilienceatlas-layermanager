"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _pluginLeaflet = _interopRequireDefault(require("./plugins/plugin-leaflet"));
var _query = require("./utils/query");
var _layerManager = _interopRequireDefault(require("./layer-manager"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// This file exists as an entry point for bundling our umd builds.
// Both in rollup and in webpack, umd builds built from es6 modules are not
// compatible with mixed imports (which exist in index.js)
// This file does away with named imports in favor of a single export default.

_layerManager.default.PluginLeaflet = _pluginLeaflet.default;
_layerManager.default.replace = _query.replace;
_layerManager.default.substitution = _query.substitution;
_layerManager.default.concatenation = _query.concatenation;
var _default = exports.default = _layerManager.default;