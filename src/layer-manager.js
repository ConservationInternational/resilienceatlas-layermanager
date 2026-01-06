import isEmpty from 'lodash/isEmpty';

import LayerModel from './layer-model';

function checkPluginProperties(plugin) {
  if (plugin) {
    const requiredProperties = [
      'add',
      'remove',
      'setVisibility',
      'setOpacity',
      'setEvents',
      'setZIndex',
      'setLayerConfig',
      'setParams',
      'setDecodeParams',
      'getLayerByProvider'
    ];

    requiredProperties.forEach((property) => {
      if (!plugin[property]) {
        console.error(
          `The ${property} function is required for layer manager plugins`
        );
      }
    });
  }
}

class LayerManager {
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
    console.log('[LayerManager] renderLayers called, layers count:', this.layers.length);
    if (this.layers.length > 0) {
      this.layers.forEach((layerModel) => {
        const { changedAttributes } = layerModel;
        const { sqlParams, params, layerConfig } = changedAttributes;
        const hasChanged = Object.keys(changedAttributes).length > 0;
        const shouldUpdate = sqlParams || params || layerConfig;

        console.log('[LayerManager] Processing layer:', layerModel.id, {
          hasMapLayer: !!layerModel.mapLayer,
          hasChanged,
          shouldUpdate,
          isPending: !!this.pendingRequests[layerModel.id]
        });

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
          console.log('[LayerManager] Requesting new layer:', layerModel.id);
          this.requestLayer(layerModel);
          this.requestLayerBounds(layerModel);
        }

        // reset changedAttributes
        layerModel.set('changedAttributes', {});
      });


      console.log('[LayerManager] Promises count:', Object.keys(this.promises).length);
      if (Object.keys(this.promises).length === 0) {
        console.log('[LayerManager] No promises, resolving immediately');
        return Promise.resolve(this.layers);
      }


      return Promise
        .all(Object.values(this.promises))
        .then(() => {
          console.log('[LayerManager] All promises resolved');
          return this.layers;
        })
        .then(() => { this.promises = {}; });
    }

    // By default it will return a empty layers
    return Promise.resolve(this.layers);
  }

  /**
   * Add layers
   * @param {Array} layers
   * @param {Object} layerOptions
   */
  add(
    layers,
    layerOptions = {
      opacity: 1,
      visibility: true,
      zIndex: 0,
      interactivity: null
    }
  ) {
    if (typeof layers === 'undefined') {
      console.error('layers is required');
      return this;
    }

    if (!Array.isArray(layers)) {
      console.error('layers should be an array');
      return this;
    }

    layers.forEach((layer) => {
      const existingLayer = this.layers.find(l => l.id === layer.id);
      const nextModel = { ...layer, ...layerOptions };

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
      layerModels.forEach((lm) => {
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
      layerModels.forEach((lm) => {
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
      layerModels.forEach((lm) => {
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
    const { events } = layerModel;

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
    const { provider } = layerModel;
    const method = this.plugin.getLayerByProvider(provider);

    if (!method) {
      this.promises[layerModel.id] = Promise.reject(new Error(`${provider} provider is not yet supported.`));
      return false;
    }

    // Mark this layer as having a pending request
    this.pendingRequests[layerModel.id] = true;

    // every render method returns a promise that we store in the array
    // to control when all layers are fetched.
    this.promises[layerModel.id] = method.call(this, layerModel).then(((layer) => {
      console.log('[LayerManager] Layer promise resolved:', layerModel.id, layer);
      const mapLayer = layer;

      layerModel.set('mapLayer', mapLayer);

      // Clear pending flag
      delete this.pendingRequests[layerModel.id];

      console.log('[LayerManager] Calling requestLayerSuccess for:', layerModel.id);
      this.requestLayerSuccess(layerModel);

      this.setEvents(layerModel);
    })).catch((error) => {
      // Clear pending flag on error too
      delete this.pendingRequests[layerModel.id];
      console.error(`Error loading layer ${layerModel.id}:`, error);
    });

    return this;
  }

  requestLayerSuccess(layerModel) {
    console.log('[LayerManager] requestLayerSuccess - adding to map:', layerModel.id, layerModel.mapLayer);
    console.log('[LayerManager] Layer properties:', {
      zIndex: layerModel.zIndex,
      opacity: layerModel.opacity,
      visibility: layerModel.visibility
    });
    this.plugin.add(layerModel);
    console.log('[LayerManager] Layer added to map, setting properties');
    this.plugin.setZIndex(layerModel, layerModel.zIndex);
    this.plugin.setOpacity(layerModel, layerModel.opacity);
    this.plugin.setVisibility(layerModel, layerModel.visibility);
    console.log('[LayerManager] Layer setup complete:', layerModel.id);
  }

  requestLayerBounds(layerModel) {
    const { provider } = layerModel;
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
    this.promises[promiseHash] = method.call(this, layerModel).then((bounds) => {
      delete this.pendingRequests[promiseHash];
      layerModel.set('mapLayerBounds', bounds);
    }).catch((error) => {
      delete this.pendingRequests[promiseHash];
      console.error(`Error loading bounds for layer ${layerModel.id}:`, error);
    });

    return this;
  }
}

export default LayerManager;
