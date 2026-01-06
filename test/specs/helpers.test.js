import { expect } from 'chai';
import { get } from '../../src/lib/request';

describe('# HTTP Request', () => {
  it('get returns a promise', () => {
    const request = get('https://api.resourcewatch.org/v1/layer?application=rw&page[size]=1&page[number]=1');
    expect(request).to.be.a('promise');
    // Cancel the request to avoid pending promises
    request.catch(() => {});
  });

  it('get function exists and is callable', () => {
    expect(get).to.be.a('function');
  });
});
