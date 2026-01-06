"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
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
const maxBounds = L && new L.LatLngBounds(new L.LatLng(49.4966745, -66.357422), new L.LatLng(24.6070691, -131.660156));
const LOCALayer = layerModel => {
  const {
    id,
    layerConfig,
    interactivity
  } = layerModel;
  const {
    period
  } = layerConfig;
  const year = (period || {}).value || '1971';
  const dateString = new Date(year).toISOString();
  const tileUrl = `https://api.resourcewatch.org/v1/layer/${id}/tile/loca/{z}/{x}/{y}?year=${dateString}`;
  let layer = L.tileLayer(tileUrl, _objectSpread(_objectSpread({}, layerConfig.body), {}, {
    minNativeZoom: 4,
    bounds: maxBounds
  }));

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
  return new Promise(resolve => {
    resolve(layer);
  });
};
var _default = exports.default = LOCALayer;