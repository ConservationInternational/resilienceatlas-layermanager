"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _query = require("../../utils/query");
var _canvasLayerLeaflet = _interopRequireDefault(require("./canvas-layer-leaflet"));
var _utfGridLayerLeaflet = _interopRequireDefault(require("./utf-grid-layer-leaflet"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
const {
  L
} = typeof window !== 'undefined' ? window : {};
const GEELayer = layerModel => {
  if (!L) throw new Error('Leaflet must be defined.');
  const {
    id,
    layerConfig,
    interactivity,
    params,
    sqlParams,
    decodeParams
  } = layerModel;
  const tileUrl = `https://api.resourcewatch.org/v1/layer/${id}/tile/gee/{z}/{x}/{y}`;
  const layerConfigParsed = layerConfig.parse === false ? layerConfig : JSON.parse((0, _query.replace)(JSON.stringify(layerConfig), params, sqlParams));
  let layer;
  switch (layerConfigParsed.type) {
    case 'tileLayer':
      if (decodeParams) {
        layer = new _canvasLayerLeaflet.default(_objectSpread({}, layerModel));
      } else {
        layer = L.tileLayer(tileUrl, layerConfigParsed.body);
      }
      break;
    default:
      layer = L.tileLayer(tileUrl, layerConfigParsed.body);
      break;
  }

  // Add interactivity
  if (interactivity) {
    const interactiveLayer = new _utfGridLayerLeaflet.default();
    const LayerGroup = L.LayerGroup.extend({
      group: true,
      setOpacity: opacity => {
        layerModel.mapLayer.getLayers().forEach(l => {
          l.setOpacity(opacity);
        });
      }
    });
    layer = new LayerGroup([layer, interactiveLayer]);
  }
  return new Promise((resolve, reject) => {
    if (layer) {
      resolve(layer);
    } else {
      reject(new Error('"type" specified in layer spec doesn`t exist'));
    }
  });
};
var _default = exports.default = GEELayer;