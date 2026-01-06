"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _isEmpty = _interopRequireDefault(require("lodash/isEmpty"));
var _debounce = _interopRequireDefault(require("lodash/debounce"));
var _layerModel = _interopRequireDefault(require("./layer-model"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function checkPluginProperties(plugin) {
  if (plugin) {
    const requiredProperties = ['add', 'remove', 'setVisibility', 'setOpacity', 'setEvents', 'setZIndex', 'setLayerConfig', 'setParams', 'setDecodeParams', 'getLayerByProvider'];
    requiredProperties.forEach(property => {
      if (!plugin[property]) {
        console.error(`The ${property} function is required for layer manager plugins`);
      }
    });
  }
}
class LayerManager {
  constructor(map, Plugin) {
    _defineProperty(this, "requestLayerSuccess", (0, _debounce.default)(layerModel => {
      this.plugin.add(layerModel);
      this.plugin.setZIndex(layerModel, layerModel.zIndex);
      this.plugin.setOpacity(layerModel, layerModel.opacity);
      this.plugin.setVisibility(layerModel, layerModel.visibility);
    }, 50));
    this.map = map;
    this.plugin = new Plugin(this.map);
    checkPluginProperties(this.plugin);
    this.layers = [];
    this.promises = {};
  }

  /**
   * Render layers
   */
  renderLayers() {
    if (this.layers.length > 0) {
      this.layers.forEach(layerModel => {
        const {
          changedAttributes
        } = layerModel;
        const {
          sqlParams,
          params,
          layerConfig
        } = changedAttributes;
        const hasChanged = Object.keys(changedAttributes).length > 0;
        const shouldUpdate = sqlParams || params || layerConfig;

        // If layer already exists on map and nothing changed, skip entirely
        if (layerModel.mapLayer && !hasChanged) {
          return;
        }

        // If layer exists and only non-critical attributes changed, just update
        if (layerModel.mapLayer && hasChanged && !shouldUpdate) {
          this.updateLayer(layerModel);
          layerModel.set('changedAttributes', {});
          return;
        }

        // If layer exists and needs full update (params/config changed)
        if (layerModel.mapLayer && shouldUpdate) {
          this.updateLayer(layerModel);
        }

        // Only request new layer if it doesn't exist on map yet
        if (!layerModel.mapLayer) {
          this.requestLayer(layerModel);
          this.requestLayerBounds(layerModel);
        }

        // reset changedAttributes
        layerModel.set('changedAttributes', {});
      });
      if (Object.keys(this.promises).length === 0) {
        return Promise.resolve(this.layers);
      }
      return Promise.all(Object.values(this.promises)).then(() => this.layers).then(() => {
        this.promises = {};
      });
    }

    // By default it will return a empty layers
    return Promise.resolve(this.layers);
  }

  /**
   * Add layers
   * @param {Array} layers
   * @param {Object} layerOptions
   */
  add(layers, layerOptions = {
    opacity: 1,
    visibility: true,
    zIndex: 0,
    interactivity: null
  }) {
    if (typeof layers === 'undefined') {
      console.error('layers is required');
      return this;
    }
    if (!Array.isArray(layers)) {
      console.error('layers should be an array');
      return this;
    }
    layers.forEach(layer => {
      const existingLayer = this.layers.find(l => l.id === layer.id);
      const nextModel = _objectSpread(_objectSpread({}, layer), layerOptions);
      if (existingLayer) {
        existingLayer.update(nextModel);
      } else {
        this.layers.push(new _layerModel.default(nextModel));
      }
    });
    return this.layers;
  }

  /**
   * Updating a specific layer
   * @param  {Object} layerModel
   */
  updateLayer(layerModel) {
    const {
      opacity,
      visibility,
      zIndex,
      params,
      sqlParams,
      decodeParams,
      layerConfig,
      events
    } = layerModel.changedAttributes;
    if (typeof opacity !== 'undefined') {
      this.plugin.setOpacity(layerModel, opacity);
    }
    if (typeof visibility !== 'undefined') {
      this.plugin.setOpacity(layerModel, !visibility ? 0 : layerModel.opacity);
    }
    if (typeof zIndex !== 'undefined') {
      this.plugin.setZIndex(layerModel, zIndex);
    }
    if (typeof events !== 'undefined') {
      this.setEvents(layerModel);
    }
    if (!(0, _isEmpty.default)(layerConfig)) this.plugin.setLayerConfig(layerModel);
    if (!(0, _isEmpty.default)(params)) this.plugin.setParams(layerModel);
    if (!(0, _isEmpty.default)(sqlParams)) this.plugin.setParams(layerModel);
    if (!(0, _isEmpty.default)(decodeParams)) this.plugin.setDecodeParams(layerModel);
  }

  /**
   * Remove a layer giving a Layer ID
   * @param {Array} layerIds
   */
  remove(layerIds) {
    const layers = this.layers.slice(0);
    const ids = Array.isArray(layerIds) ? layerIds : [layerIds];
    this.layers.forEach((layerModel, index) => {
      if (ids) {
        if (ids.includes(layerModel.id)) {
          this.plugin.remove(layerModel);
          layers.splice(index, 1);
        }
      } else {
        this.plugin.remove(layerModel);
      }
    });
    this.layers = ids ? layers : [];
  }

  /**
   * A namespace to set opacity on selected layer
   * @param {Array} layerIds
   * @param {Number} opacity
   */
  setOpacity(layerIds, opacity) {
    const layerModels = this.layers.filter(l => layerIds.includes(l.id));
    if (layerModels.length) {
      layerModels.forEach(lm => {
        this.plugin.setOpacity(lm, opacity);
      });
    } else {
      console.error("Can't find the layer");
    }
  }

  /**
   * A namespace to hide or show a selected layer
   * @param {Array} layerIds
   * @param {Boolean} visibility
   */
  setVisibility(layerIds, visibility) {
    const layerModels = this.layers.filter(l => layerIds.includes(l.id));
    if (layerModels.length) {
      layerModels.forEach(lm => {
        this.plugin.setVisibility(lm, visibility);
      });
    } else {
      console.error("Can't find the layer");
    }
  }

  /**
   * A namespace to set z-index on selected layer
   * @param {Array} layerIds
   * @param {Number} zIndex
   */
  setZIndex(layerIds, zIndex) {
    const layerModels = this.layers.filter(l => layerIds.includes(l.id));
    if (layerModels.length) {
      layerModels.forEach(lm => {
        this.plugin.setZIndex(lm, zIndex);
      });
    } else {
      console.error("Can't find the layer");
    }
  }

  /**
   * A namespace to set events on selected layer
   * @param  {Object} layerModel
   */
  setEvents(layerModel) {
    const {
      events
    } = layerModel;
    if (events) {
      // Let's leave the managment of event to the plugin
      this.plugin.setEvents(layerModel);
    }
  }
  fitMapToLayer(layerId) {
    if (typeof this.plugin.fitMapToLayer !== 'function') {
      console.error('This plugin does not support fitting map bounds to layer yet.');
      return;
    }
    const layerModel = this.layers.find(l => l.id === layerId);
    if (layerModel) this.plugin.fitMapToLayer(layerModel);
  }
  requestLayer(layerModel) {
    const {
      provider
    } = layerModel;
    const method = this.plugin.getLayerByProvider(provider);
    if (!method) {
      this.promises[layerModel.id] = Promise.reject(new Error(`${provider} provider is not yet supported.`));
      return false;
    }

    // Cancel previous/existing request
    if (this.promises[layerModel.id] && this.promises[layerModel.id].isPending && this.promises[layerModel.id].isPending()) {
      this.promises[layerModel.id].cancel();
    }

    // every render method returns a promise that we store in the array
    // to control when all layers are fetched.
    this.promises[layerModel.id] = method.call(this, layerModel).then(layer => {
      const mapLayer = layer;
      layerModel.set('mapLayer', mapLayer);
      this.requestLayerSuccess(layerModel);
      this.setEvents(layerModel);
    });
    return this;
  }
  requestLayerBounds(layerModel) {
    const {
      provider
    } = layerModel;
    const method = this.plugin.getLayerBoundsByProvider(provider);
    if (!method) {
      return false;
    }
    const promiseHash = `${layerModel.id}_bounds`;
    // Cancel previous/existing request
    if (this.promises[promiseHash] && this.promises[promiseHash].isPending && this.promises[promiseHash].isPending()) {
      this.promises[promiseHash].cancel();
    }

    // every render method returns a promise that we store in the array
    // to control when all layers are fetched.
    this.promises[promiseHash] = method.call(this, layerModel).then(bounds => {
      layerModel.set('mapLayerBounds', bounds);
    });
    return this;
  }
}
var _default = exports.default = LayerManager;