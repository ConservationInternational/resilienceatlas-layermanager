(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('react'), require('prop-types'), require('lodash/isEmpty'), require('lodash/isEqual')) :
  typeof define === 'function' && define.amd ? define(['react', 'prop-types', 'lodash/isEmpty', 'lodash/isEqual'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.LayerManager = factory(global.React, global.PropTypes, global.isEmpty, global.isEqual));
})(this, (function (React, PropTypes, isEmpty, isEqual) { 'use strict';

  function _defineProperty(e, r, t) {
    return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
      value: t,
      enumerable: true,
      configurable: true,
      writable: true
    }) : e[r] = t, e;
  }
  function _extends() {
    return _extends = Object.assign ? Object.assign.bind() : function (n) {
      for (var e = 1; e < arguments.length; e++) {
        var t = arguments[e];
        for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
      }
      return n;
    }, _extends.apply(null, arguments);
  }
  function ownKeys(e, r) {
    var t = Object.keys(e);
    if (Object.getOwnPropertySymbols) {
      var o = Object.getOwnPropertySymbols(e);
      r && (o = o.filter(function (r) {
        return Object.getOwnPropertyDescriptor(e, r).enumerable;
      })), t.push.apply(t, o);
    }
    return t;
  }
  function _objectSpread2(e) {
    for (var r = 1; r < arguments.length; r++) {
      var t = null != arguments[r] ? arguments[r] : {};
      r % 2 ? ownKeys(Object(t), true).forEach(function (r) {
        _defineProperty(e, r, t[r]);
      }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) {
        Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));
      });
    }
    return e;
  }
  function _objectWithoutProperties(e, t) {
    if (null == e) return {};
    var o,
      r,
      i = _objectWithoutPropertiesLoose(e, t);
    if (Object.getOwnPropertySymbols) {
      var n = Object.getOwnPropertySymbols(e);
      for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]);
    }
    return i;
  }
  function _objectWithoutPropertiesLoose(r, e) {
    if (null == r) return {};
    var t = {};
    for (var n in r) if ({}.hasOwnProperty.call(r, n)) {
      if (-1 !== e.indexOf(n)) continue;
      t[n] = r[n];
    }
    return t;
  }
  function _toPrimitive(t, r) {
    if ("object" != typeof t || !t) return t;
    var e = t[Symbol.toPrimitive];
    if (void 0 !== e) {
      var i = e.call(t, r);
      if ("object" != typeof i) return i;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return ("string" === r ? String : Number)(t);
  }
  function _toPropertyKey(t) {
    var i = _toPrimitive(t, "string");
    return "symbol" == typeof i ? i : i + "";
  }

  class LayerModel {
    constructor(layerSpec = {}) {
      _defineProperty(this, "opacity", 1);
      _defineProperty(this, "visibility", true);
      Object.assign(this, layerSpec, {
        changedAttributes: {}
      });
    }
    get(key) {
      return this[key];
    }
    set(key, value) {
      this[key] = value;
      return this;
    }
    update(layerSpec) {
      const prevData = _objectSpread2({}, this);
      const nextData = _objectSpread2({}, layerSpec);

      // reseting changedAttributes for every update
      this.set('changedAttributes', {});
      Object.keys(nextData).forEach(k => {
        if (!isEqual(prevData[k], nextData[k])) {
          this.changedAttributes[k] = nextData[k];
          this.set(k, nextData[k]);
        }
      });
    }
  }

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
  let LayerManager$1 = class LayerManager {
    constructor(map, Plugin) {
      this.map = map;
      this.plugin = new Plugin(this.map);
      checkPluginProperties(this.plugin);
      this.layers = [];
      this.promises = {};
      this.pendingRequests = {}; // Track layers with in-flight requests
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

          // Only request new layer if it doesn't exist on map yet and no request is pending
          if (!layerModel.mapLayer && !this.pendingRequests[layerModel.id]) {
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
        const nextModel = _objectSpread2(_objectSpread2({}, layer), layerOptions);
        if (existingLayer) {
          existingLayer.update(nextModel);
        } else {
          this.layers.push(new LayerModel(nextModel));
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
      if (!isEmpty(layerConfig)) this.plugin.setLayerConfig(layerModel);
      if (!isEmpty(params)) this.plugin.setParams(layerModel);
      if (!isEmpty(sqlParams)) this.plugin.setParams(layerModel);
      if (!isEmpty(decodeParams)) this.plugin.setDecodeParams(layerModel);
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

      // Mark this layer as having a pending request
      this.pendingRequests[layerModel.id] = true;

      // every render method returns a promise that we store in the array
      // to control when all layers are fetched.
      this.promises[layerModel.id] = method.call(this, layerModel).then(layer => {
        const mapLayer = layer;
        layerModel.set('mapLayer', mapLayer);

        // Clear pending flag
        delete this.pendingRequests[layerModel.id];
        this.requestLayerSuccess(layerModel);
        this.setEvents(layerModel);
      }).catch(error => {
        // Clear pending flag on error too
        delete this.pendingRequests[layerModel.id];
        console.error(`Error loading layer ${layerModel.id}:`, error);
      });
      return this;
    }
    requestLayerSuccess(layerModel) {
      this.plugin.add(layerModel);
      this.plugin.setZIndex(layerModel, layerModel.zIndex);
      this.plugin.setOpacity(layerModel, layerModel.opacity);
      this.plugin.setVisibility(layerModel, layerModel.visibility);
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

      // Skip if already pending
      if (this.pendingRequests[promiseHash]) {
        return false;
      }
      this.pendingRequests[promiseHash] = true;

      // every render method returns a promise that we store in the array
      // to control when all layers are fetched.
      this.promises[promiseHash] = method.call(this, layerModel).then(bounds => {
        delete this.pendingRequests[promiseHash];
        layerModel.set('mapLayerBounds', bounds);
      }).catch(error => {
        delete this.pendingRequests[promiseHash];
        console.error(`Error loading bounds for layer ${layerModel.id}:`, error);
      });
      return this;
    }
  };

  const _excluded = ["layerManager"];
  class Layer extends React.PureComponent {
    componentDidMount() {
      this.addSpecToLayerManager();
    }
    componentDidUpdate() {
      this.addSpecToLayerManager();
    }
    componentWillUnmount() {
      const {
        layerManager,
        id
      } = this.props;
      layerManager.remove(id);
    }
    addSpecToLayerManager() {
      const _this$props = this.props,
        {
          layerManager
        } = _this$props,
        layerSpec = _objectWithoutProperties(_this$props, _excluded);
      layerManager.add([layerSpec], {});
    }
    render() {
      return null;
    }
  }
  _defineProperty(Layer, "propTypes", {
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    layerManager: PropTypes.instanceOf(LayerManager$1)
  });
  _defineProperty(Layer, "defaultProps", {
    layerManager: null
  });

  class LayerManager extends React.PureComponent {
    constructor(props) {
      super(props);
      _defineProperty(this, "onRenderLayers", () => {
        const {
          onLayerLoading,
          onReady
        } = this.props;
        const {
          layers
        } = this.layerManager;
        if (layers && layers.length) {
          // Check if any layer actually needs loading (no mapLayer yet and not pending)
          const needsLoading = layers.some(l => !l.mapLayer && !this.layerManager.pendingRequests[l.id]);
          if (needsLoading && onLayerLoading) {
            onLayerLoading(true);
          }
          this.layerManager.renderLayers().then(layers => {
            if (onReady) onReady(layers);
            // Only call onLayerLoading(false) if we actually started loading
            if (needsLoading && onLayerLoading) {
              onLayerLoading(false);
            }
          }).catch(error => {
            console.error('[LayerManager React] renderLayers error:', error);
            if (needsLoading && onLayerLoading) onLayerLoading(false);
          });
        }
      });
      _defineProperty(this, "fitMapToLayer", layerId => this.layerManager.fitMapToLayer(layerId));
      const {
        map,
        plugin
      } = props;
      this.layerManager = new LayerManager$1(map, plugin);
    }
    componentDidMount() {
      this.onRenderLayers();
    }
    componentDidUpdate() {
      this.onRenderLayers();
    }
    render() {
      const {
        children,
        layersSpec
      } = this.props;
      if (children && React.Children.count(children)) {
        return React.Children.map(children, (child, i) => child && /*#__PURE__*/React.cloneElement(child, {
          layerManager: this.layerManager,
          zIndex: child.props.zIndex || 1000 - i
        }));
      }
      if (layersSpec && layersSpec.length) {
        return /*#__PURE__*/React.createElement(React.Fragment, null, layersSpec.map((spec, i) => /*#__PURE__*/React.createElement(Layer, _extends({
          key: spec.id
        }, spec, {
          zIndex: spec.zIndex || 1000 - i,
          layerManager: this.layerManager
        }))));
      }
      return null;
    }
  }
  _defineProperty(LayerManager, "propTypes", {
    map: PropTypes.object.isRequired,
    plugin: PropTypes.func.isRequired,
    layersSpec: PropTypes.arrayOf(PropTypes.object),
    children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]),
    onLayerLoading: PropTypes.func,
    onReady: PropTypes.func
  });
  _defineProperty(LayerManager, "defaultProps", {
    children: [],
    layersSpec: [],
    onLayerLoading: null,
    onReady: null
  });

  // This file exists as an entry point for bundling our umd builds.
  // Both in rollup and in webpack, umd builds built from es6 modules are not
  // compatible with mixed imports (which exist in index.js)
  // This file does away with named imports in favor of a single export default.

  const Components = {};
  Components.LayerManager = LayerManager;
  Components.Layer = Layer;

  return Components;

}));
