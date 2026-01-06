"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _clusterService = require("../../services/cluster-service");
var _supercluster = _interopRequireDefault(require("supercluster"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); } /* eslint no-underscore-dangle: 0 */
const {
  L
} = typeof window !== 'undefined' ? window : {};
const defaultSizes = {
  50: 25,
  100: 30,
  1000: 40
};
const ClusterLayer = L && L.GeoJSON.extend({
  initialize(layerModel) {
    const self = this;
    L.GeoJSON.prototype.initialize.call(this, []);
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
    L.Util.setOptions(this, {
      // converts feature to icon
      pointToLayer(feature, latlng) {
        const isCluster = feature.properties && feature.properties.cluster;

        // if cluster return point icon
        if (!isCluster) {
          // see documentation for icon config https://leafletjs.com/reference-1.3.4.html#icon
          return L.marker(latlng, {
            icon: L.icon(_objectSpread({
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
          iconSize = L.point(size, size);
        }

        // see documentation for icon config https://leafletjs.com/reference-1.3.4.html#divicon
        return L.marker(latlng, {
          icon: L.divIcon(_objectSpread({
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
          layer.on(Object.keys(events).reduce((obj, event) => _objectSpread(_objectSpread({}, obj), {}, {
            [event]: e => events[event](_objectSpread(_objectSpread({}, e), {}, {
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
    this.supercluster = (0, _supercluster.default)(_objectSpread({
      radius: 80,
      maxZoom: 16
    }, clusterConfig));
    (0, _clusterService.fetchData)(layerModel).then(response => {
      // Handle canceled requests - don't process further
      if (response === _clusterService.CANCELED) {
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
    L.GeoJSON.prototype.onAdd.call(this, map);
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
    L.GeoJSON.prototype.clearLayers.call(this, []);
  }
});
var _default = exports.default = ClusterLayer;