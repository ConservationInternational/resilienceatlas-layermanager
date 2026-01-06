"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _query = require("../../utils/query");
var _canvasLayerLeaflet = _interopRequireDefault(require("./canvas-layer-leaflet"));
var _clusterLayerLeaflet = _interopRequireDefault(require("./cluster-layer-leaflet"));
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
const eval2 = eval;
const LeafletLayer = layerModel => {
  if (!L) throw new Error('Leaflet must be defined.');
  const {
    layerConfig,
    params,
    sqlParams,
    decodeParams,
    interactivity
  } = layerModel;
  let layer;
  const layerConfigParsed = layerConfig.parse === false ? layerConfig : JSON.parse((0, _query.replace)(JSON.stringify(layerConfig), params, sqlParams));

  // Transforming data layer
  if (layerConfigParsed.body.crs && L.CRS[layerConfigParsed.body.crs]) {
    layerConfigParsed.body.crs = L.CRS[layerConfigParsed.body.crs.replace(':', '')];
    layerConfigParsed.body.pane = 'tilePane';
  }
  switch (layerConfigParsed.type) {
    case 'wms':
      layer = L.tileLayer.wms(layerConfigParsed.url || layerConfigParsed.body.url, layerConfigParsed.body);
      break;
    case 'tileLayer':
      if (JSON.stringify(layerConfigParsed.body).indexOf('style: "function') >= 0) {
        layerConfigParsed.body.style = eval2(`(${layerConfigParsed.body.style})`);
      }
      if (decodeParams && layerConfigParsed.canvas) {
        layer = new _canvasLayerLeaflet.default(_objectSpread({}, layerModel));
      } else {
        layer = L.tileLayer(layerConfigParsed.url || layerConfigParsed.body.url, layerConfigParsed.body);
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
      break;
    case 'cluster':
      if (JSON.stringify(layerConfigParsed.body).indexOf('style: "function') >= 0) {
        layerConfigParsed.body.style = eval2(`(${layerConfigParsed.body.style})`);
      }
      layer = new _clusterLayerLeaflet.default(layerModel);
      break;
    default:
      layer = L[layerConfigParsed.type](layerConfigParsed.body, layerConfigParsed.options || {});
      break;
  }
  return new Promise((resolve, reject) => {
    if (layer) {
      resolve(layer);
    } else {
      reject(new Error('"type" specified in layer spec doesn`t exist'));
    }
  });
};
LeafletLayer.getBounds = layerModel => {
  if (!L) throw new Error('Leaflet must be defined.');
  const {
    layerConfig,
    params,
    sqlParams
  } = layerModel;
  const layerConfigParsed = layerConfig.parse === false ? layerConfig : JSON.parse((0, _query.replace)(JSON.stringify(layerConfig), params, sqlParams));
  const {
    bbox
  } = layerConfigParsed;
  return new Promise(resolve => {
    if (bbox) {
      const bounds = [[bbox[1], bbox[0]], [bbox[3], bbox[2]]];
      resolve(bounds);
    } else {
      resolve(null);
    }
  });
};
var _default = exports.default = LeafletLayer;