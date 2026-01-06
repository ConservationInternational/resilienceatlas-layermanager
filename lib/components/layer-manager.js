"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _react = _interopRequireWildcard(require("react"));
var _propTypes = _interopRequireDefault(require("prop-types"));
var _layerManager = _interopRequireDefault(require("../layer-manager"));
var _layer = _interopRequireDefault(require("./layer"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
class LayerManager extends _react.PureComponent {
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
        // Check if any layer actually needs loading (no mapLayer yet, not pending, and not failed)
        const needsLoading = layers.some(l => !l.mapLayer && !this.layerManager.pendingRequests[l.id] && !this.layerManager.failedLayers[l.id]);
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
      plugin,
      onLayerError
    } = props;
    this.layerManager = new _layerManager.default(map, plugin, {
      onLayerError
    });
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
    if (children && _react.Children.count(children)) {
      return _react.Children.map(children, (child, i) => child && /*#__PURE__*/(0, _react.cloneElement)(child, {
        layerManager: this.layerManager,
        zIndex: child.props.zIndex || 1000 - i
      }));
    }
    if (layersSpec && layersSpec.length) {
      return /*#__PURE__*/_react.default.createElement(_react.Fragment, null, layersSpec.map((spec, i) => /*#__PURE__*/_react.default.createElement(_layer.default, _extends({
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
  map: _propTypes.default.object.isRequired,
  plugin: _propTypes.default.func.isRequired,
  layersSpec: _propTypes.default.arrayOf(_propTypes.default.object),
  children: _propTypes.default.oneOfType([_propTypes.default.arrayOf(_propTypes.default.node), _propTypes.default.node]),
  onLayerLoading: _propTypes.default.func,
  onLayerError: _propTypes.default.func,
  onReady: _propTypes.default.func
});
_defineProperty(LayerManager, "defaultProps", {
  children: [],
  layersSpec: [],
  onLayerLoading: null,
  onLayerError: null,
  onReady: null
});
var _default = exports.default = LayerManager;