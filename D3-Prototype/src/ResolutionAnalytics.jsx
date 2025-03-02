import React, { useState, useEffect } from 'react';

// Simplified analytics component without chart libraries
function ResolutionAnalytics({ customModule }) {
  const [analytics, setAnalytics] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (customModule) {
      // Get analytics data from the custom module
      const data = customModule.getAnalytics();
      setAnalytics(data);
    }
  }, [customModule, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  const handleClearCache = () => {
    if (customModule) {
      customModule.clearCache();
      handleRefresh();
    }
  };

  if (!analytics || !analytics.enabled) {
    return (
      <div className="analytics-card">
        <h2>Resolution Analytics</h2>
        <p>Analytics tracking is disabled or no module is available.</p>
      </div>
    );
  }

  return (
    <div className="analytics-card">
      <div className="analytics-header">
        <h2>Resolution Analytics</h2>
        <div className="analytics-actions">
          <button className="analytics-button" onClick={handleRefresh}>
            Refresh
          </button>
          <button className="analytics-button" onClick={handleClearCache}>
            Clear Cache
          </button>
        </div>
      </div>

      <div className="analytics-summary">
        <div className="analytics-stat">
          <span className="stat-value">{analytics.totalQueries}</span>
          <span className="stat-label">Total Queries</span>
        </div>
        <div className="analytics-stat">
          <span className="stat-value">{analytics.cacheHitRate}</span>
          <span className="stat-label">Cache Hit Rate</span>
        </div>
        <div className="analytics-stat">
          <span className="stat-value">{analytics.cacheSize}</span>
          <span className="stat-label">Cache Size</span>
        </div>
        <div className="analytics-stat">
          <span className="stat-value">{analytics.errors}</span>
          <span className="stat-label">Errors</span>
        </div>
      </div>

      <div className="chart-container full-width">
        <h3>Network Distribution</h3>
        <div className="analytics-text-data">
          {Object.entries(analytics.resolutionsByNetwork).map(([network, count]) => (
            <div key={network} className="analytics-text-item">
              <span className="analytics-text-label">{network}:</span>
              <span className="analytics-text-value">{count} queries</span>
            </div>
          ))}
        </div>
      </div>

      <div className="chart-container full-width">
        <h3>Popular Queries</h3>
        <div className="analytics-text-data">
          {Object.entries(analytics.popularQueries)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([query, count]) => (
              <div key={query} className="analytics-text-item">
                <span className="analytics-text-label">{query}:</span>
                <span className="analytics-text-value">{count} queries</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

export default ResolutionAnalytics;