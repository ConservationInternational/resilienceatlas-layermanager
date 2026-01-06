import isEmpty from 'lodash/isEmpty';
import isEqual from 'lodash/isEqual';
import axios, { CancelToken } from 'axios';
import compact from 'lodash/compact';

function _defineProperty(e, r, t) {
  return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
    value: t,
    enumerable: true,
    configurable: true,
    writable: true
  }) : e[r] = t, e;
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
class LayerManager {
  constructor(map, Plugin, options = {}) {
    this.map = map;
    this.plugin = new Plugin(this.map);
    checkPluginProperties(this.plugin);
    this.layers = [];
    this.promises = {};
    this.pendingRequests = {}; // Track layers with in-flight requests
    this.failedLayers = {}; // Track layers that failed to load (to prevent infinite retries)
    this.onLayerError = options.onLayerError || null; // Callback for layer errors
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

        // Only request new layer if it doesn't exist on map yet, no request is pending, and it hasn't failed
        if (!layerModel.mapLayer && !this.pendingRequests[layerModel.id] && !this.failedLayers[layerModel.id]) {
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
      }).catch(error => {
        // Catch any remaining unhandled errors to prevent them from bubbling up
        console.error('[LayerManager] Error in renderLayers:', error);
        this.promises = {};
        return this.layers;
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
      const error = new Error(`${provider} provider is not yet supported.`);
      console.error(`Error loading layer ${layerModel.id}:`, error);
      this.failedLayers[layerModel.id] = {
        error,
        timestamp: Date.now()
      };
      layerModel.set('loadError', error);

      // Call error callback if provided
      if (this.onLayerError) {
        this.onLayerError({
          layerId: layerModel.id,
          layerName: layerModel.name || layerModel.id,
          error,
          timestamp: Date.now()
        });
      }
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
      // Clear pending flag on error
      delete this.pendingRequests[layerModel.id];
      // Mark layer as failed to prevent infinite retries
      this.failedLayers[layerModel.id] = {
        error,
        timestamp: Date.now()
      };
      layerModel.set('loadError', error);
      console.error(`Error loading layer ${layerModel.id}:`, error);

      // Call error callback if provided
      if (this.onLayerError) {
        this.onLayerError({
          layerId: layerModel.id,
          layerName: layerModel.name || layerModel.id,
          errorType: 'layer',
          errorDescription: 'Failed to load layer data',
          provider: layerModel.provider,
          url: error.config?.url || null,
          error,
          timestamp: Date.now()
        });
      }
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
      // Mark bounds request as failed to prevent infinite retries
      this.failedLayers[promiseHash] = {
        error,
        timestamp: Date.now()
      };
      console.error(`Error loading bounds for layer ${layerModel.id}:`, error);

      // Call error callback if provided (bounds errors are less critical, include context)
      if (this.onLayerError) {
        this.onLayerError({
          layerId: layerModel.id,
          layerName: layerModel.name || layerModel.id,
          errorType: 'bounds',
          errorDescription: 'Failed to load layer boundaries',
          provider: layerModel.provider,
          url: error.config?.url || null,
          error,
          timestamp: Date.now()
        });
      }
    });
    return this;
  }
}

const headers = {
  'Content-Type': 'application/json'
};
const get = (url, options = {}) => axios.get(url, _objectSpread2({
  headers
}, options));

/**
 * Params should have this format => { key:'xxx', key2:'xxx' }
 * Keys to search should be in this format {{key}}
 * @param {String} originalStr
 * @param {Object} params
 */
const substitution = (originalStr, params = {}) => {
  let str = originalStr;
  Object.keys(params).forEach(key => {
    str = str.replace(new RegExp(`{{${key}}}`, 'g'), params[key]).replace(new RegExp(`{${key}}`, 'g'), params[key]);
  });
  return str;
};

/**
 * Params should have this format => { where1: { { key:'xxx', key2:'xxx' } }},
 * Keys to search should be in this format {{key}}
 * @param {String} originalStr
 * @param {Object} params
 */
const concatenation = (originalStr, params = {}) => {
  let str = originalStr;
  let sql;
  Object.keys(params).forEach(key => {
    sql = `${compact(Object.keys(params[key]).map(k => {
      const value = params[key][k];
      if (Array.isArray(value) && !!value.length) {
        const mappedValue = value.map(v => typeof v !== 'number' ? `'${v}'` : v);
        return `${k} IN (${mappedValue.join(', ')})`;
      }
      if (!Array.isArray(value) && value) {
        return typeof value !== 'number' ? `${k} = '${value}'` : `${k} = ${value}`;
      }
      return null;
    })).join(' AND ')}`;
    if (sql && key.startsWith('where')) sql = `WHERE ${sql}`;else if (sql && key.startsWith('and')) sql = `AND ${sql}`;else sql = '';
    str = str.replace(new RegExp(`{{${key}}}`, 'g'), sql);
    str = str.replace(new RegExp(`{${key}}`, 'g'), sql);
  });
  return str;
};

/**
 * Replace function
 * @param {String} string
 * @param {Object} params
 * @param {Object} sqlParams
 */
const replace = (originalStr, params = {}, sqlParams = {}) => {
  let str = originalStr;
  if (typeof str === 'string') {
    str = substitution(str, params);
    str = concatenation(str, sqlParams);
  }
  return str;
};

// Symbol to indicate a canceled request
const CANCELED$1 = Symbol('CANCELED');
const fetchTile = layerModel => {
  const {
    layerConfig,
    params,
    sqlParams,
    interactivity
  } = layerModel;
  const layerConfigParsed = layerConfig.parse === false ? layerConfig : JSON.parse(replace(JSON.stringify(layerConfig), params, sqlParams));
  const layerTpl = JSON.stringify({
    version: '1.3.0',
    stat_tag: 'API',
    layers: layerConfigParsed.body.layers.map(l => {
      if (!!interactivity && interactivity.length) {
        return _objectSpread2(_objectSpread2({}, l), {}, {
          options: _objectSpread2(_objectSpread2({}, l.options), {}, {
            interactivity: interactivity.split(', ')
          })
        });
      }
      return l;
    })
  });
  const apiParams = `?stat_tag=API&config=${encodeURIComponent(layerTpl)}`;
  const url = `https://${layerConfigParsed.account}-cdn.resilienceatlas.org/user/ra/api/v1/map${apiParams}`;
  const {
    layerRequest
  } = layerModel;
  if (layerRequest) {
    layerRequest.cancel('Operation canceled by the user.');
  }
  const layerRequestSource = CancelToken.source();
  layerModel.set('layerRequest', layerRequestSource);
  const newLayerRequest = get(url, {
    cancelToken: layerRequestSource.token
  }).then(res => {
    if (res.status > 400) {
      console.error(res);
      return false;
    }
    return res.data;
  }).catch(err => {
    // Silently handle canceled requests - return CANCELED symbol instead of rejecting
    if (axios.isCancel(err)) {
      return CANCELED$1;
    }
    throw err;
  });
  return newLayerRequest;
};
const fetchBounds = layerModel => {
  const {
    layerConfig,
    params,
    sqlParams,
    type
  } = layerModel;
  let {
    sql
  } = layerModel;
  if (type === 'raster') {
    sql = `SELECT ST_Union(ST_Transform(ST_Envelope(the_raster_webmercator), 4326)) as the_geom FROM (${sql}) as t`;
  }
  const layerConfigParsed = layerConfig.parse === false ? layerConfig : JSON.parse(replace(JSON.stringify(layerConfig), params, sqlParams));
  const s = `
    SELECT ST_XMin(ST_Extent(the_geom)) as minx,
    ST_YMin(ST_Extent(the_geom)) as miny,
    ST_XMax(ST_Extent(the_geom)) as maxx,
    ST_YMax(ST_Extent(the_geom)) as maxy
    from (${sql}) as subq
  `;
  const url = `https://${layerConfigParsed.account}-cdn.resilienceatlas.org/user/ra/api/v2/sql?q=${s.replace(/\n/g, ' ')}`;
  const {
    boundsRequest
  } = layerModel;
  if (boundsRequest) {
    boundsRequest.cancel('Operation canceled by the user.');
  }
  const boundsRequestSource = CancelToken.source();
  layerModel.set('boundsRequest', boundsRequestSource);
  const newBoundsRequest = get(url, {
    cancelToken: boundsRequestSource.token
  }).then(res => {
    if (res.status > 400) {
      console.error(res);
      return false;
    }
    return res.data;
  }).catch(err => {
    // Silently handle canceled requests - return CANCELED symbol instead of rejecting
    if (axios.isCancel(err)) {
      return CANCELED$1;
    }
    throw err;
  });
  return newBoundsRequest;
};

const {
  L: L$8
} = typeof window !== 'undefined' ? window : {};
const CartoLayer = layerModel => {
  if (!L$8) throw new Error('Leaflet must be defined.');
  const {
    layerConfig,
    params,
    sqlParams,
    interactivity
  } = layerModel;
  layerConfig.parse === false ? layerConfig : JSON.parse(replace(JSON.stringify(layerConfig), params, sqlParams));
  return new Promise((resolve, reject) => {
    fetchTile(layerModel).then(response => {
      // Handle canceled requests - don't process further
      if (response === CANCELED$1) {
        return; // Promise will stay pending, which is fine for canceled requests
      }
      const tileUrl = `https://${response.cdn_url.https}/ra/api/v1/map/${response.layergroupid}/{z}/{x}/{y}.png`;
      const layer = L$8.tileLayer(tileUrl);

      // Add interactivity
      if (interactivity && interactivity.length) {
        const gridUrl = `https://${response.cdn_url.https}/ra/api/v1/map/${response.layergroupid}/0/{z}/{x}/{y}.grid.json`;
        const interactiveLayer = L$8.utfGrid(gridUrl);
        const LayerGroup = L$8.LayerGroup.extend({
          group: true,
          setOpacity: opacity => {
            layerModel.mapLayer.getLayers().forEach(l => {
              l.setOpacity(opacity);
            });
          }
        });
        return resolve(new LayerGroup([layer, interactiveLayer]));
      }
      return resolve(layer);
    }).catch(err => reject(err));
  });
};
CartoLayer.getBounds = layerModel => {
  if (!L$8) throw new Error('Leaflet must be defined.');
  return new Promise((resolve, reject) => {
    fetchBounds(layerModel).then(response => {
      // Handle canceled requests - don't process further
      if (response === CANCELED$1) {
        return; // Promise will stay pending, which is fine for canceled requests
      }
      const {
        maxy,
        maxx,
        miny,
        minx
      } = response.rows[0];
      const bounds = [[maxy, maxx], [miny, minx]];
      return resolve(bounds);
    }).catch(reject);
  });
};

const {
  L: L$7
} = typeof window !== 'undefined' ? window : {};
const CanvasLayer = L$7 && L$7.GridLayer.extend({
  tiles: {},
  createTile({
    x,
    y,
    z
  }, done) {
    const {
      params
    } = this.options;
    const id = replace(params.url, _objectSpread2({
      x,
      y,
      z
    }, params));

    // Delete all tiles from others zooms;
    const tilesKeys = Object.keys(this.tiles);
    for (let i = 0; i < tilesKeys.length; i++) {
      if (this.tiles[tilesKeys[i]].z !== z) {
        delete this.tiles[tilesKeys[i]];
      }
    }

    // create a <canvas> element for drawing
    this.done = done;
    const tile = L$7.DomUtil.create('canvas', 'leaflet-tile');
    const ctx = tile.getContext('2d');
    const size = this.getTileSize();

    // setup tile width and height according to the options
    tile.width = size.x;
    tile.height = size.y;

    // getTile
    this.getTile({
      x,
      y,
      z
    }).then(image => {
      this.cacheTile(_objectSpread2({
        id,
        tile,
        ctx,
        image
      }, {
        x,
        y,
        z
      }));
      this.drawCanvas(id);

      // return the tile so it can be rendered on screen
      done(null, tile);
    }).catch(err => {
      done(err, tile);
    });
    return tile;
  },
  getTile({
    x,
    y,
    z
  }) {
    const {
      params,
      sqlParams
    } = this.options;
    const {
      url,
      dataMaxZoom = 20
    } = params;
    const zsteps = z - dataMaxZoom;
    const id = replace(params.url, _objectSpread2({
      x,
      y,
      z
    }, params));
    let coords = {
      x,
      y,
      z
    };
    if (zsteps > 0) {
      coords = {
        x: Math.floor(x / 2 ** zsteps),
        y: Math.floor(y / 2 ** zsteps),
        z: dataMaxZoom
      };
    }
    const tileUrl = replace(url, _objectSpread2(_objectSpread2({}, coords), params), sqlParams);
    return new Promise((resolve, reject) => {
      // Return cached tile if loaded.
      if (this.tiles[id]) {
        resolve(this.tiles[id].image);
      }
      const xhr = new XMLHttpRequest();
      xhr.addEventListener('load', e => {
        const {
          response
        } = e.currentTarget;
        const src = URL.createObjectURL(response);
        const image = new Image();
        image.src = src;
        image.onload = () => {
          image.crossOrigin = '';
          resolve(image);
          URL.revokeObjectURL(src);
        };
        image.onerror = () => {
          reject(new Error("Can't load image"));
        };
      });
      xhr.addEventListener('error', reject);
      xhr.open('GET', tileUrl, true);
      xhr.responseType = 'blob';
      xhr.send();
    });
  },
  cacheTile(tile) {
    this.tiles[tile.id] = _objectSpread2(_objectSpread2({}, this.tiles[tile.id]), tile);
  },
  drawCanvas(id) {
    'use asm';

    if (!this.tiles[id]) {
      return;
    }
    const {
      tile,
      ctx,
      image,
      x,
      y,
      z
    } = this.tiles[id];
    if (!tile || !ctx || !image || typeof x === 'undefined' || typeof y === 'undefined' || typeof z === 'undefined') {
      delete this.tiles[id];
      return;
    }
    const {
      params,
      decodeParams,
      decodeFunction
    } = this.options;
    const {
      dataMaxZoom = 20
    } = params;
    const zsteps = z - dataMaxZoom;

    // this will allow us to sum up the dots when the timeline is running
    ctx.clearRect(0, 0, tile.width, tile.width);
    if (zsteps < 0) {
      ctx.drawImage(image, 0, 0);
    } else {
      // over the maxzoom, we'll need to scale up each tile
      ctx.imageSmoothingEnabled = false;
      // disable pic enhancement
      ctx.mozImageSmoothingEnabled = false;

      // tile scaling
      const srcX = tile.width / 2 ** zsteps * (x % 2 ** zsteps) || 0;
      const srcY = tile.height / 2 ** zsteps * (y % 2 ** zsteps) || 0;
      const srcW = tile.width / 2 ** zsteps || 0;
      const srcH = tile.height / 2 ** zsteps || 0;
      ctx.drawImage(image, srcX, srcY, srcW, srcH, 0, 0, tile.width, tile.height);
    }
    const I = ctx.getImageData(0, 0, tile.width, tile.height);
    if (typeof decodeFunction === 'function') {
      decodeFunction(I.data, tile.width, tile.height, z, decodeParams);
    }
    ctx.putImageData(I, 0, 0);
  },
  reDraw(options) {
    this.options.params = options.params;
    this.options.sqlParams = options.sqlParams;
    this.options.decodeParams = options.decodeParams;
    const {
      params,
      sqlParams
    } = options;
    if (params && params.url) {
      Object.keys(this.tiles).map(k => {
        const {
          x,
          y,
          z
        } = this.tiles[k];
        const id = replace(params.url, _objectSpread2(_objectSpread2({
          x,
          y,
          z
        }, params), {}, {
          sqlParams
        }));
        return this.drawCanvas(id);
      });
    }
  }
});

// Symbol to indicate a canceled request
const CANCELED = Symbol('CANCELED');
const fetchData = layerModel => {
  const {
    layerConfig,
    layerRequest
  } = layerModel;
  const {
    url
  } = layerConfig.body;
  if (layerRequest) {
    layerRequest.cancel('Operation canceled by the user.');
  }
  const layerRequestSource = CancelToken.source();
  layerModel.set('layerRequest', layerRequestSource);
  const newLayerRequest = get(url, {
    cancelToken: layerRequestSource.token
  }).then(res => {
    if (res.status > 400) {
      console.error(res);
      return false;
    }
    return res.data;
  }).catch(err => {
    // Silently handle canceled requests - return CANCELED symbol instead of rejecting
    if (axios.isCancel(err)) {
      return CANCELED;
    }
    throw err;
  });
  return newLayerRequest;
};

const ARRAY_TYPES = [Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array];

/** @typedef {Int8ArrayConstructor | Uint8ArrayConstructor | Uint8ClampedArrayConstructor | Int16ArrayConstructor | Uint16ArrayConstructor | Int32ArrayConstructor | Uint32ArrayConstructor | Float32ArrayConstructor | Float64ArrayConstructor} TypedArrayConstructor */

const VERSION = 1; // serialized format version
const HEADER_SIZE = 8;
class KDBush {
  /**
   * Creates an index from raw `ArrayBuffer` data.
   * @param {ArrayBuffer} data
   */
  static from(data) {
    if (!(data instanceof ArrayBuffer)) {
      throw new Error('Data must be an instance of ArrayBuffer.');
    }
    const [magic, versionAndType] = new Uint8Array(data, 0, 2);
    if (magic !== 0xdb) {
      throw new Error('Data does not appear to be in a KDBush format.');
    }
    const version = versionAndType >> 4;
    if (version !== VERSION) {
      throw new Error(`Got v${version} data when expected v${VERSION}.`);
    }
    const ArrayType = ARRAY_TYPES[versionAndType & 0x0f];
    if (!ArrayType) {
      throw new Error('Unrecognized array type.');
    }
    const [nodeSize] = new Uint16Array(data, 2, 1);
    const [numItems] = new Uint32Array(data, 4, 1);
    return new KDBush(numItems, nodeSize, ArrayType, data);
  }

  /**
   * Creates an index that will hold a given number of items.
   * @param {number} numItems
   * @param {number} [nodeSize=64] Size of the KD-tree node (64 by default).
   * @param {TypedArrayConstructor} [ArrayType=Float64Array] The array type used for coordinates storage (`Float64Array` by default).
   * @param {ArrayBuffer} [data] (For internal use only)
   */
  constructor(numItems, nodeSize = 64, ArrayType = Float64Array, data) {
    if (isNaN(numItems) || numItems < 0) throw new Error(`Unpexpected numItems value: ${numItems}.`);
    this.numItems = +numItems;
    this.nodeSize = Math.min(Math.max(+nodeSize, 2), 65535);
    this.ArrayType = ArrayType;
    this.IndexArrayType = numItems < 65536 ? Uint16Array : Uint32Array;
    const arrayTypeIndex = ARRAY_TYPES.indexOf(this.ArrayType);
    const coordsByteSize = numItems * 2 * this.ArrayType.BYTES_PER_ELEMENT;
    const idsByteSize = numItems * this.IndexArrayType.BYTES_PER_ELEMENT;
    const padCoords = (8 - idsByteSize % 8) % 8;
    if (arrayTypeIndex < 0) {
      throw new Error(`Unexpected typed array class: ${ArrayType}.`);
    }
    if (data && data instanceof ArrayBuffer) {
      // reconstruct an index from a buffer
      this.data = data;
      this.ids = new this.IndexArrayType(this.data, HEADER_SIZE, numItems);
      this.coords = new this.ArrayType(this.data, HEADER_SIZE + idsByteSize + padCoords, numItems * 2);
      this._pos = numItems * 2;
      this._finished = true;
    } else {
      // initialize a new index
      this.data = new ArrayBuffer(HEADER_SIZE + coordsByteSize + idsByteSize + padCoords);
      this.ids = new this.IndexArrayType(this.data, HEADER_SIZE, numItems);
      this.coords = new this.ArrayType(this.data, HEADER_SIZE + idsByteSize + padCoords, numItems * 2);
      this._pos = 0;
      this._finished = false;

      // set header
      new Uint8Array(this.data, 0, 2).set([0xdb, (VERSION << 4) + arrayTypeIndex]);
      new Uint16Array(this.data, 2, 1)[0] = nodeSize;
      new Uint32Array(this.data, 4, 1)[0] = numItems;
    }
  }

  /**
   * Add a point to the index.
   * @param {number} x
   * @param {number} y
   * @returns {number} An incremental index associated with the added item (starting from `0`).
   */
  add(x, y) {
    const index = this._pos >> 1;
    this.ids[index] = index;
    this.coords[this._pos++] = x;
    this.coords[this._pos++] = y;
    return index;
  }

  /**
   * Perform indexing of the added points.
   */
  finish() {
    const numAdded = this._pos >> 1;
    if (numAdded !== this.numItems) {
      throw new Error(`Added ${numAdded} items when expected ${this.numItems}.`);
    }
    // kd-sort both arrays for efficient search
    sort(this.ids, this.coords, this.nodeSize, 0, this.numItems - 1, 0);
    this._finished = true;
    return this;
  }

  /**
   * Search the index for items within a given bounding box.
   * @param {number} minX
   * @param {number} minY
   * @param {number} maxX
   * @param {number} maxY
   * @returns {number[]} An array of indices correponding to the found items.
   */
  range(minX, minY, maxX, maxY) {
    if (!this._finished) throw new Error('Data not yet indexed - call index.finish().');
    const {
      ids,
      coords,
      nodeSize
    } = this;
    const stack = [0, ids.length - 1, 0];
    const result = [];

    // recursively search for items in range in the kd-sorted arrays
    while (stack.length) {
      const axis = stack.pop() || 0;
      const right = stack.pop() || 0;
      const left = stack.pop() || 0;

      // if we reached "tree node", search linearly
      if (right - left <= nodeSize) {
        for (let i = left; i <= right; i++) {
          const x = coords[2 * i];
          const y = coords[2 * i + 1];
          if (x >= minX && x <= maxX && y >= minY && y <= maxY) result.push(ids[i]);
        }
        continue;
      }

      // otherwise find the middle index
      const m = left + right >> 1;

      // include the middle item if it's in range
      const x = coords[2 * m];
      const y = coords[2 * m + 1];
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) result.push(ids[m]);

      // queue search in halves that intersect the query
      if (axis === 0 ? minX <= x : minY <= y) {
        stack.push(left);
        stack.push(m - 1);
        stack.push(1 - axis);
      }
      if (axis === 0 ? maxX >= x : maxY >= y) {
        stack.push(m + 1);
        stack.push(right);
        stack.push(1 - axis);
      }
    }
    return result;
  }

  /**
   * Search the index for items within a given radius.
   * @param {number} qx
   * @param {number} qy
   * @param {number} r Query radius.
   * @returns {number[]} An array of indices correponding to the found items.
   */
  within(qx, qy, r) {
    if (!this._finished) throw new Error('Data not yet indexed - call index.finish().');
    const {
      ids,
      coords,
      nodeSize
    } = this;
    const stack = [0, ids.length - 1, 0];
    const result = [];
    const r2 = r * r;

    // recursively search for items within radius in the kd-sorted arrays
    while (stack.length) {
      const axis = stack.pop() || 0;
      const right = stack.pop() || 0;
      const left = stack.pop() || 0;

      // if we reached "tree node", search linearly
      if (right - left <= nodeSize) {
        for (let i = left; i <= right; i++) {
          if (sqDist(coords[2 * i], coords[2 * i + 1], qx, qy) <= r2) result.push(ids[i]);
        }
        continue;
      }

      // otherwise find the middle index
      const m = left + right >> 1;

      // include the middle item if it's in range
      const x = coords[2 * m];
      const y = coords[2 * m + 1];
      if (sqDist(x, y, qx, qy) <= r2) result.push(ids[m]);

      // queue search in halves that intersect the query
      if (axis === 0 ? qx - r <= x : qy - r <= y) {
        stack.push(left);
        stack.push(m - 1);
        stack.push(1 - axis);
      }
      if (axis === 0 ? qx + r >= x : qy + r >= y) {
        stack.push(m + 1);
        stack.push(right);
        stack.push(1 - axis);
      }
    }
    return result;
  }
}

/**
 * @param {Uint16Array | Uint32Array} ids
 * @param {InstanceType<TypedArrayConstructor>} coords
 * @param {number} nodeSize
 * @param {number} left
 * @param {number} right
 * @param {number} axis
 */
function sort(ids, coords, nodeSize, left, right, axis) {
  if (right - left <= nodeSize) return;
  const m = left + right >> 1; // middle index

  // sort ids and coords around the middle index so that the halves lie
  // either left/right or top/bottom correspondingly (taking turns)
  select(ids, coords, m, left, right, axis);

  // recursively kd-sort first half and second half on the opposite axis
  sort(ids, coords, nodeSize, left, m - 1, 1 - axis);
  sort(ids, coords, nodeSize, m + 1, right, 1 - axis);
}

/**
 * Custom Floyd-Rivest selection algorithm: sort ids and coords so that
 * [left..k-1] items are smaller than k-th item (on either x or y axis)
 * @param {Uint16Array | Uint32Array} ids
 * @param {InstanceType<TypedArrayConstructor>} coords
 * @param {number} k
 * @param {number} left
 * @param {number} right
 * @param {number} axis
 */
function select(ids, coords, k, left, right, axis) {
  while (right > left) {
    if (right - left > 600) {
      const n = right - left + 1;
      const m = k - left + 1;
      const z = Math.log(n);
      const s = 0.5 * Math.exp(2 * z / 3);
      const sd = 0.5 * Math.sqrt(z * s * (n - s) / n) * (m - n / 2 < 0 ? -1 : 1);
      const newLeft = Math.max(left, Math.floor(k - m * s / n + sd));
      const newRight = Math.min(right, Math.floor(k + (n - m) * s / n + sd));
      select(ids, coords, k, newLeft, newRight, axis);
    }
    const t = coords[2 * k + axis];
    let i = left;
    let j = right;
    swapItem(ids, coords, left, k);
    if (coords[2 * right + axis] > t) swapItem(ids, coords, left, right);
    while (i < j) {
      swapItem(ids, coords, i, j);
      i++;
      j--;
      while (coords[2 * i + axis] < t) i++;
      while (coords[2 * j + axis] > t) j--;
    }
    if (coords[2 * left + axis] === t) swapItem(ids, coords, left, j);else {
      j++;
      swapItem(ids, coords, j, right);
    }
    if (j <= k) left = j + 1;
    if (k <= j) right = j - 1;
  }
}

/**
 * @param {Uint16Array | Uint32Array} ids
 * @param {InstanceType<TypedArrayConstructor>} coords
 * @param {number} i
 * @param {number} j
 */
function swapItem(ids, coords, i, j) {
  swap(ids, i, j);
  swap(coords, 2 * i, 2 * j);
  swap(coords, 2 * i + 1, 2 * j + 1);
}

/**
 * @param {InstanceType<TypedArrayConstructor>} arr
 * @param {number} i
 * @param {number} j
 */
function swap(arr, i, j) {
  const tmp = arr[i];
  arr[i] = arr[j];
  arr[j] = tmp;
}

/**
 * @param {number} ax
 * @param {number} ay
 * @param {number} bx
 * @param {number} by
 */
function sqDist(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

const defaultOptions = {
  minZoom: 0,
  // min zoom to generate clusters on
  maxZoom: 16,
  // max zoom level to cluster the points on
  minPoints: 2,
  // minimum points to form a cluster
  radius: 40,
  // cluster radius in pixels
  extent: 512,
  // tile extent (radius is calculated relative to it)
  nodeSize: 64,
  // size of the KD-tree leaf node, affects performance
  log: false,
  // whether to log timing info

  // whether to generate numeric ids for input features (in vector tiles)
  generateId: false,
  // a reduce function for calculating custom cluster properties
  reduce: null,
  // (accumulated, props) => { accumulated.sum += props.sum; }

  // properties to use for individual points when running the reducer
  map: props => props // props => ({sum: props.my_value})
};
const fround = Math.fround || (tmp => x => {
  tmp[0] = +x;
  return tmp[0];
})(new Float32Array(1));
const OFFSET_ZOOM = 2;
const OFFSET_ID = 3;
const OFFSET_PARENT = 4;
const OFFSET_NUM = 5;
const OFFSET_PROP = 6;
class Supercluster {
  constructor(options) {
    this.options = Object.assign(Object.create(defaultOptions), options);
    this.trees = new Array(this.options.maxZoom + 1);
    this.stride = this.options.reduce ? 7 : 6;
    this.clusterProps = [];
  }
  load(points) {
    const {
      log,
      minZoom,
      maxZoom
    } = this.options;
    if (log) console.time('total time');
    const timerId = `prepare ${points.length} points`;
    if (log) console.time(timerId);
    this.points = points;

    // generate a cluster object for each point and index input points into a KD-tree
    const data = [];
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (!p.geometry) continue;
      const [lng, lat] = p.geometry.coordinates;
      const x = fround(lngX(lng));
      const y = fround(latY(lat));
      // store internal point/cluster data in flat numeric arrays for performance
      data.push(x, y,
      // projected point coordinates
      Infinity,
      // the last zoom the point was processed at
      i,
      // index of the source feature in the original input array
      -1,
      // parent cluster id
      1 // number of points in a cluster
      );
      if (this.options.reduce) data.push(0); // noop
    }
    let tree = this.trees[maxZoom + 1] = this._createTree(data);
    if (log) console.timeEnd(timerId);

    // cluster points on max zoom, then cluster the results on previous zoom, etc.;
    // results in a cluster hierarchy across zoom levels
    for (let z = maxZoom; z >= minZoom; z--) {
      const now = +Date.now();

      // create a new set of clusters for the zoom and index them with a KD-tree
      tree = this.trees[z] = this._createTree(this._cluster(tree, z));
      if (log) console.log('z%d: %d clusters in %dms', z, tree.numItems, +Date.now() - now);
    }
    if (log) console.timeEnd('total time');
    return this;
  }
  getClusters(bbox, zoom) {
    let minLng = ((bbox[0] + 180) % 360 + 360) % 360 - 180;
    const minLat = Math.max(-90, Math.min(90, bbox[1]));
    let maxLng = bbox[2] === 180 ? 180 : ((bbox[2] + 180) % 360 + 360) % 360 - 180;
    const maxLat = Math.max(-90, Math.min(90, bbox[3]));
    if (bbox[2] - bbox[0] >= 360) {
      minLng = -180;
      maxLng = 180;
    } else if (minLng > maxLng) {
      const easternHem = this.getClusters([minLng, minLat, 180, maxLat], zoom);
      const westernHem = this.getClusters([-180, minLat, maxLng, maxLat], zoom);
      return easternHem.concat(westernHem);
    }
    const tree = this.trees[this._limitZoom(zoom)];
    const ids = tree.range(lngX(minLng), latY(maxLat), lngX(maxLng), latY(minLat));
    const data = tree.data;
    const clusters = [];
    for (const id of ids) {
      const k = this.stride * id;
      clusters.push(data[k + OFFSET_NUM] > 1 ? getClusterJSON(data, k, this.clusterProps) : this.points[data[k + OFFSET_ID]]);
    }
    return clusters;
  }
  getChildren(clusterId) {
    const originId = this._getOriginId(clusterId);
    const originZoom = this._getOriginZoom(clusterId);
    const errorMsg = 'No cluster with the specified id.';
    const tree = this.trees[originZoom];
    if (!tree) throw new Error(errorMsg);
    const data = tree.data;
    if (originId * this.stride >= data.length) throw new Error(errorMsg);
    const r = this.options.radius / (this.options.extent * Math.pow(2, originZoom - 1));
    const x = data[originId * this.stride];
    const y = data[originId * this.stride + 1];
    const ids = tree.within(x, y, r);
    const children = [];
    for (const id of ids) {
      const k = id * this.stride;
      if (data[k + OFFSET_PARENT] === clusterId) {
        children.push(data[k + OFFSET_NUM] > 1 ? getClusterJSON(data, k, this.clusterProps) : this.points[data[k + OFFSET_ID]]);
      }
    }
    if (children.length === 0) throw new Error(errorMsg);
    return children;
  }
  getLeaves(clusterId, limit, offset) {
    limit = limit || 10;
    offset = offset || 0;
    const leaves = [];
    this._appendLeaves(leaves, clusterId, limit, offset, 0);
    return leaves;
  }
  getTile(z, x, y) {
    const tree = this.trees[this._limitZoom(z)];
    const z2 = Math.pow(2, z);
    const {
      extent,
      radius
    } = this.options;
    const p = radius / extent;
    const top = (y - p) / z2;
    const bottom = (y + 1 + p) / z2;
    const tile = {
      features: []
    };
    this._addTileFeatures(tree.range((x - p) / z2, top, (x + 1 + p) / z2, bottom), tree.data, x, y, z2, tile);
    if (x === 0) {
      this._addTileFeatures(tree.range(1 - p / z2, top, 1, bottom), tree.data, z2, y, z2, tile);
    }
    if (x === z2 - 1) {
      this._addTileFeatures(tree.range(0, top, p / z2, bottom), tree.data, -1, y, z2, tile);
    }
    return tile.features.length ? tile : null;
  }
  getClusterExpansionZoom(clusterId) {
    let expansionZoom = this._getOriginZoom(clusterId) - 1;
    while (expansionZoom <= this.options.maxZoom) {
      const children = this.getChildren(clusterId);
      expansionZoom++;
      if (children.length !== 1) break;
      clusterId = children[0].properties.cluster_id;
    }
    return expansionZoom;
  }
  _appendLeaves(result, clusterId, limit, offset, skipped) {
    const children = this.getChildren(clusterId);
    for (const child of children) {
      const props = child.properties;
      if (props && props.cluster) {
        if (skipped + props.point_count <= offset) {
          // skip the whole cluster
          skipped += props.point_count;
        } else {
          // enter the cluster
          skipped = this._appendLeaves(result, props.cluster_id, limit, offset, skipped);
          // exit the cluster
        }
      } else if (skipped < offset) {
        // skip a single point
        skipped++;
      } else {
        // add a single point
        result.push(child);
      }
      if (result.length === limit) break;
    }
    return skipped;
  }
  _createTree(data) {
    const tree = new KDBush(data.length / this.stride | 0, this.options.nodeSize, Float32Array);
    for (let i = 0; i < data.length; i += this.stride) tree.add(data[i], data[i + 1]);
    tree.finish();
    tree.data = data;
    return tree;
  }
  _addTileFeatures(ids, data, x, y, z2, tile) {
    for (const i of ids) {
      const k = i * this.stride;
      const isCluster = data[k + OFFSET_NUM] > 1;
      let tags, px, py;
      if (isCluster) {
        tags = getClusterProperties(data, k, this.clusterProps);
        px = data[k];
        py = data[k + 1];
      } else {
        const p = this.points[data[k + OFFSET_ID]];
        tags = p.properties;
        const [lng, lat] = p.geometry.coordinates;
        px = lngX(lng);
        py = latY(lat);
      }
      const f = {
        type: 1,
        geometry: [[Math.round(this.options.extent * (px * z2 - x)), Math.round(this.options.extent * (py * z2 - y))]],
        tags
      };

      // assign id
      let id;
      if (isCluster || this.options.generateId) {
        // optionally generate id for points
        id = data[k + OFFSET_ID];
      } else {
        // keep id if already assigned
        id = this.points[data[k + OFFSET_ID]].id;
      }
      if (id !== undefined) f.id = id;
      tile.features.push(f);
    }
  }
  _limitZoom(z) {
    return Math.max(this.options.minZoom, Math.min(Math.floor(+z), this.options.maxZoom + 1));
  }
  _cluster(tree, zoom) {
    const {
      radius,
      extent,
      reduce,
      minPoints
    } = this.options;
    const r = radius / (extent * Math.pow(2, zoom));
    const data = tree.data;
    const nextData = [];
    const stride = this.stride;

    // loop through each point
    for (let i = 0; i < data.length; i += stride) {
      // if we've already visited the point at this zoom level, skip it
      if (data[i + OFFSET_ZOOM] <= zoom) continue;
      data[i + OFFSET_ZOOM] = zoom;

      // find all nearby points
      const x = data[i];
      const y = data[i + 1];
      const neighborIds = tree.within(data[i], data[i + 1], r);
      const numPointsOrigin = data[i + OFFSET_NUM];
      let numPoints = numPointsOrigin;

      // count the number of points in a potential cluster
      for (const neighborId of neighborIds) {
        const k = neighborId * stride;
        // filter out neighbors that are already processed
        if (data[k + OFFSET_ZOOM] > zoom) numPoints += data[k + OFFSET_NUM];
      }

      // if there were neighbors to merge, and there are enough points to form a cluster
      if (numPoints > numPointsOrigin && numPoints >= minPoints) {
        let wx = x * numPointsOrigin;
        let wy = y * numPointsOrigin;
        let clusterProperties;
        let clusterPropIndex = -1;

        // encode both zoom and point index on which the cluster originated -- offset by total length of features
        const id = ((i / stride | 0) << 5) + (zoom + 1) + this.points.length;
        for (const neighborId of neighborIds) {
          const k = neighborId * stride;
          if (data[k + OFFSET_ZOOM] <= zoom) continue;
          data[k + OFFSET_ZOOM] = zoom; // save the zoom (so it doesn't get processed twice)

          const numPoints2 = data[k + OFFSET_NUM];
          wx += data[k] * numPoints2; // accumulate coordinates for calculating weighted center
          wy += data[k + 1] * numPoints2;
          data[k + OFFSET_PARENT] = id;
          if (reduce) {
            if (!clusterProperties) {
              clusterProperties = this._map(data, i, true);
              clusterPropIndex = this.clusterProps.length;
              this.clusterProps.push(clusterProperties);
            }
            reduce(clusterProperties, this._map(data, k));
          }
        }
        data[i + OFFSET_PARENT] = id;
        nextData.push(wx / numPoints, wy / numPoints, Infinity, id, -1, numPoints);
        if (reduce) nextData.push(clusterPropIndex);
      } else {
        // left points as unclustered
        for (let j = 0; j < stride; j++) nextData.push(data[i + j]);
        if (numPoints > 1) {
          for (const neighborId of neighborIds) {
            const k = neighborId * stride;
            if (data[k + OFFSET_ZOOM] <= zoom) continue;
            data[k + OFFSET_ZOOM] = zoom;
            for (let j = 0; j < stride; j++) nextData.push(data[k + j]);
          }
        }
      }
    }
    return nextData;
  }

  // get index of the point from which the cluster originated
  _getOriginId(clusterId) {
    return clusterId - this.points.length >> 5;
  }

  // get zoom of the point from which the cluster originated
  _getOriginZoom(clusterId) {
    return (clusterId - this.points.length) % 32;
  }
  _map(data, i, clone) {
    if (data[i + OFFSET_NUM] > 1) {
      const props = this.clusterProps[data[i + OFFSET_PROP]];
      return clone ? Object.assign({}, props) : props;
    }
    const original = this.points[data[i + OFFSET_ID]].properties;
    const result = this.options.map(original);
    return clone && result === original ? Object.assign({}, result) : result;
  }
}
function getClusterJSON(data, i, clusterProps) {
  return {
    type: 'Feature',
    id: data[i + OFFSET_ID],
    properties: getClusterProperties(data, i, clusterProps),
    geometry: {
      type: 'Point',
      coordinates: [xLng(data[i]), yLat(data[i + 1])]
    }
  };
}
function getClusterProperties(data, i, clusterProps) {
  const count = data[i + OFFSET_NUM];
  const abbrev = count >= 10000 ? `${Math.round(count / 1000)}k` : count >= 1000 ? `${Math.round(count / 100) / 10}k` : count;
  const propIndex = data[i + OFFSET_PROP];
  const properties = propIndex === -1 ? {} : Object.assign({}, clusterProps[propIndex]);
  return Object.assign(properties, {
    cluster: true,
    cluster_id: data[i + OFFSET_ID],
    point_count: count,
    point_count_abbreviated: abbrev
  });
}

// longitude/latitude to spherical mercator in [0..1] range
function lngX(lng) {
  return lng / 360 + 0.5;
}
function latY(lat) {
  const sin = Math.sin(lat * Math.PI / 180);
  const y = 0.5 - 0.25 * Math.log((1 + sin) / (1 - sin)) / Math.PI;
  return y < 0 ? 0 : y > 1 ? 1 : y;
}

// spherical mercator to longitude/latitude
function xLng(x) {
  return (x - 0.5) * 360;
}
function yLat(y) {
  const y2 = (180 - y * 360) * Math.PI / 180;
  return 360 * Math.atan(Math.exp(y2)) / Math.PI - 90;
}

const {
  L: L$6
} = typeof window !== 'undefined' ? window : {};
const defaultSizes = {
  50: 25,
  100: 30,
  1000: 40
};
const ClusterLayer = L$6 && L$6.GeoJSON.extend({
  initialize(layerModel) {
    const self = this;
    L$6.GeoJSON.prototype.initialize.call(this, []);
    const {
      layerConfig,
      events,
      decodeClusters
    } = layerModel;
    if (!decodeClusters) {
      console.warn('You must provide a decodeClusters function');
      return;
    }
    const {
      html,
      sizes = defaultSizes,
      clusterIcon,
      icon
    } = layerModel.layerConfig || {};
    L$6.Util.setOptions(this, {
      // converts feature to icon
      pointToLayer(feature, latlng) {
        const isCluster = feature.properties && feature.properties.cluster;

        // if cluster return point icon
        if (!isCluster) {
          // see documentation for icon config https://leafletjs.com/reference-1.3.4.html#icon
          return L$6.marker(latlng, {
            icon: L$6.icon(_objectSpread2({
              iconSize: [35, 35]
            }, icon))
          });
        }
        const count = feature.properties.point_count;
        let iconSize = null;
        if (typeof sizes === 'function') {
          iconSize = () => sizes(count);
        } else {
          const sizeKey = Object.keys(sizes).find(o => count <= parseInt(o, 10));
          const size = sizes[sizeKey];
          iconSize = L$6.point(size, size);
        }

        // see documentation for icon config https://leafletjs.com/reference-1.3.4.html#divicon
        return L$6.marker(latlng, {
          icon: L$6.divIcon(_objectSpread2({
            iconSize,
            html: html && typeof html === 'function' ? html(feature) : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; ${clusterIcon.color ? `background-color: ${clusterIcon.color};` : ''}">${feature.properties.point_count_abbreviated}</div>`
          }, clusterIcon))
        });
      },
      // parses each feature before adding to the map
      onEachFeature(feature, layer) {
        if (feature.properties && feature.properties.cluster) {
          layer.on({
            click: () => self.setMapView(feature)
          });
        } else if (events) {
          layer.on(Object.keys(events).reduce((obj, event) => _objectSpread2(_objectSpread2({}, obj), {}, {
            [event]: e => events[event](_objectSpread2(_objectSpread2({}, e), {}, {
              data: feature.properties
            }))
          }), {}));
        }
      }
    });

    // https://github.com/mapbox/supercluster options available here
    const {
      clusterConfig
    } = layerConfig || {};
    this.supercluster = Supercluster(_objectSpread2({
      radius: 80,
      maxZoom: 16
    }, clusterConfig));
    fetchData(layerModel).then(response => {
      // Handle canceled requests - don't process further
      if (response === CANCELED) {
        return;
      }
      const features = decodeClusters(response);
      this.supercluster.load(features);
      this.update();
    });
  },
  setMapView(feature) {
    const center = feature.geometry.coordinates;
    const zoom = this.supercluster.getClusterExpansionZoom(feature.properties.cluster_id);
    this._map.setView(center.reverse(), zoom);
  },
  onAdd(map) {
    L$6.GeoJSON.prototype.onAdd.call(this, map);
    map.on('moveend zoomend', this.onMove, this);
  },
  onRemove(map) {
    map.off('moveend zoomend', this.onMove, this);
    this.clear();
  },
  onMove() {
    this.clear();
    this.update();
  },
  update() {
    const zoom = this._map.getZoom();
    const bounds = this._map.getBounds();
    const clusterBounds = [bounds._southWest.lng, bounds._southWest.lat, bounds._northEast.lng, bounds._northEast.lat];
    const clusters = this.supercluster.getClusters(clusterBounds, zoom);
    this.addData(clusters);
  },
  clear() {
    L$6.GeoJSON.prototype.clearLayers.call(this, []);
  }
});

const {
  L: L$5
} = typeof window !== 'undefined' ? window : {};
const UTFGridLayer = L$5 && L$5.GridLayer.extend({
  tiles: {},
  cache: {},
  mouseOn: null,
  createTile({
    z
  }) {
    // Delete all tiles from others zooms;
    const tilesKeys = Object.keys(this.tiles);
    for (let i = 0; i < tilesKeys.length; i++) {
      if (this.tiles[tilesKeys[i]].z !== z) {
        delete this.tiles[tilesKeys[i]];
      }
    }
    const tile = L$5.DomUtil.create('div', 'leaflet-tile');
    const size = this.getTileSize();

    // setup tile width and height according to the options
    tile.width = size.x;
    tile.height = size.y;
    return tile;
  },
  onAdd(map) {
    // Very important line
    L$5.GridLayer.prototype.onAdd.call(this, map);
    this.map = map;
    const zoom = Math.round(this.map.getZoom());
    if (zoom > this.options.maxZoom || zoom < this.options.minZoom) {
      return;
    }
    map.on('click', this.click, this);
    map.on('mousemove', this.move, this);
  },
  onRemove() {
    const {
      map
    } = this;
    map.off('click', this.click, this);
    map.off('mousemove', this.move, this);
  },
  click(e) {
    this.fire('click', this.objectForEvent(e));
  },
  move(e) {
    const on = this.objectForEvent(e);
    if (on.data !== this.mouseOn) {
      if (this.mouseOn) {
        this.fire('mouseout', {
          latlng: e.latlng,
          data: this.mouseOn
        });
      }
      if (on.data) {
        this.fire('mouseover', on);
      }
      this.mouseOn = on.data;
    } else if (on.data) {
      this.fire('mousemove', on);
    }
  },
  objectForEvent(e) {
    return L$5.extend({
      latlng: e.latlng,
      data: null
    }, e);
  }
});

const {
  L: L$4
} = typeof window !== 'undefined' ? window : {};
const eval2$1 = eval;
const LeafletLayer = layerModel => {
  if (!L$4) throw new Error('Leaflet must be defined.');
  const {
    layerConfig,
    params,
    sqlParams,
    decodeParams,
    interactivity
  } = layerModel;
  let layer;
  const layerConfigParsed = layerConfig.parse === false ? layerConfig : JSON.parse(replace(JSON.stringify(layerConfig), params, sqlParams));

  // Transforming data layer
  if (layerConfigParsed.body.crs && L$4.CRS[layerConfigParsed.body.crs]) {
    layerConfigParsed.body.crs = L$4.CRS[layerConfigParsed.body.crs.replace(':', '')];
    layerConfigParsed.body.pane = 'tilePane';
  }
  switch (layerConfigParsed.type) {
    case 'wms':
      layer = L$4.tileLayer.wms(layerConfigParsed.url || layerConfigParsed.body.url, layerConfigParsed.body);
      break;
    case 'tileLayer':
      if (JSON.stringify(layerConfigParsed.body).indexOf('style: "function') >= 0) {
        layerConfigParsed.body.style = eval2$1(`(${layerConfigParsed.body.style})`);
      }
      if (decodeParams && layerConfigParsed.canvas) {
        layer = new CanvasLayer(_objectSpread2({}, layerModel));
      } else {
        layer = L$4.tileLayer(layerConfigParsed.url || layerConfigParsed.body.url, layerConfigParsed.body);
      }

      // Add interactivity
      if (interactivity) {
        const interactiveLayer = new UTFGridLayer();
        const LayerGroup = L$4.LayerGroup.extend({
          group: true,
          setOpacity: opacity => {
            layerModel.mapLayer.getLayers().forEach(l => {
              l.setOpacity(opacity);
            });
          }
        });
        layer = new LayerGroup([layer, interactiveLayer]);
      }
      break;
    case 'cluster':
      if (JSON.stringify(layerConfigParsed.body).indexOf('style: "function') >= 0) {
        layerConfigParsed.body.style = eval2$1(`(${layerConfigParsed.body.style})`);
      }
      layer = new ClusterLayer(layerModel);
      break;
    default:
      layer = L$4[layerConfigParsed.type](layerConfigParsed.body, layerConfigParsed.options || {});
      break;
  }
  return new Promise((resolve, reject) => {
    if (layer) {
      resolve(layer);
    } else {
      reject(new Error('"type" specified in layer spec doesn`t exist'));
    }
  });
};
LeafletLayer.getBounds = layerModel => {
  if (!L$4) throw new Error('Leaflet must be defined.');
  const {
    layerConfig,
    params,
    sqlParams
  } = layerModel;
  const layerConfigParsed = layerConfig.parse === false ? layerConfig : JSON.parse(replace(JSON.stringify(layerConfig), params, sqlParams));
  const {
    bbox
  } = layerConfigParsed;
  return new Promise(resolve => {
    if (bbox) {
      const bounds = [[bbox[1], bbox[0]], [bbox[3], bbox[2]]];
      resolve(bounds);
    } else {
      resolve(null);
    }
  });
};

const {
  L: L$3
} = typeof window !== 'undefined' ? window : {};
const eval2 = eval;
const EsriLayer = layerModel => {
  if (!L$3) throw new Error('Leaflet must be defined.');
  if (!L$3.esri) {
    throw new Error('To support this layer you should add esri library for Leaflet.');
  }

  // Preparing layerConfig
  const {
    layerConfig,
    interactivity,
    params,
    sqlParams
  } = layerModel;
  const layerConfigParsed = layerConfig.parse === false ? layerConfig : JSON.parse(replace(JSON.stringify(layerConfig), params, sqlParams));
  const bodyStringified = JSON.stringify(layerConfigParsed.body || {}).replace(/"mosaic-rule":/g, '"mosaicRule":').replace(/"mosaic_rule":/g, '"mosaicRule":').replace(/"use-cors":/g, '"useCors":').replace(/"use_cors":/g, '"useCors":');

  // If type is a method of leaflet, returns LeafletLayer
  if (L$3[layerConfigParsed.type]) return new LeafletLayer(_objectSpread2({}, layerModel));
  return new Promise((resolve, reject) => {
    if (!L$3.esri[layerConfigParsed.type]) {
      return reject(new Error('"type" specified in layer spec doesn`t exist'));
    }
    const layerOptions = JSON.parse(bodyStringified);
    layerOptions.pane = 'tilePane';
    layerOptions.useCors = true;
    // forcing cors
    if (layerOptions.style && layerOptions.style.indexOf('function') >= 0) {
      layerOptions.style = eval2(`(${layerOptions.style})`);
    }
    let layer;
    layer = L$3.esri[layerConfigParsed.type](layerOptions);
    if (layer) {
      // Little hack to set zIndex at the beginning
      layer.on('load', () => {
        layer.setZIndex(layerModel.zIndex);
      });
      layer.on('requesterror', err => console.error(err));
    } else {
      return reject();
    }
    if (!layer.setZIndex) {
      layer.setZIndex = zIndex => {
        if (layer._currentImage) {
          layer._currentImage._image.style.zIndex = zIndex;
        }
      };
    }

    // Add interactivity
    if (interactivity) {
      const interactiveLayer = new UTFGridLayer();
      const LayerGroup = L$3.LayerGroup.extend({
        group: true,
        setOpacity: opacity => {
          layerModel.mapLayer.getLayers().forEach(l => {
            l.setOpacity(opacity);
          });
        }
      });
      layer = new LayerGroup([layer, interactiveLayer]);
    }
    return resolve(layer);
  });
};

const {
  L: L$2
} = typeof window !== 'undefined' ? window : {};
const GEELayer = layerModel => {
  if (!L$2) throw new Error('Leaflet must be defined.');
  const {
    id,
    layerConfig,
    interactivity,
    params,
    sqlParams,
    decodeParams
  } = layerModel;
  const tileUrl = `https://api.resourcewatch.org/v1/layer/${id}/tile/gee/{z}/{x}/{y}`;
  const layerConfigParsed = layerConfig.parse === false ? layerConfig : JSON.parse(replace(JSON.stringify(layerConfig), params, sqlParams));
  let layer;
  switch (layerConfigParsed.type) {
    case 'tileLayer':
      if (decodeParams) {
        layer = new CanvasLayer(_objectSpread2({}, layerModel));
      } else {
        layer = L$2.tileLayer(tileUrl, layerConfigParsed.body);
      }
      break;
    default:
      layer = L$2.tileLayer(tileUrl, layerConfigParsed.body);
      break;
  }

  // Add interactivity
  if (interactivity) {
    const interactiveLayer = new UTFGridLayer();
    const LayerGroup = L$2.LayerGroup.extend({
      group: true,
      setOpacity: opacity => {
        layerModel.mapLayer.getLayers().forEach(l => {
          l.setOpacity(opacity);
        });
      }
    });
    layer = new LayerGroup([layer, interactiveLayer]);
  }
  return new Promise((resolve, reject) => {
    if (layer) {
      resolve(layer);
    } else {
      reject(new Error('"type" specified in layer spec doesn`t exist'));
    }
  });
};

const {
  L: L$1
} = typeof window !== 'undefined' ? window : {};
const maxBounds = L$1 && new L$1.LatLngBounds(new L$1.LatLng(49.4966745, -66.357422), new L$1.LatLng(24.6070691, -131.660156));
const LOCALayer = layerModel => {
  const {
    id,
    layerConfig,
    interactivity
  } = layerModel;
  const {
    period
  } = layerConfig;
  const year = (period || {}).value || '1971';
  const dateString = new Date(year).toISOString();
  const tileUrl = `https://api.resourcewatch.org/v1/layer/${id}/tile/loca/{z}/{x}/{y}?year=${dateString}`;
  let layer = L$1.tileLayer(tileUrl, _objectSpread2(_objectSpread2({}, layerConfig.body), {}, {
    minNativeZoom: 4,
    bounds: maxBounds
  }));

  // Add interactivity
  if (interactivity) {
    const interactiveLayer = new UTFGridLayer();
    const LayerGroup = L$1.LayerGroup.extend({
      group: true,
      setOpacity: opacity => {
        layerModel.mapLayer.getLayers().forEach(l => {
          l.setOpacity(opacity);
        });
      }
    });
    layer = new LayerGroup([layer, interactiveLayer]);
  }
  return new Promise(resolve => {
    resolve(layer);
  });
};

const {
  L
} = typeof window !== 'undefined' ? window : {};
const NEXGDDPLayer = layerModel => {
  const {
    id,
    layerConfig,
    interactivity
  } = layerModel;
  const {
    period
  } = layerConfig;
  const year = (period || {}).value || '1971-01-01';
  const dateString = new Date(year).toISOString();
  const tileUrl = `https://api.resourcewatch.org/v1/layer/${id}/tile/nexgddp/{z}/{x}/{y}?year=${dateString}`;
  let layer = L.tileLayer(tileUrl, layerConfig.body);

  // Add interactivity
  if (interactivity) {
    const interactiveLayer = new UTFGridLayer();
    const LayerGroup = L.LayerGroup.extend({
      group: true,
      setOpacity: opacity => {
        layerModel.mapLayer.getLayers().forEach(l => {
          l.setOpacity(opacity);
        });
      }
    });
    layer = new LayerGroup([layer, interactiveLayer]);
  }
  return new Promise(resolve => {
    resolve(layer);
  });
};

class PluginLeaflet {
  constructor(map) {
    _defineProperty(this, "events", {});
    _defineProperty(this, "method", {
      // CARTO
      cartodb: CartoLayer,
      carto: CartoLayer,
      raster: CartoLayer,
      // ESRI
      arcgis: EsriLayer,
      featureservice: EsriLayer,
      mapservice: EsriLayer,
      tileservice: EsriLayer,
      esrifeatureservice: EsriLayer,
      esrimapservice: EsriLayer,
      esritileservice: EsriLayer,
      // GEE && LOCA && NEXGDDP
      gee: GEELayer,
      loca: LOCALayer,
      nexgddp: NEXGDDPLayer,
      // LEAFLET
      leaflet: LeafletLayer,
      wms: LeafletLayer
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

export { PluginLeaflet, concatenation, LayerManager as default, replace, substitution };
