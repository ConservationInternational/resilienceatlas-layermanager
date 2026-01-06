"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.substitution = exports.replace = exports.default = exports.concatenation = void 0;
var _compact = _interopRequireDefault(require("lodash/compact"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
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
exports.substitution = substitution;
const concatenation = (originalStr, params = {}) => {
  let str = originalStr;
  let sql;
  Object.keys(params).forEach(key => {
    sql = `${(0, _compact.default)(Object.keys(params[key]).map(k => {
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
exports.concatenation = concatenation;
const replace = (originalStr, params = {}, sqlParams = {}) => {
  let str = originalStr;
  if (typeof str === 'string') {
    str = substitution(str, params);
    str = concatenation(str, sqlParams);
  }
  return str;
};
exports.replace = replace;
var _default = exports.default = {
  substitution,
  concatenation,
  replace
};