'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fetchData = exports.CANCELED = undefined;

var _axios = require('axios');

var _axios2 = _interopRequireDefault(_axios);

var _request = require('../lib/request');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Symbol to indicate a canceled request
var CANCELED = exports.CANCELED = Symbol('CANCELED');

var fetchData = exports.fetchData = function fetchData(layerModel) {
  var layerConfig = layerModel.layerConfig,
      layerRequest = layerModel.layerRequest;
  var url = layerConfig.body.url;


  if (layerRequest) {
    layerRequest.cancel('Operation canceled by the user.');
  }

  var layerRequestSource = _axios.CancelToken.source();
  layerModel.set('layerRequest', layerRequestSource);

  var newLayerRequest = (0, _request.get)(url, { cancelToken: layerRequestSource.token }).then(function (res) {
    if (res.status > 400) {
      console.error(res);
      return false;
    }

    return res.data;
  }).catch(function (err) {
    // Silently handle canceled requests - return CANCELED symbol instead of rejecting
    if (_axios2.default.isCancel(err)) {
      return CANCELED;
    }
    throw err;
  });

  return newLayerRequest;
};

exports.default = { fetchData: fetchData };