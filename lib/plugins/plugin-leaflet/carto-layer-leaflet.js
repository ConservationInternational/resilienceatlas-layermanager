'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _cartoService = require('../../services/carto-service');

var _query = require('../../utils/query');

var _ref = typeof window !== 'undefined' ? window : {},
    L = _ref.L;

var CartoLayer = function CartoLayer(layerModel) {
  if (!L) throw new Error('Leaflet must be defined.');

  var layerConfig = layerModel.layerConfig,
      params = layerModel.params,
      sqlParams = layerModel.sqlParams,
      interactivity = layerModel.interactivity;

  var layerConfigParsed = layerConfig.parse === false ? layerConfig : JSON.parse((0, _query.replace)(JSON.stringify(layerConfig), params, sqlParams));

  return new Promise(function (resolve, reject) {
    (0, _cartoService.fetchTile)(layerModel).then(function (response) {
      var tileUrl = 'https://' + response.cdn_url.https + '/ra/api/v1/map/' + response.layergroupid + '/{z}/{x}/{y}.png';
      var layer = L.tileLayer(tileUrl);

      // Add interactivity
      if (interactivity && interactivity.length) {
        var gridUrl = 'https://' + response.cdn_url.https + '/ra/api/v1/map/' + response.layergroupid + '/0/{z}/{x}/{y}.grid.json';
        var interactiveLayer = L.utfGrid(gridUrl);

        var LayerGroup = L.LayerGroup.extend({
          group: true,
          setOpacity: function setOpacity(opacity) {
            layerModel.mapLayer.getLayers().forEach(function (l) {
              l.setOpacity(opacity);
            });
          }
        });

        return resolve(new LayerGroup([layer, interactiveLayer]));
      }

      return resolve(layer);
    }).catch(function (err) {
      return reject(err);
    });
  });
};

CartoLayer.getBounds = function (layerModel) {
  if (!L) throw new Error('Leaflet must be defined.');

  return new Promise(function (resolve, reject) {
    (0, _cartoService.fetchBounds)(layerModel).then(function (response) {
      var _response$rows$ = response.rows[0],
          maxy = _response$rows$.maxy,
          maxx = _response$rows$.maxx,
          miny = _response$rows$.miny,
          minx = _response$rows$.minx;

      var bounds = [[maxy, maxx], [miny, minx]];

      return resolve(bounds);
    }).catch(reject);
  });
};

exports.default = CartoLayer;