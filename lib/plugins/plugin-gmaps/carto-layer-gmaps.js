"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _cartoService = require("../../services/carto-service");
var _query = require("../../utils/query");
const {
  google
} = typeof window !== 'undefined' ? window : {};
const CartoLayer = layerModel => {
  if (!google) throw new Error('Google maps must be defined.');
  const {
    layerConfig,
    params,
    sqlParams
  } = layerModel;
  const layerConfigParsed = layerConfig.parse === false ? layerConfig : JSON.parse((0, _query.replace)(JSON.stringify(layerConfig), params, sqlParams));
  return new Promise((resolve, reject) => {
    (0, _cartoService.fetchTile)(layerModel).then(response => {
      const tileUrl = `${response.cdn_url.templates.https.url}/${layerConfigParsed.account}/api/v1/map/${response.layergroupid}/{z}/{x}/{y}.png`;
      const layer = new google.maps.ImageMapType({
        name: layerConfigParsed.slug,
        getTileUrl(coord, zoom) {
          const url = tileUrl.replace('{x}', coord.x).replace('{y}', coord.y).replace('{z}', zoom);
          return url;
        },
        tileSize: new google.maps.Size(256, 256),
        minZoom: 1,
        maxZoom: 20
      });
      return resolve(layer);
    }).catch(err => reject(err));
  });
};
var _default = exports.default = CartoLayer;