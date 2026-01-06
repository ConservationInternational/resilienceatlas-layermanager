import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const name = 'LayerManager';
const path = 'dist/layer-manager';
const globals = {
  axios: 'axios',
  leaflet: 'L',
  'lodash/compact': 'compact',
  'lodash/debounce': 'debounce',
  'lodash/isEmpty': 'isEmpty',
  'lodash/isEqual': 'isEqual',
  'prop-types': 'PropTypes',
  'react-dom': 'ReactDOM',
  react: 'React',
};
const external = Object.keys(globals);
const babelOptions = () => ({
  babelHelpers: 'bundled',
  babelrc: false,
  presets: [
    ['@babel/preset-env', { 
      modules: false,
      targets: '> 0.5%, last 2 versions, Firefox ESR, not dead, not IE 11'
    }],
    '@babel/preset-react'
  ],
  plugins: [
    '@babel/plugin-transform-class-properties',
    '@babel/plugin-transform-object-rest-spread',
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.js', '.jsx']
      }
    ]
  ],
});

export default [
  {
    input: 'src/index.js',
    output: {
      file: pkg.module,
      format: 'es',
    },
    external,
    plugins: [babel(babelOptions()), resolve()]
  },
  {
    input: 'src/index.umd.js',
    output: {
      name,
      file: `${path}.js`,
      format: 'umd',
      globals,
    },
    external,
    plugins: [babel(babelOptions()), resolve(), commonjs()]
  },
  {
    input: 'src/index.umd.js',
    output: {
      name,
      file: `${path}.min.js`,
      format: 'umd',
      globals,
    },
    external,
    plugins: [babel(babelOptions()), resolve(), commonjs(), terser()]
  },
  // Components
  {
    input: 'src/components/index.js',
    output: {
      file: 'dist/components/index.esm.js',
      format: 'esm',
    },
    external,
    plugins: [babel(babelOptions()), resolve()]
  },
  {
    input: 'src/components/index.umd.js',
    output: {
      name,
      file: 'dist/components/index.js',
      format: 'umd',
      globals,
    },
    external,
    plugins: [babel(babelOptions()), resolve(), commonjs()]
  }
];
