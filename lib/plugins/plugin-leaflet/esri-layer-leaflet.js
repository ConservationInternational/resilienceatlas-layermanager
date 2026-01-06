"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _query = require("../../utils/query");
var _leafletLayerLeaflet = _interopRequireDefault(require("./leaflet-layer-leaflet"));
var _utfGridLayerLeaflet = _interopRequireDefault(require("./utf-grid-layer-leaflet"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); } /* eslint no-underscore-dangle: ["error", { "allow": ["_currentImage", "_image"] }] */
const {
  L
} = typeof window !== 'undefined' ? window : {};
const eval2 = eval;
const EsriLayer = layerModel => {
  if (!L) throw new Error('Leaflet must be defined.');
  if (!L.esri) {
    throw new Error('To support this layer you should add esri library for Leaflet.');
  }

  // Preparing layerConfig
  const {
    layerConfig,
    interactivity,
    params,
    sqlParams
  } = layerModel;
  const layerConfigParsed = layerConfig.parse === false ? layerConfig : JSON.parse((0, _query.replace)(JSON.stringify(layerConfig), params, sqlParams));
  const bodyStringified = JSON.stringify(layerConfigParsed.body || {}).replace(/"mosaic-rule":/g, '"mosaicRule":').replace(/"mosaic_rule":/g, '"mosaicRule":').replace(/"use-cors":/g, '"useCors":').replace(/"use_cors":/g, '"useCors":');

  // If type is a method of leaflet, returns LeafletLayer
  if (L[layerConfigParsed.type]) return new _leafletLayerLeaflet.default(_objectSpread({}, layerModel));
  return new Promise((resolve, reject) => {
    if (!L.esri[layerConfigParsed.type]) {
      return reject(new Error('"type" specified in layer spec doesn`t exist'));
    }
    const layerOptions = JSON.parse(bodyStringified);
    layerOptions.pane = 'tilePane';
    layerOptions.useCors = true;
    // forcing cors
    if (layerOptions.style && layerOptions.style.indexOf('function') >= 0) {
      layerOptions.style = eval2(`(${layerOptions.style})`);
    }
    let layer;
    layer = L.esri[layerConfigParsed.type](layerOptions);
    if (layer) {
      // Little hack to set zIndex at the beginning
      layer.on('load', () => {
        layer.setZIndex(layerModel.zIndex);
      });
      layer.on('requesterror', err => console.error(err));
    } else {
      return reject();
    }
    if (!layer.setZIndex) {
      layer.setZIndex = zIndex => {
        if (layer._currentImage) {
          layer._currentImage._image.style.zIndex = zIndex;
        }
      };
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
    return resolve(layer);
  });
};
var _default = exports.default = EsriLayer;