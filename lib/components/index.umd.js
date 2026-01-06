"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _layerManager = _interopRequireDefault(require("./layer-manager"));
var _layer = _interopRequireDefault(require("./layer"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// This file exists as an entry point for bundling our umd builds.
// Both in rollup and in webpack, umd builds built from es6 modules are not
// compatible with mixed imports (which exist in index.js)
// This file does away with named imports in favor of a single export default.

const Components = {};
Components.LayerManager = _layerManager.default;
Components.Layer = _layer.default;
var _default = exports.default = Components;