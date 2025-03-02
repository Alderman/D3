// Check if domain extension matches the blockchain
const validateDomainChain = (domain, chain) => {
  if (!domain || !domain.includes('.')) return true; // Skip validation for non-domain inputs
  
  const extension = domain.split('.').pop().toLowerCase();
  const validChains = {
    'core': 'CORE',
    'shib': 'BONE', 
    'ape': 'APE',
    'vic': 'VIC',
    'eth': 'ETH'
    // Add more mappings as needed
  };
  
  // If we don't have mapping info, consider it valid
  if (!validChains[extension]) return true;
  
  return validChains[extension] === chain;
};

import React, { useState, useEffect } from 'react';
import { DNSConnect } from '@webinterop/dns-connect';
import './App.css';
import OnChainResolver from './OnChainResolver';
import UserProfileCard from './UserProfileCard';

function App() {
const [name, setName] = useState('');
const [blockchain, setBlockchain] = useState('CORE');
const [reverse, setReverse] = useState(false);
const [result, setResult] = useState('');
const [multipleResults, setMultipleResults] = useState([]);
const [status, setStatus] = useState('idle');
const [resolutionDetails, setResolutionDetails] = useState(null);
const [isWalletConnected, setIsWalletConnected] = useState(false);
const [account, setAccount] = useState('');
const [activeTab, setActiveTab] = useState('resolver');
const [resolutionHistory, setResolutionHistory] = useState([]);
const [userProfileData, setUserProfileData] = useState(null);
const [analyticsData, setAnalyticsData] = useState({
  totalQueries: 0,
  successfulQueries: 0,
  failedQueries: 0,
  byBlockchain: {},
  byDomain: {}
});

// Create an instance of DNSConnect for live resolution
const d3connect = new DNSConnect();

// Supported blockchains based on documentation
const supportedBlockchains = [
  { value: 'ETH', label: 'Ethereum' },
  { value: 'BTC', label: 'Bitcoin' },
  { value: 'BONE', label: 'Shibarium' },
  { value: 'CORE', label: 'Core' },
  { value: 'VIC', label: 'Viction' },
  { value: 'MATIC', label: 'Polygon' },
  { value: 'ADA', label: 'Cardano' },
  { value: 'APE', label: 'ApeChain' }
];

// Connect wallet function
const connectWallet = async () => {
  if (window.ethereum) {
    try {
      setStatus('connecting');
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      setIsWalletConnected(true);
      setStatus('idle');
    } catch (error) {
      console.error('Error connecting to wallet:', error);
      setStatus('error');
    }
  } else {
    alert('Please install MetaMask or another Ethereum wallet provider');
  }
};

useEffect(() => {
  // Check if wallet is already connected
  const checkWalletConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsWalletConnected(true);
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    }
  };

  checkWalletConnection();
}, []);

// Fetch user profile data from D3 API
const fetchUserProfile = async (identifier, blockchain) => {
  try {
    console.log(`Fetching user profile for ${identifier} (${blockchain})`);
    
    // Call the actual D3 API
    // Example API endpoint: https://api-public.d3.app/v1/user/profile/{identifier}
    const apiUrl = `https://api-public.d3.app/v1/user/profile/${identifier}?blockchain=${blockchain}`;
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      // If domain is in valid format but not found, set as unconnected
      if (identifier.includes('.')) {
        setUserProfileData({
          type: 'unconnected',
          domainName: identifier,
          blockchain: blockchain,
          registrationDate: 'Unknown',
          note: response.status === 404 ? 
            'Domain not found or not registered' : 
            `Error fetching domain information (${response.status})`
        });
      } else {
        setUserProfileData(null);
      }
      return;
    }
    
    const userData = await response.json();
    
    // For wallet addresses, also fetch all domains owned by this address
    if (identifier.startsWith('0x')) {
      // Ensure the profileUrl is set for wallet addresses
      userData.profileUrl = `https://d3.app/user/${identifier}`;
      
      // Fetch all domains owned by this wallet
      const domains = await fetchDomainsForAddress(identifier, blockchain);
      
      if (domains && domains.length > 0) {
        userData.domainsOwned = domains.map(domain => ({
          name: domain.name,
          blockchain: domain.blockchain || blockchain,
          registrationDate: domain.registrationDate || 'Unknown',
          primaryDomain: domain.primaryDomain || false
        }));
      }
    }
    
    setUserProfileData(userData);
    
  } catch (error) {
    console.error('Error fetching user profile:', error);
    setUserProfileData(null);
  }
};

// Function to fetch all domains owned by an address
const fetchDomainsForAddress = async (address, blockchain, queryAllBlockchains = false) => {
  try {
    console.log('Attempting to fetch domains for address:', address);
    
    // Approach 1: Use reverse resolution to find primary domain(s)
    let allDomains = [];
    const seenDomains = new Set();
    
    // First attempt to use the proper API endpoint to get ALL domains for this wallet
    try {
      console.log('Attempting to fetch all domains from API endpoint');
      const apiUrl = `https://api-public.d3.app/v1/domains/wallet/${address}`;
      const response = await fetch(apiUrl);
      
      if (response.ok) {
        const data = await response.json();
        console.log('API returned domain data:', data);
        
        if (data && Array.isArray(data.domains) && data.domains.length > 0) {
          console.log(`Found ${data.domains.length} domains via API`);
          
          // Process all domains returned by API
          data.domains.forEach(domain => {
            const domainName = domain.name || domain.domainName;
            if (!domainName) return;
            
            const domainLower = domainName.toLowerCase();
            if (!seenDomains.has(domainLower)) {
              seenDomains.add(domainLower);
              
              // Determine correct blockchain based on extension
              let domainBlockchain = domain.blockchain;
              
              // If blockchain not explicitly provided, determine from extension
              if (!domainBlockchain && domainName.includes('.')) {
                const extension = domainName.split('.').pop().toLowerCase();
                const blockchainMapping = {
                  'core': 'CORE',
                  'shib': 'BONE',
                  'ape': 'APE',
                  'vic': 'VIC',
                  'eth': 'ETH',
                  'matic': 'MATIC'
                };
                
                if (blockchainMapping[extension]) {
                  domainBlockchain = blockchainMapping[extension];
                }
              }
              
              allDomains.push({
                name: domainName,
                blockchain: domainBlockchain || blockchain,
                primaryDomain: domain.isPrimary || false,
                registrationDate: domain.registrationDate || 'Unknown'
              });
            }
          });
        }
      } else {
        console.log(`API returned status ${response.status} for wallet domains`);
      }
    } catch (apiError) {
      console.error('Error fetching domains from API:', apiError);
    }
    
    // Approach 2: If API didn't return any domains or failed, fallback to reverse resolution
    if (allDomains.length === 0 && queryAllBlockchains) {
      console.log('API approach failed or returned no domains, falling back to reverse resolution');
      
      // Loop through all supported blockchains and attempt reverse resolution for each
      const resolutionPromises = supportedBlockchains.map(async (chain) => {
        try {
          console.log(`Attempting reverse resolution for ${address} on ${chain.value}`);
          const domain = await d3connect.reverseResolve(address, chain.value);
          
          if (domain) {
            const domainLower = domain.toLowerCase();
            
            // Check if we've already seen this domain to avoid duplicates
            if (!seenDomains.has(domainLower)) {
              console.log(`Found domain via reverse resolution on ${chain.value}: ${domain}`);
              seenDomains.add(domainLower);
              
              // Determine correct blockchain based on extension
              let blockchainToUse = chain.value;
              
              // If the domain has an extension, verify it matches the blockchain
              if (domain.includes('.')) {
                const extension = domain.split('.').pop().toLowerCase();
                const blockchainMapping = {
                  'core': 'CORE',
                  'shib': 'BONE',
                  'ape': 'APE',
                  'vic': 'VIC',
                  'eth': 'ETH',
                  'matic': 'MATIC'
                };
                
                if (blockchainMapping[extension]) {
                  blockchainToUse = blockchainMapping[extension];
                  console.log(`Corrected blockchain for ${domain} from ${chain.value} to ${blockchainToUse} based on extension`);
                }
              }
              
              allDomains.push({
                name: domain,
                blockchain: blockchainToUse,
                primaryDomain: blockchainToUse === blockchain // Mark as primary only for the original blockchain
              });
            } else {
              console.log(`Skipping duplicate domain ${domain} already found on another blockchain`);
            }
          }
        } catch (error) {
          console.error(`Error during reverse resolution for ${chain.value}:`, error);
        }
      });
      
      // Wait for all resolution attempts to complete
      await Promise.all(resolutionPromises);
    } else if (!queryAllBlockchains && allDomains.length === 0) {
      // For single blockchain lookup, try reverse resolution if API failed
      console.log(`Performing single blockchain reverse resolution for ${blockchain}`);
      const domain = await d3connect.reverseResolve(address, blockchain);
      
      if (domain) {
        return [{
          name: domain,
          blockchain: blockchain,
          primaryDomain: true
        }];
      }
    }
    
    console.log(`Found ${allDomains.length} unique domains in total`);
    return allDomains;
  } catch (error) {
    console.error('Error in domain fetching approach:', error);
    return [];
  }
};

// Helper function to fetch extra domains from custom sources or heuristics
const fetchExtraDomainsFromCustomSources = async (address) => {
  console.log('Checking for additional domains using custom sources - feature disabled');
  
  // This function is now empty as we're removing all fallback logic
  return [];
};

// Add a useEffect to monitor changes to multipleResults
useEffect(() => {
  console.log('multipleResults state changed:', multipleResults);
  console.log('multipleResults length:', multipleResults.length);
}, [multipleResults]);

// Add a useEffect to monitor changes to userProfileData
useEffect(() => {
  if (userProfileData) {
    console.log('userProfileData changed:', userProfileData);
    console.log('userProfileData.domainsOwned:', userProfileData.domainsOwned);
    if (userProfileData.domainsOwned) {
      console.log('domainsOwned length:', userProfileData.domainsOwned.length);
      console.log('domainsOwned names:', userProfileData.domainsOwned.map(d => d.name).join(', '));
    }
  }
}, [userProfileData]);

// Resolve function to handle lookups
const resolve = async () => {
  if (!name || !blockchain) {
    alert('Please enter both name and blockchain');
    return;
  }

  setStatus('loading');
  setResult('');
  setMultipleResults([]);
  setResolutionDetails(null);
  setUserProfileData(null);

  try {
    // Update analytics
    setAnalyticsData(prev => ({
      ...prev,
      totalQueries: prev.totalQueries + 1,
      byBlockchain: {
        ...prev.byBlockchain,
        [blockchain]: (prev.byBlockchain[blockchain] || 0) + 1
      },
      byDomain: {
        ...prev.byDomain,
        [name]: (prev.byDomain[name] || 0) + 1
      }
    }));
    
    // Check for domain-blockchain mismatch and warn user
    const isValidChain = validateDomainChain(name, blockchain);
    
    if (!isValidChain && name.includes('.')) {
      console.log(`Warning: ${name} should be resolved on its native blockchain`);
    }

    console.log(`Resolving ${name} on ${blockchain}`);

    if (reverse) {
      // Reverse resolution: address -> name
      console.log(`Performing reverse resolution for address ${name} on ${blockchain}`);
      
      const res = await d3connect.reverseResolve(name, blockchain);
      console.log(`Reverse resolution result: ${res}`);
      
      // For wallet addresses, get all domains
      if (name.startsWith('0x')) {
        // Get all domains owned by this address from the API
        // When doing a reverse lookup for a wallet, query ALL blockchains
        const allDomains = await fetchDomainsForAddress(name, blockchain, true); // Query across all blockchains
        
        console.log(`Found ${allDomains.length} domains across all blockchains for address ${name}`);
        console.log('All domains before processing:', JSON.stringify(allDomains));
        
        let formattedDomains = [];
        if (res) {
          // Add the primary domain from reverse resolution
          formattedDomains.push({
            name: res,
            blockchain: blockchain,
            primaryDomain: true
          });
          console.log('Added primary domain from reverse resolution:', res);
          
          // Add other domains from the fetchDomainsForAddress call
          if (allDomains && allDomains.length > 0) {
            // Filter out the primary domain (already included above)
            // Make sure we're correctly comparing domain names - some API responses might include
            // the domain name in a different field or case
            const primaryDomainLower = res.toLowerCase();
            console.log('Primary domain (lowercase):', primaryDomainLower);
            
            const otherDomains = allDomains.filter(domain => {
              const domainName = domain.name || '';
              const domainNameLower = domainName.toLowerCase();
              const isDuplicate = domainNameLower === primaryDomainLower;
              
              if (isDuplicate) {
                console.log(`Filtering out duplicate domain: ${domainName}`);
              }
              
              return !isDuplicate;
            }).map(domain => {
              console.log(`Processing domain: ${domain.name}, blockchain: ${domain.blockchain || blockchain}`);
              return {
                name: domain.name,
                blockchain: domain.blockchain || blockchain,
                registrationDate: domain.registrationDate || 'Unknown',
                primaryDomain: false
              };
            });
            
            console.log(`Adding ${otherDomains.length} other domains to formatted domains`);
            formattedDomains = [...formattedDomains, ...otherDomains];
          }
        } else if (allDomains && allDomains.length > 0) {
          // If reverse resolution didn't find a primary domain but the API found domains
          formattedDomains = allDomains.map(domain => ({
            name: domain.name,
            blockchain: domain.blockchain || blockchain,
            registrationDate: domain.registrationDate || 'Unknown',
            primaryDomain: false
          }));
          console.log('No primary domain from reverse resolution, using all domains from API');
        }
        
        console.log('Final formatted domains:', JSON.stringify(formattedDomains));
        
        setMultipleResults(formattedDomains);
        console.log('Setting multipleResults with length:', formattedDomains.length);
        
        setResult(res || (formattedDomains.length > 0 ? 
          `Found ${formattedDomains.length} domains for this address` : 
          'No primary domain found for this address'));
        
        // Fetch profile data for the wallet address and include all domains
        const userData = {
          id: name,
          type: 'wallet',
          displayName: name.substring(0, 6) + '...' + name.substring(name.length - 4),
          profileUrl: `https://d3.app/user/${name}`,
          domainsOwned: formattedDomains
        };
        
        console.log('Setting userProfileData with domainsOwned length:', formattedDomains.length);
        console.log('userProfileData domain names:', formattedDomains.map(d => d.name).join(', '));
        
        setUserProfileData(userData);
        
        // Set resolution details
        if (res) {
          setResolutionDetails({
            registrationStatus: 'Registered',
            expirationDate: 'Unknown (Not Available via API)',
            resolutionMethod: 'Reverse Resolution',
            lastUpdated: new Date().toLocaleDateString(),
            walletAddress: name,
            primaryDomain: res,
            totalDomains: formattedDomains.length
          });
        } else if (formattedDomains.length > 0) {
          setResolutionDetails({
            registrationStatus: 'Domains Found',
            expirationDate: 'Unknown (Not Available via API)',
            resolutionMethod: 'Cross-chain Lookup',
            lastUpdated: new Date().toLocaleDateString(),
            walletAddress: name,
            totalDomains: formattedDomains.length
          });
        }
      } else {
        setResult(res || 'No name found for this address');
      }
    } else {
      // Forward resolution: name -> address
      console.log(`Performing forward resolution for name ${name} on ${blockchain}`);
      
      const res = await d3connect.resolve(name, blockchain);
      console.log(`Forward resolution result: ${res}`);
      
      // Show chain mismatch warning if applicable
      if (!isValidChain && name.includes('.')) {
        setResult(res ? 
          `${res} (Warning: This domain should be queried on its native blockchain)` : 
          'No address found for this name (Note: Try querying on the domain\'s native blockchain)');
      } else {
        setResult(res || 'No address found for this name');
      }
      
      // If we've resolved a domain to an address, fetch profile information
      if (res) {
        // In this case, the resolved address is the wallet owner
        await fetchUserProfile(res, blockchain);
        
        // Also fetch all domains owned by this address across all blockchains
        const userDomains = await fetchDomainsForAddress(res, blockchain, true);
        
        console.log(`Found ${userDomains.length} domains across all blockchains for resolved address ${res}`);
        
        // Update userProfileData with the domains if needed
        if (userDomains && userDomains.length > 0) {
          setUserProfileData(prevData => {
            if (!prevData) return prevData;
            
            return {
              ...prevData,
              domainsOwned: userDomains.map(domain => ({
                name: domain.name,
                blockchain: domain.blockchain || blockchain,
                registrationDate: domain.registrationDate || 'Unknown',
                primaryDomain: domain.name === name // Set the current domain as primary
              }))
            };
          });
          
          // Also update the results display to show all domains
          setMultipleResults(userDomains.map(domain => ({
            name: domain.name,
            blockchain: domain.blockchain || blockchain,
            primaryDomain: domain.name === name
          })));
        }
        
        // Set resolution details when we have a successful result
        setResolutionDetails({
          registrationStatus: 'Registered',
          expirationDate: 'Unknown (Not Available via API)',
          resolutionMethod: 'Forward Resolution',
          lastUpdated: new Date().toLocaleDateString(),
          resolvedAddress: res,
          domainName: name
        });
      } else if (name.includes('.')) {
        // If domain resolution failed but it's a valid domain format,
        // fetch the domain information to see if it's registered but unconnected
        await fetchUserProfile(name, blockchain);
      }
    }

    // Update analytics based on result
    setAnalyticsData(prev => ({
      ...prev,
      successfulQueries: result ? prev.successfulQueries + 1 : prev.successfulQueries,
      failedQueries: !result ? prev.failedQueries + 1 : prev.failedQueries
    }));

    // Add to resolution history
    const timestamp = new Date().toISOString();
    setResolutionHistory(prev => [
      {
        input: name,
        blockchain,
        result: result || 'Not Found',
        type: reverse ? 'Reverse' : 'Forward',
        timestamp
      },
      ...prev.slice(0, 9) // Keep only the 10 most recent lookups
    ]);
    
  } catch (err) {
    console.error('Error during resolution:', err);
    setResult(`Error while resolving: ${err.message || 'Unknown error'}`);
    
    // Update analytics for error
    setAnalyticsData(prev => ({
      ...prev,
      failedQueries: prev.failedQueries + 1
    }));
  } finally {
    setStatus('idle');
  }
};

const clearHistory = () => {
  setResolutionHistory([]);
};

return (
  <div className="app-container">
    <div className="stars-background">
      <div className="stars"></div>
      <div className="stars2"></div>
      <div className="stars3"></div>
    </div>
    
    <div className="content">
      <header className="app-header">
        <h1>Name Resolution Explorer</h1>
        <p className="subtitle">Resolve domain names across multiple blockchains</p>
      </header>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'resolver' ? 'active' : ''}`}
          onClick={() => setActiveTab('resolver')}
        >
          Name Resolver
        </button>
        <button 
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
        <button 
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>

      {activeTab === 'resolver' && (
        <>
          <div className="resolution-card">
            <div className="input-group">
              <label>
                {reverse ? 'Address to Resolve' : 'Name to Resolve'}
                <input
                  type="text"
                  placeholder={reverse ? 'Enter address (0x...)' : 'Enter domain (example.tld)'}
                  value={name}
                  onChange={(e) => {
                    // Just update the state without triggering resolution
                    setName(e.target.value);
                  }}
                />
              </label>
            </div>

            <div className="input-group">
              <label>
                Blockchain Network
                <select 
                  value={blockchain} 
                  onChange={(e) => setBlockchain(e.target.value)}
                >
                  {supportedBlockchains.map(chain => (
                    <option key={chain.value} value={chain.value}>
                      {chain.label} ({chain.value})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="toggle-group">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={reverse}
                  onChange={(e) => setReverse(e.target.checked)}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label">Reverse Resolution</span>
              </label>
            </div>

            <div className="action-buttons">
              <button 
                className="resolve-button" 
                onClick={resolve}
                disabled={status === 'loading'}
              >
                {status === 'loading' ? 'Resolving...' : 'Resolve'}
              </button>
              
              {!isWalletConnected && (
                <button 
                  className="wallet-button" 
                  onClick={connectWallet}
                  disabled={status === 'connecting'}
                >
                  {status === 'connecting' ? 'Connecting...' : 'Connect Wallet for On-chain Details'}
                </button>
              )}
            </div>
          </div>

          {result && (
            <div className="results-card">
              <h2>Resolution Result</h2>
              <div className="result-value">{result}</div>
              
              {multipleResults.length > 0 && (
                <div className="multiple-results">
                  <h3>All Domains for this Address</h3>
                  <ul className="domains-list">
                    {multipleResults.map((domain, index) => (
                      <li key={index} className={`domain-item ${domain.primaryDomain ? 'primary-domain' : ''}`}>
                        <span className="domain-name">{domain.name}</span>
                        <span className="domain-blockchain">{domain.blockchain}</span>
                        {domain.primaryDomain && <span className="primary-badge">Primary</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {resolutionDetails && (
                <div className="details-section">
                  <h3>Additional Details</h3>
                  <div className="details-grid">
                    <div className="detail-item">
                      <span className="detail-label">Status:</span>
                      <span className="detail-value">{resolutionDetails.registrationStatus}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Expires:</span>
                      <span className="detail-value">{resolutionDetails.expirationDate}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Resolution Method:</span>
                      <span className="detail-value">{resolutionDetails.resolutionMethod}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Last Updated:</span>
                      <span className="detail-value">{resolutionDetails.lastUpdated}</span>
                    </div>
                    {resolutionDetails.totalDomains && (
                      <div className="detail-item">
                        <span className="detail-label">Total Domains:</span>
                        <span className="detail-value">{resolutionDetails.totalDomains}</span>
                      </div>
                    )}
                    {resolutionDetails.primaryDomain && (
                      <div className="detail-item">
                        <span className="detail-label">Primary Domain:</span>
                        <span className="detail-value">{resolutionDetails.primaryDomain}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {isWalletConnected && !reverse && (
                <OnChainResolver name={name} blockchain={blockchain} />
              )}
              
              {userProfileData && (
                <UserProfileCard profile={userProfileData} />
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'analytics' && (
        <div className="analytics-card">
          <div className="analytics-header">
            <h2>Resolution Analytics</h2>
          </div>

          <div className="analytics-summary">
            <div className="analytics-stat">
              <span className="stat-value">{analyticsData.totalQueries}</span>
              <span className="stat-label">Total Queries</span>
            </div>
            <div className="analytics-stat">
              <span className="stat-value">{analyticsData.successfulQueries}</span>
              <span className="stat-label">Successful</span>
            </div>
            <div className="analytics-stat">
              <span className="stat-value">{analyticsData.failedQueries}</span>
              <span className="stat-label">Failed</span>
            </div>
            <div className="analytics-stat">
              <span className="stat-value">
                {analyticsData.totalQueries > 0 
                  ? ((analyticsData.successfulQueries / analyticsData.totalQueries) * 100).toFixed(0) + '%'
                  : '0%'}
              </span>
              <span className="stat-label">Success Rate</span>
            </div>
          </div>

          <div className="chart-container full-width">
            <h3>Network Distribution</h3>
            <div className="analytics-text-data">
              {Object.entries(analyticsData.byBlockchain).length === 0 ? (
                <p>No data available yet</p>
              ) : (
                Object.entries(analyticsData.byBlockchain).map(([network, count]) => (
                  <div key={network} className="analytics-text-item">
                    <span className="analytics-text-label">{network}:</span>
                    <span className="analytics-text-value">{count} queries</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="chart-container full-width">
            <h3>Popular Queries</h3>
            <div className="analytics-text-data">
              {Object.entries(analyticsData.byDomain).length === 0 ? (
                <p>No data available yet</p>
              ) : (
                Object.entries(analyticsData.byDomain)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([query, count]) => (
                    <div key={query} className="analytics-text-item">
                      <span className="analytics-text-label">{query}:</span>
                      <span className="analytics-text-value">{count} queries</span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="history-card">
          <div className="history-header">
            <h2>Resolution History</h2>
            <button className="history-clear-button" onClick={clearHistory}>
              Clear History
            </button>
          </div>
          
          {resolutionHistory.length === 0 ? (
            <p className="history-empty">No resolution history yet. Resolve some names to see them here.</p>
          ) : (
            <div className="history-list">
              {resolutionHistory.map((item, index) => (
                <div className="history-item" key={index}>
                  <div className="history-item-header">
                    <span className="history-item-type">{item.type}</span>
                    <span className="history-item-time">
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="history-item-content">
                    <div className="history-detail">
                      <span className="history-detail-label">Input:</span>
                      <span className="history-detail-value">{item.input}</span>
                    </div>
                    <div className="history-detail">
                      <span className="history-detail-label">Network:</span>
                      <span className="history-detail-value">{item.blockchain}</span>
                    </div>
                    <div className="history-detail">
                      <span className="history-detail-label">Result:</span>
                      <span className="history-detail-value">{item.result}</span>
                    </div>
                  </div>
                  <button 
                    className="history-rerun-button"
                    onClick={() => {
                      setName(item.input);
                      setBlockchain(item.blockchain);
                      setReverse(item.type === 'Reverse');
                      setActiveTab('resolver');
                    }}
                  >
                    Re-run
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  </div>
);
}

export default App;