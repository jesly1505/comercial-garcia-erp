import { MemoryCache } from '../../utils/cache';

describe('MemoryCache Service Unit Tests', () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache(1000); // 1s TTL
  });

  afterEach(() => {
    cache.destroy();
  });

  it('should store and retrieve values correctly', () => {
    cache.set('key1', { name: 'Comercial Garcia' }, 5000);
    const retrieved = cache.get<{ name: string }>('key1');
    expect(retrieved).toEqual({ name: 'Comercial Garcia' });
  });

  it('should return null for expired keys', async () => {
    cache.set('tempKey', 'tempValue', 50); // 50ms TTL
    expect(cache.get('tempKey')).toBe('tempValue');

    await new Promise((resolve) => setTimeout(resolve, 70));

    expect(cache.get('tempKey')).toBeNull();
  });

  it('should delete specific keys', () => {
    cache.set('toDelete', 'value');
    expect(cache.get('toDelete')).toBe('value');
    cache.delete('toDelete');
    expect(cache.get('toDelete')).toBeNull();
  });

  it('should invalidate keys matching regex patterns', () => {
    cache.set('products:1', { id: 1 });
    cache.set('products:2', { id: 2 });
    cache.set('customers:1', { id: 1 });

    cache.invalidatePattern(/^products:/);

    expect(cache.get('products:1')).toBeNull();
    expect(cache.get('products:2')).toBeNull();
    expect(cache.get('customers:1')).toEqual({ id: 1 });
  });
});
