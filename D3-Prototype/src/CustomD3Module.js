// CustomD3Module.js
export class CustomD3Module {
    name = 'CustomD3Module';
    
    #cache = new Map();
    #analytics = {
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      resolutionsByNetwork: {},
      popularQueries: {}
    };
  
    constructor(options = {}) {
      this.options = {
        cacheTTL: 3600,
        trackAnalytics: true,
        apiBaseUrl: 'https://api-public.d3.app/v1',
        ...options
      };
    }
  
    async resolve(name, network) {
      if (this.options.trackAnalytics) {
        this.#analytics.totalQueries++;
        this.#analytics.resolutionsByNetwork[network] = (this.#analytics.resolutionsByNetwork[network] || 0) + 1;
        this.#analytics.popularQueries[name] = (this.#analytics.popularQueries[name] || 0) + 1;
      }
  
      const cacheKey = `${name}:${network}`;
      if (this.#cache.has(cacheKey)) {
        const cachedData = this.#cache.get(cacheKey);
        const now = Math.floor(Date.now() / 1000);
        
        if (now < cachedData.expiresAt) {
          if (this.options.trackAnalytics) {
            this.#analytics.cacheHits++;
          }
          return cachedData.address;
        }
        
        this.#cache.delete(cacheKey);
      }
  
      if (this.options.trackAnalytics) {
        this.#analytics.cacheMisses++;
      }
  
      try {
        // Call the actual D3 API for domain resolution
        const apiUrl = `${this.options.apiBaseUrl}/resolution/resolve?name=${encodeURIComponent(name)}&blockchain=${network}`;
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          console.error(`API error during resolution: ${response.status}`);
          return undefined;
        }
        
        const data = await response.json();
        
        if (data && data.address) {
          const ttl = this.options.cacheTTL;
          const now = Math.floor(Date.now() / 1000);
          this.#cache.set(cacheKey, {
            address: data.address,
            expiresAt: now + ttl
          });
          
          return data.address;
        }
        
        return undefined;
      } catch (error) {
        if (this.options.trackAnalytics) {
          this.#analytics.errors++;
        }
        console.error(`[CustomD3Module] Error resolving ${name} on ${network}:`, error);
        throw error;
      }
    }
  
    async reverseResolve(address, network) {
      if (this.options.trackAnalytics) {
        this.#analytics.totalQueries++;
        this.#analytics.resolutionsByNetwork[network] = (this.#analytics.resolutionsByNetwork[network] || 0) + 1;
      }
  
      const cacheKey = `reverse:${address}:${network}`;
      if (this.#cache.has(cacheKey)) {
        const cachedData = this.#cache.get(cacheKey);
        const now = Math.floor(Date.now() / 1000);
        
        if (now < cachedData.expiresAt) {
          if (this.options.trackAnalytics) {
            this.#analytics.cacheHits++;
          }
          return cachedData.name;
        }
        
        this.#cache.delete(cacheKey);
      }
  
      try {
        // Call the actual D3 API for reverse resolution
        const apiUrl = `${this.options.apiBaseUrl}/resolution/reverse-resolve?address=${address}&blockchain=${network}`;
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          console.error(`API error during reverse resolution: ${response.status}`);
          return undefined;
        }
        
        const data = await response.json();
        
        if (data && data.name) {
          const ttl = this.options.cacheTTL;
          const now = Math.floor(Date.now() / 1000);
          this.#cache.set(cacheKey, {
            name: data.name,
            expiresAt: now + ttl
          });
          
          return data.name;
        }
        
        return undefined;
      } catch (error) {
        if (this.options.trackAnalytics) {
          this.#analytics.errors++;
        }
        console.error(`[CustomD3Module] Error reverse resolving ${address} on ${network}:`, error);
        throw error;
      }
    }
  
    clearCache() {
      this.#cache.clear();
      return { success: true, message: 'Cache cleared' };
    }
  
    getAnalytics() {
      if (!this.options.trackAnalytics) {
        return { enabled: false };
      }
      
      return {
        enabled: true,
        ...this.#analytics,
        cacheSize: this.#cache.size,
        cacheHitRate: this.#analytics.totalQueries > 0 
          ? (this.#analytics.cacheHits / this.#analytics.totalQueries * 100).toFixed(2) + '%' 
          : '0%',
        topNetworks: Object.entries(this.#analytics.resolutionsByNetwork)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5),
        topQueries: Object.entries(this.#analytics.popularQueries)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
      };
    }
  }