// Check if domain extension matches the blockchain
// Note: This is now only used for informational purposes since domains 
// can legitimately resolve across multiple blockchains
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

// Export this function so it can be imported in other components
export const isWalletAddress = (input) => {
  if (!input) return false;
  
  // Check for Ethereum address (0x...)
  if (input.startsWith('0x') && input.length >= 40) {
    return true;
  }
  
  // Check for Bitcoin address formats:
  // - SegWit addresses start with bc1
  // - Legacy addresses start with 1 or 3 and are 25-34 chars long
  if (input.startsWith('bc1') || /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(input)) {
    return true;
  }
  
  return false;
};

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
    let apiUrl;
    
    if (isWalletAddress(identifier)) {
      // For wallet addresses, include the blockchain in the query
      const walletType = identifier.startsWith('0x') ? blockchain : 
                          (identifier.startsWith('bc1') || /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(identifier)) ? 'BTC' : 
                          blockchain;
      
      apiUrl = `https://api-public.d3.app/v1/user/profile/${identifier}?blockchain=${walletType}`;
    } else {
      // For domain names
      apiUrl = `https://api-public.d3.app/v1/user/profile/${identifier}?blockchain=${blockchain}`;
    }
    
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
    if (isWalletAddress(identifier)) {
      // Ensure the profileUrl is set for wallet addresses
      userData.profileUrl = identifier.startsWith('0x') ? 
        `https://d3.app/user/${identifier}` : 
        `https://d3.app/blockchain/${
          identifier.startsWith('bc1') || /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(identifier) ? 
          'BTC' : blockchain
        }/user/${identifier}`;
      
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
  console.log(`Fetching domains for address: ${address}, blockchain: ${blockchain}, queryAll: ${queryAllBlockchains}`);
  
  let apiUrl;
  let isBitcoinAddress = address.startsWith('bc1') || /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address);
  
  // Construct API URL based on address type
  if (address.startsWith('0x')) {
    // ETH/EVM address format
    apiUrl = `https://api-public.d3.app/v1/domains/wallet/${address}`;
    console.log(`Using standard API endpoint for ETH address: ${apiUrl}`);
  } else if (isBitcoinAddress) {
    // Bitcoin address format - using the correct endpoint for BTC addresses
    // For Bitcoin, use the same endpoint structure as Ethereum but specify blockchain=BTC
    apiUrl = `https://api-public.d3.app/v1/domains/wallet/${address}?blockchain=BTC`;
    console.log(`Using Bitcoin-specific API endpoint: ${apiUrl}`);
  } else {
    // Default for other address formats
    apiUrl = `https://api-public.d3.app/v1/domains/wallet/${address}?blockchain=${blockchain}`;
    console.log(`Using default API endpoint for address: ${apiUrl}`);
  }
  
  const allDomains = [];
  const seenDomains = new Set();
  
  try {
    console.log(`Making API request to: ${apiUrl}`);
    const response = await fetch(apiUrl);
    console.log('API response status:', response.status);
    
    // When API request fails or times out, provide more helpful error message
    if (!response.ok) {
      console.error(`API request failed with status ${response.status}: ${response.statusText}`);
      // Try a fallback approach
      if (queryAllBlockchains) {
        console.log('API request failed, attempting fallback resolution method');
        return await attemptReverseResolutionFromAllChains(address, blockchain);
      }
      return [];
    }
    
    let data;
    try {
      data = await response.json();
      console.log('API response data:', JSON.stringify(data));
    } catch (error) {
      console.error('Error parsing API response:', error);
      // Try a fallback approach
      if (queryAllBlockchains) {
        console.log('API response parsing failed, attempting fallback resolution method');
        return await attemptReverseResolutionFromAllChains(address, blockchain);
      }
      return [];
    }
    
    // Handle different response formats 
    // Some endpoints might return data.domains, others might have a different structure
    if (data && Array.isArray(data.domains) && data.domains.length > 0) {
      console.log(`Found ${data.domains.length} domains from API for ${address}`);
      
      data.domains.forEach(domain => {
        // Make sure domain has a name property
        if (!domain.name && domain.domainName) {
          domain.name = domain.domainName;
        }
        
        const domainLower = domain.name?.toLowerCase();
        if (!domainLower) {
          console.log('Skipping domain without name:', domain);
          return;
        }
        
        if (!seenDomains.has(domainLower)) {
          seenDomains.add(domainLower);
          allDomains.push({
            name: domain.name,
            blockchain: domain.blockchain || blockchain,
            registrationDate: domain.registeredAt || domain.registrationDate || 'Unknown',
            primaryDomain: domain.primary || domain.isPrimary || false
          });
        }
      });
    } else if (data && data.domain) {
      // Handle single domain response format
      const domainLower = data.domain.toLowerCase();
      if (!seenDomains.has(domainLower)) {
        seenDomains.add(domainLower);
        allDomains.push({
          name: data.domain,
          blockchain: data.blockchain || blockchain,
          registrationDate: data.registeredAt || data.registrationDate || 'Unknown',
          primaryDomain: data.primary || data.isPrimary || false
        });
      }
    } else if (data && data.result && data.result.length > 0) {
      // Alternative response format
      console.log(`Found ${data.result.length} domains in result array for ${address}`);
      
      data.result.forEach(domain => {
        // Handle different data structures
        const domainName = domain.name || domain.domainName || domain.domain;
        if (!domainName) {
          console.log('Skipping domain without name:', domain);
          return;
        }
        
        const domainLower = domainName.toLowerCase();
        if (!seenDomains.has(domainLower)) {
          seenDomains.add(domainLower);
          allDomains.push({
            name: domainName,
            blockchain: domain.blockchain || blockchain,
            registrationDate: domain.registeredAt || domain.registrationDate || 'Unknown',
            primaryDomain: domain.primary || domain.isPrimary || false
          });
        }
      });
    } else {
      console.log(`API returned no domains for wallet ${address}: ${JSON.stringify(data)}`);
    }
  } catch (apiError) {
    console.error('Error fetching domains from API:', apiError);
  }
  
  // After the first API call's catch block but before the reverse resolution fallback
  if (isBitcoinAddress && allDomains.length === 0) {
    console.log(`No domains found for Bitcoin address ${address} via primary API call. Trying alternative endpoints...`);
    
    // Try several different API endpoints for Bitcoin addresses
    const btcApiEndpoints = [
      // Alternative endpoint 1
      `https://api-public.d3.app/v1/wallet/domains?address=${address}&blockchain=BTC`,
      // Alternative endpoint 2 - different path structure
      `https://api-public.d3.app/v1/address/${address}/domains?blockchain=BTC`,
      // Alternative endpoint 3 - no blockchain parameter
      `https://api-public.d3.app/v1/domains/bitcoin/${address}`
    ];
    
    // Try each endpoint in sequence
    for (const altApiUrl of btcApiEndpoints) {
      if (allDomains.length > 0) break; // Stop if we already found domains
      
      try {
        console.log(`Trying Bitcoin API endpoint: ${altApiUrl}`);
        const altResponse = await fetch(altApiUrl);
        console.log(`Response status from ${altApiUrl}: ${altResponse.status}`);
        
        if (altResponse.ok) {
          const altData = await altResponse.json();
          console.log(`Response data from ${altApiUrl}:`, JSON.stringify(altData));
          
          // Process domains from alternative endpoint - handle different response formats
          if (altData) {
            // Format 1: domains array
            if (Array.isArray(altData.domains) && altData.domains.length > 0) {
              console.log(`Found ${altData.domains.length} domains from endpoint ${altApiUrl}`);
              
              altData.domains.forEach(domain => {
                const domainName = domain.name || domain.domainName || domain.domain;
                if (!domainName) return;
                
                const domainLower = domainName.toLowerCase();
                if (!seenDomains.has(domainLower)) {
                  seenDomains.add(domainLower);
                  allDomains.push({
                    name: domainName,
                    blockchain: domain.blockchain || 'BTC',
                    registrationDate: domain.registeredAt || domain.registrationDate || 'Unknown',
                    primaryDomain: domain.primary || domain.isPrimary || false
                  });
                }
              });
            }
            // Format 2: results array
            else if (Array.isArray(altData.results) && altData.results.length > 0) {
              console.log(`Found ${altData.results.length} domains in results from endpoint ${altApiUrl}`);
              
              altData.results.forEach(domain => {
                const domainName = domain.name || domain.domainName || domain.domain;
                if (!domainName) return;
                
                const domainLower = domainName.toLowerCase();
                if (!seenDomains.has(domainLower)) {
                  seenDomains.add(domainLower);
                  allDomains.push({
                    name: domainName,
                    blockchain: domain.blockchain || 'BTC',
                    registrationDate: domain.registeredAt || domain.registrationDate || 'Unknown',
                    primaryDomain: domain.primary || domain.isPrimary || false
                  });
                }
              });
            }
            // Format 3: single domain
            else if (altData.domain) {
              console.log(`Found single domain from endpoint ${altApiUrl}`);
              const domainLower = altData.domain.toLowerCase();
              if (!seenDomains.has(domainLower)) {
                seenDomains.add(domainLower);
                allDomains.push({
                  name: altData.domain,
                  blockchain: altData.blockchain || 'BTC',
                  registrationDate: altData.registeredAt || altData.registrationDate || 'Unknown',
                  primaryDomain: altData.primary || altData.isPrimary || false
                });
              }
            }
          }
        }
      } catch (altApiError) {
        console.error(`Error fetching from Bitcoin API endpoint ${altApiUrl}:`, altApiError);
      }
    }
    
    // Additional logging after trying all endpoints
    if (allDomains.length === 0) {
      console.log(`No domains found for Bitcoin address ${address} via any API calls. Will attempt reverse resolution fallback.`);
      // Additional logging for transparency
      if (queryAllBlockchains) {
        console.log('Will query all blockchains for reverse resolution');
      } else {
        console.log('Only querying BTC blockchain for reverse resolution');
      }
    } else {
      console.log(`Successfully found ${allDomains.length} domains for Bitcoin address ${address} via alternative API endpoints.`);
    }
  }
  
  // If we found domains through either API endpoint, log them
  if (allDomains.length > 0) {
    console.log(`Successfully found ${allDomains.length} domains via API calls for ${address}`);
    console.log('All domains:', JSON.stringify(allDomains));
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
  
  console.log(`Returning ${allDomains.length} total domains for ${address}`);
  return allDomains;
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

// Helper function to format wallet address display
const formatWalletAddressDisplay = (address) => {
  if (!address) return '';
  
  // Ethereum/EVM addresses (0x...)
  if (address.startsWith('0x')) {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
  
  // Bitcoin and other addresses - display appropriate amount
  if (address.length > 20) {
    const start = Math.min(8, Math.floor(address.length / 3));
    const end = Math.min(6, Math.floor(address.length / 3));
    return `${address.substring(0, start)}...${address.substring(address.length - end)}`;
  }
  
  return address;
};

// Add this helper function near the other helpers
const getFormattedBlockchainName = (blockchain) => {
  if (!blockchain) return 'Unknown';
  
  // Map blockchain code to more user-friendly display name
  const blockchainMap = {
    'BTC': 'Bitcoin',
    'ETH': 'Ethereum',
    'CORE': 'Core Chain',
    'BONE': 'Shibarium',
    'APE': 'ApeCoin Chain',
    'VIC': 'Viction Chain',
    'MATIC': 'Polygon'
  };
  
  return blockchainMap[blockchain] || blockchain;
};

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
    
    // We no longer warn about domains being on non-native chains
    // since multi-chain resolution is a valid use case

    console.log(`Resolving ${name} on ${blockchain}`);

    if (reverse) {
      // Reverse resolution: address -> name
      console.log(`Performing reverse resolution for address ${name} on ${blockchain}`);
      
      // For Bitcoin addresses, always set blockchain to BTC regardless of dropdown selection
      let resolveBlockchain = blockchain;
      if ((name.startsWith('bc1') || /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(name))) {
        console.log("Detected Bitcoin address format, setting blockchain to BTC");
        resolveBlockchain = 'BTC';
      }
      
      console.log(`Using blockchain ${resolveBlockchain} for reverse resolution`);
      const res = await d3connect.reverseResolve(name, resolveBlockchain);
      console.log(`Reverse resolution result: ${res}`);
      
      // For wallet addresses, get all domains - now supporting all wallet formats
      if (isWalletAddress(name)) {
        // Get all domains owned by this address from the API
        // When doing a reverse lookup for a wallet, query ALL blockchains
        const allDomains = await fetchDomainsForAddress(name, resolveBlockchain, true); // Query across all blockchains
        
        console.log(`Found ${allDomains.length} domains across all blockchains for address ${name}`);
        console.log('All domains before processing:', JSON.stringify(allDomains));
        
        let formattedDomains = [];
        if (res) {
          // Add the primary domain from reverse resolution
          formattedDomains.push({
            name: res,
            blockchain: resolveBlockchain,
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
              console.log(`Processing domain: ${domain.name}, blockchain: ${domain.blockchain || resolveBlockchain}`);
              return {
                name: domain.name,
                blockchain: domain.blockchain || resolveBlockchain,
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
            blockchain: domain.blockchain || resolveBlockchain,
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
          displayName: formatWalletAddressDisplay(name),
          profileUrl: name.startsWith('0x') 
            ? `https://d3.app/user/${name}` 
            : (isWalletAddress(name) 
                ? `https://d3.app/blockchain/BTC/user/${name}` 
                : `https://d3.app/blockchain/${blockchain}/user/${name}`),
          domainsOwned: formattedDomains || [],
          // Add a note for addresses with no domains
          noDomains: formattedDomains.length === 0
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
      
      // Note: We no longer show warnings about native blockchains since domains can be multi-chain
      setResult(res || 'No address found for this name');
      
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

// Add a new helper function for fallback resolution
const attemptReverseResolutionFromAllChains = async (address, defaultBlockchain) => {
  console.log(`Attempting fallback reverse resolution for ${address} on all chains`);
  const allDomains = [];
  const seenDomains = new Set();
  
  // For Bitcoin addresses, prioritize BTC blockchain
  let isBitcoinAddress = address.startsWith('bc1') || /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address);
  let chainsToTry = [...supportedBlockchains];
  
  if (isBitcoinAddress) {
    // Move BTC to the front of the list
    const btcChainIndex = chainsToTry.findIndex(chain => chain.value === 'BTC');
    if (btcChainIndex >= 0) {
      const btcChain = chainsToTry.splice(btcChainIndex, 1)[0];
      chainsToTry.unshift(btcChain);
    }
  }
  
  for (const chain of chainsToTry) {
    try {
      console.log(`Attempting direct reverse resolution for ${address} on ${chain.value}`);
      
      // Try direct reverseResolve call
      const domain = await d3connect.reverseResolve(address, chain.value);
      
      if (domain) {
        const domainLower = domain.toLowerCase();
        
        if (!seenDomains.has(domainLower)) {
          console.log(`Found domain via direct resolution on ${chain.value}: ${domain}`);
          seenDomains.add(domainLower);
          
          allDomains.push({
            name: domain,
            blockchain: chain.value,
            primary: true  // Mark as primary since it came from reverse resolution
          });
        }
      }
    } catch (error) {
      console.error(`Error during reverse resolution on ${chain.value}:`, error);
    }
  }
  
  console.log(`Fallback method found ${allDomains.length} domains for ${address}`);
  return allDomains;
};

return (
  <div className="app-container">
    <div className="stars-background">
      <div className="retro-grid"></div>
      <div className="nebula"></div>
      <div className="stars"></div>
      <div className="stars2"></div>
      <div className="stars3"></div>
      <div className="stars4"></div>
      <div className="stars5"></div>
      <div className="colorful-stars"></div>
    </div>
    
    <div className="content">
      <header className="app-header">
        <h1 data-text="SPECTRAL EXPLORER">SPECTRAL EXPLORER</h1>
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

            <div className="form-group">
              <label htmlFor="blockchain" className="label">Blockchain</label>
              <div className="blockchain-selector-container">
                <select
                  id="blockchain"
                  value={blockchain}
                  onChange={(e) => setBlockchain(e.target.value)}
                  className="input"
                  disabled={status === 'loading'}
                >
                  {supportedBlockchains.map((chain) => (
                    <option key={chain.value} value={chain.value}>{chain.label}</option>
                  ))}
                </select>
                {!reverse && (
                  <div className="blockchain-info-tooltip">
                    <span className="info-icon">ⓘ</span>
                    <div className="tooltip-content">
                      Domains can resolve to different addresses on each blockchain.
                      Select the blockchain where you want to resolve this domain.
                    </div>
                  </div>
                )}
              </div>
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
                      <li 
                        key={`${domain.name}-${index}`} 
                        className={`domain-item ${domain.primaryDomain ? 'primary-domain' : ''}`}
                      >
                        <div className="domain-name">{domain.name}</div>
                        <div className="domain-details">
                          <div className="domain-blockchain">
                            {getFormattedBlockchainName(domain.blockchain)}
                            {domain.primaryDomain && (
                              <span className="primary-badge">Primary</span>
                            )}
                          </div>
                        </div>
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