"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _cartoLayerCesium = _interopRequireDefault(require("./carto-layer-cesium"));
var _tileLayerCesium = _interopRequireDefault(require("./tile-layer-cesium"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
class PluginCesium {
  constructor(map) {
    _defineProperty(this, "getCoordinatesFromEvent", action => event => {
      const {
        position
      } = event;
      const {
        Cesium
      } = PluginCesium;
      const clicked = new Cesium.Cartesian2(position.x, position.y);
      const {
        ellipsoid
      } = this.map.scene.globe;
      const cartesian = this.map.camera.pickEllipsoid(clicked, ellipsoid);
      if (cartesian) {
        const cartographic = ellipsoid.cartesianToCartographic(cartesian);
        const lat = Cesium.Math.toDegrees(cartographic.latitude);
        const lng = Cesium.Math.toDegrees(cartographic.longitude);
        action(event, {
          lat,
          lng
        });
      }
    });
    const {
      Cesium: _Cesium
    } = PluginCesium;
    this.map = map;
    this.eventListener = new _Cesium.ScreenSpaceEventHandler(map.scene.canvas);
    this.method = {
      carto: (0, _cartoLayerCesium.default)(_Cesium),
      cartodb: (0, _cartoLayerCesium.default)(_Cesium),
      cesium: (0, _tileLayerCesium.default)(_Cesium)
    };
  }
  add(layerModel) {
    const {
      mapLayer
    } = layerModel;
    this.map.imageryLayers.add(mapLayer);
  }
  remove(layerModel) {
    const {
      mapLayer
    } = layerModel;
    this.map.imageryLayers.remove(mapLayer, true);
    this.eventListener.destroy();
  }
  getLayerByProvider(provider) {
    return this.method[provider];
  }
  setZIndex(layerModel, zIndex) {
    const {
      length
    } = this.map.imageryLayers;
    const {
      mapLayer
    } = layerModel;
    const layerIndex = zIndex >= length ? length - 1 : zIndex;
    const nextIndex = zIndex < 0 ? 0 : layerIndex;
    const currentIndex = this.map.imageryLayers.indexOf(mapLayer);
    if (currentIndex !== nextIndex) {
      const steps = nextIndex - currentIndex;
      for (let i = 0; i < Math.abs(steps); i++) {
        if (steps > 0) {
          this.map.imageryLayers.raise(mapLayer);
        } else {
          this.map.imageryLayers.lower(mapLayer);
        }
      }
    }
    return this;
  }
  setOpacity(layerModel, opacity) {
    const {
      mapLayer
    } = layerModel;
    mapLayer.alpha = opacity;
    return this;
  }
  setVisibility(layerModel, visibility) {
    const {
      mapLayer
    } = layerModel;
    mapLayer.show = visibility;
    return this;
  }
  setEvents(layerModel) {
    const {
      events
    } = layerModel;
    Object.keys(events).forEach(type => {
      const action = events[type];
      if (this.eventListener.getInputAction(type)) {
        this.eventListener.removeInputAction(type);
      }
      this.eventListener.setInputAction(this.getCoordinatesFromEvent(action), type);
    });
    return this;
  }
  setParams(layerModel) {
    this.remove(layerModel);
  }
  setLayerConfig(layerModel) {
    this.remove(layerModel);
  }
  setDecodeParams(layerModel) {
    console.info('Decode params callback', layerModel, this);
  }
}
_defineProperty(PluginCesium, "Cesium", typeof window !== 'undefined' ? window.Cesium : null);
var _default = exports.default = PluginCesium;