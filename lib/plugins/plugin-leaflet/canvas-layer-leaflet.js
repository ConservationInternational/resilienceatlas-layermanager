"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _query = require("../../utils/query");
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
const {
  L
} = typeof window !== 'undefined' ? window : {};
const CanvasLayer = L && L.GridLayer.extend({
  tiles: {},
  createTile({
    x,
    y,
    z
  }, done) {
    const {
      params
    } = this.options;
    const id = (0, _query.replace)(params.url, _objectSpread({
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
    const tile = L.DomUtil.create('canvas', 'leaflet-tile');
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
      this.cacheTile(_objectSpread({
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
    const id = (0, _query.replace)(params.url, _objectSpread({
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
    const tileUrl = (0, _query.replace)(url, _objectSpread(_objectSpread({}, coords), params), sqlParams);
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
    this.tiles[tile.id] = _objectSpread(_objectSpread({}, this.tiles[tile.id]), tile);
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
        const id = (0, _query.replace)(params.url, _objectSpread(_objectSpread({
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
var _default = exports.default = CanvasLayer;