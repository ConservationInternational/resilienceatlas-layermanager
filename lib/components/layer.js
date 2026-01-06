"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _react = require("react");
var _propTypes = _interopRequireDefault(require("prop-types"));
var _layerManager = _interopRequireDefault(require("../layer-manager"));
const _excluded = ["layerManager"];
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _objectWithoutProperties(e, t) { if (null == e) return {}; var o, r, i = _objectWithoutPropertiesLoose(e, t); if (Object.getOwnPropertySymbols) { var n = Object.getOwnPropertySymbols(e); for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]); } return i; }
function _objectWithoutPropertiesLoose(r, e) { if (null == r) return {}; var t = {}; for (var n in r) if ({}.hasOwnProperty.call(r, n)) { if (-1 !== e.indexOf(n)) continue; t[n] = r[n]; } return t; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
class Layer extends _react.PureComponent {
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
  id: _propTypes.default.oneOfType([_propTypes.default.string, _propTypes.default.number]).isRequired,
  layerManager: _propTypes.default.instanceOf(_layerManager.default)
});
_defineProperty(Layer, "defaultProps", {
  layerManager: null
});
var _default = exports.default = Layer;