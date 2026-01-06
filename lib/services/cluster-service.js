"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fetchData = exports.default = exports.CANCELED = void 0;
var _axios = _interopRequireWildcard(require("axios"));
var _request = require("../lib/request");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
// Symbol to indicate a canceled request
const CANCELED = exports.CANCELED = Symbol('CANCELED');
const fetchData = layerModel => {
  const {
    layerConfig,
    layerRequest
  } = layerModel;
  const {
    url
  } = layerConfig.body;
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
exports.fetchData = fetchData;
var _default = exports.default = {
  fetchData
};