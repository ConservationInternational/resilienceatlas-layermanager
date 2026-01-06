"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _cartoLayerLeaflet = _interopRequireDefault(require("./carto-layer-leaflet"));
var _esriLayerLeaflet = _interopRequireDefault(require("./esri-layer-leaflet"));
var _geeLayerLeaflet = _interopRequireDefault(require("./gee-layer-leaflet"));
var _locaLayerLeaflet = _interopRequireDefault(require("./loca-layer-leaflet"));
var _nexgddpLayerLeaflet = _interopRequireDefault(require("./nexgddp-layer-leaflet"));
var _leafletLayerLeaflet = _interopRequireDefault(require("./leaflet-layer-leaflet"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
class PluginLeaflet {
  constructor(map) {
    _defineProperty(this, "events", {});
    _defineProperty(this, "method", {
      // CARTO
      cartodb: _cartoLayerLeaflet.default,
      carto: _cartoLayerLeaflet.default,
      raster: _cartoLayerLeaflet.default,
      // ESRI
      arcgis: _esriLayerLeaflet.default,
      featureservice: _esriLayerLeaflet.default,
      mapservice: _esriLayerLeaflet.default,
      tileservice: _esriLayerLeaflet.default,
      esrifeatureservice: _esriLayerLeaflet.default,
      esrimapservice: _esriLayerLeaflet.default,
      esritileservice: _esriLayerLeaflet.default,
      // GEE && LOCA && NEXGDDP
      gee: _geeLayerLeaflet.default,
      loca: _locaLayerLeaflet.default,
      nexgddp: _nexgddpLayerLeaflet.default,
      // LEAFLET
      leaflet: _leafletLayerLeaflet.default,
      wms: _leafletLayerLeaflet.default
    });
    /**
     * A namespace to set DOM events
     * @param {Object} layerModel
    */
    _defineProperty(this, "setEvents", layerModel => {
      const {
        mapLayer,
        events
      } = layerModel;
      if (layerModel.layerConfig.type !== 'cluster') {
        // Remove current events
        if (this.events[layerModel.id]) {
          Object.keys(this.events[layerModel.id]).forEach(k => {
            if (mapLayer.group) {
              mapLayer.eachLayer(l => {
                l.off(k);
              });
            } else {
              mapLayer.off(k);
            }
          });
        }

        // Add new events
        Object.keys(events).forEach(k => {
          if (mapLayer.group) {
            mapLayer.eachLayer(l => {
              l.on(k, events[k]);
            });
          } else {
            mapLayer.on(k, events[k]);
          }
        });
        // Set this.events equal to current ones
        this.events[layerModel.id] = events;
      }
      return this;
    });
    _defineProperty(this, "fitMapToLayer", layerModel => {
      const bounds = layerModel.get('mapLayerBounds');
      if (bounds) {
        this.map.fitBounds(bounds);
      }
    });
    this.map = map;
  }
  /**
   * Add a layer
   * @param {Object} layerModel
   */
  add(layerModel) {
    const {
      mapLayer
    } = layerModel;
    this.map.addLayer(mapLayer);
  }

  /**
   * Remove a layer
   * @param {Object} layerModel
   */
  remove(layerModel) {
    const {
      mapLayer,
      events
    } = layerModel;
    if (events && mapLayer) {
      Object.keys(events).forEach(k => {
        if (mapLayer.group) {
          mapLayer.eachLayer(l => {
            l.off(k);
          });
        } else {
          mapLayer.off(k);
        }
      });
    }
    if (mapLayer) {
      this.map.removeLayer(mapLayer);
    }
  }

  /**
   * Get provider method
   * @param {String} provider
   */
  getLayerByProvider(provider) {
    return this.method[provider];
  }

  /**
   * A request to layer bounds
   */
  getLayerBoundsByProvider(provider) {
    return this.method[provider].getBounds;
  }

  /**
   * A namespace to set z-index
   * @param {Object} layerModel
   * @param {Number} zIndex
   */
  setZIndex(layerModel, zIndex) {
    const {
      mapLayer
    } = layerModel;
    mapLayer.setZIndex(zIndex);
    return this;
  }

  /**
   * A namespace to set opacity
   * @param {Object} layerModel
   * @param {Number} opacity
   */
  setOpacity(layerModel, opacity) {
    const {
      mapLayer
    } = layerModel;
    if (typeof mapLayer.setOpacity === 'function') {
      mapLayer.setOpacity(opacity);
    }
    if (typeof mapLayer.setStyle === 'function') {
      mapLayer.setStyle({
        opacity
      });
    }
    return this;
  }

  /**
   * A namespace to hide or show a selected layer
   * @param {Object} layerModel
   * @param {Boolean} visibility
   */
  setVisibility(layerModel, visibility) {
    const {
      opacity
    } = layerModel;
    this.setOpacity(layerModel, !visibility ? 0 : opacity);
  }
  setParams(layerModel) {
    this.remove(layerModel);
  }
  setLayerConfig(layerModel) {
    this.remove(layerModel);
  }
  setDecodeParams(layerModel) {
    const {
      mapLayer,
      params,
      sqlParams,
      decodeParams,
      decodeFunction
    } = layerModel;
    if (mapLayer.group) {
      mapLayer.eachLayer(l => {
        if (l.reDraw) l.reDraw({
          decodeParams,
          decodeFunction,
          params,
          sqlParams
        });
      });
    } else {
      mapLayer.reDraw({
        decodeParams,
        decodeFunction,
        params,
        sqlParams
      });
    }
    return this;
  }
}
var _default = exports.default = PluginLeaflet;