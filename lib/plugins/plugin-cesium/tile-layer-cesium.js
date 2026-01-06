"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _default = Cesium => layerModel => new Promise(resolve => {
  const {
    layerConfig = {}
  } = layerModel;
  const {
    url
  } = layerConfig.body;
  const provider = new Cesium.UrlTemplateImageryProvider({
    url
  });
  provider.errorEvent.addEventListener(() => false);
  // don't show warnings
  resolve(new Cesium.ImageryLayer(provider));
});
exports.default = _default;