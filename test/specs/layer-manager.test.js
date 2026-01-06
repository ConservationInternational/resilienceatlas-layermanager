/* eslint no-unused-expressions: 0 */

import { expect } from 'chai';
import LayerManager from '../../src/layer-manager';
import PluginLeaflet from '../../src/plugins/plugin-leaflet';
import LayerModel from '../../src/layer-model';

describe('LayerManager', () => {
  describe('# LayerManager class', () => {
    it('should export LayerManager as default', () => {
      expect(LayerManager).to.be.a('function');
    });

    it('should have required methods', () => {
      // Check that the class prototype has required methods
      expect(LayerManager.prototype.add).to.be.a('function');
      expect(LayerManager.prototype.remove).to.be.a('function');
      expect(LayerManager.prototype.renderLayers).to.be.a('function');
    });
  });

  describe('# PluginLeaflet', () => {
    it('should export PluginLeaflet', () => {
      expect(PluginLeaflet).to.be.a('function');
    });

    it('should have required methods for plugins', () => {
      // Mock map object for plugin instantiation
      const mockMap = {};
      const plugin = new PluginLeaflet(mockMap);
      
      expect(plugin.add).to.be.a('function');
      expect(plugin.remove).to.be.a('function');
      expect(plugin.setVisibility).to.be.a('function');
      expect(plugin.setOpacity).to.be.a('function');
    });
  });

  describe('# LayerModel', () => {
    it('should export LayerModel', () => {
      expect(LayerModel).to.be.a('function');
    });

    it('should create a layer model with given spec', () => {
      const spec = {
        id: 'test-layer-1',
        opacity: 0.8,
        visibility: true,
        zIndex: 1
      };
      const model = new LayerModel(spec);
      
      expect(model.id).to.equal('test-layer-1');
      expect(model.opacity).to.equal(0.8);
      expect(model.visibility).to.equal(true);
    });
  });
});
