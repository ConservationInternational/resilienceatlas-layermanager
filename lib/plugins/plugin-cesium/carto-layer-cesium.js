"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _cartoService = require("../../services/carto-service");
var _default = Cesium => layerModel => (0, _cartoService.fetchTile)(layerModel).then(response => {
  const {
    layerConfig
  } = layerModel;
  const url = `${response.cdn_url.templates.https.url}/${layerConfig.account}/api/v1/map/${response.layergroupid}/{z}/{x}/{y}.png`;
  const provider = new Cesium.UrlTemplateImageryProvider({
    url
  });
  provider.errorEvent.addEventListener(() => false);
  // don't show warnings
  return new Cesium.ImageryLayer(provider);
});
exports.default = _default;