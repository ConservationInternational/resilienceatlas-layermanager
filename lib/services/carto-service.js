"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fetchTile = exports.fetchBounds = exports.default = exports.CANCELED = void 0;
var _axios = _interopRequireWildcard(require("axios"));
var _request = require("../lib/request");
var _query = require("../utils/query");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
// Symbol to indicate a canceled request
const CANCELED = exports.CANCELED = Symbol('CANCELED');
const fetchTile = layerModel => {
  const {
    layerConfig,
    params,
    sqlParams,
    interactivity
  } = layerModel;
  const layerConfigParsed = layerConfig.parse === false ? layerConfig : JSON.parse((0, _query.replace)(JSON.stringify(layerConfig), params, sqlParams));
  const layerTpl = JSON.stringify({
    version: '1.3.0',
    stat_tag: 'API',
    layers: layerConfigParsed.body.layers.map(l => {
      if (!!interactivity && interactivity.length) {
        return _objectSpread(_objectSpread({}, l), {}, {
          options: _objectSpread(_objectSpread({}, l.options), {}, {
            interactivity: interactivity.split(', ')
          })
        });
      }
      return l;
    })
  });
  const apiParams = `?stat_tag=API&config=${encodeURIComponent(layerTpl)}`;
  const url = `https://${layerConfigParsed.account}-cdn.resilienceatlas.org/user/ra/api/v1/map${apiParams}`;
  const {
    layerRequest
  } = layerModel;
  if (layerRequest) {
    layerRequest.cancel('Operation canceled by the user.');
  }
  const layerRequestSource = _axios.CancelToken.source();
  layerModel.set('layerRequest', layerRequestSource);
  const newLayerRequest = (0, _request.get)(url, {
    cancelToken: layerRequestSource.token
  }).then(res => {
    if (res.status > 400) {
      console.error(res);
      return false;
    }
    return res.data;
  }).catch(err => {
    // Silently handle canceled requests - return CANCELED symbol instead of rejecting
    if (_axios.default.isCancel(err)) {
      return CANCELED;
    }
    throw err;
  });
  return newLayerRequest;
};
exports.fetchTile = fetchTile;
const fetchBounds = layerModel => {
  const {
    layerConfig,
    params,
    sqlParams,
    type
  } = layerModel;
  let {
    sql
  } = layerModel;
  if (type === 'raster') {
    sql = `SELECT ST_Union(ST_Transform(ST_Envelope(the_raster_webmercator), 4326)) as the_geom FROM (${sql}) as t`;
  }
  const layerConfigParsed = layerConfig.parse === false ? layerConfig : JSON.parse((0, _query.replace)(JSON.stringify(layerConfig), params, sqlParams));
  const s = `
    SELECT ST_XMin(ST_Extent(the_geom)) as minx,
    ST_YMin(ST_Extent(the_geom)) as miny,
    ST_XMax(ST_Extent(the_geom)) as maxx,
    ST_YMax(ST_Extent(the_geom)) as maxy
    from (${sql}) as subq
  `;
  const url = `https://${layerConfigParsed.account}-cdn.resilienceatlas.org/user/ra/api/v2/sql?q=${s.replace(/\n/g, ' ')}`;
  const {
    boundsRequest
  } = layerModel;
  if (boundsRequest) {
    boundsRequest.cancel('Operation canceled by the user.');
  }
  const boundsRequestSource = _axios.CancelToken.source();
  layerModel.set('boundsRequest', boundsRequestSource);
  const newBoundsRequest = (0, _request.get)(url, {
    cancelToken: boundsRequestSource.token
  }).then(res => {
    if (res.status > 400) {
      console.error(res);
      return false;
    }
    return res.data;
  }).catch(err => {
    // Silently handle canceled requests - return CANCELED symbol instead of rejecting
    if (_axios.default.isCancel(err)) {
      return CANCELED;
    }
    throw err;
  });
  return newBoundsRequest;
};
exports.fetchBounds = fetchBounds;
var _default = exports.default = {
  fetchTile,
  fetchBounds
};