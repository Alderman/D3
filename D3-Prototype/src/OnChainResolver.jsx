import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

function OnChainResolver({ name, blockchain }) {
  const [onChainData, setOnChainData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [needsNetworkAdd, setNeedsNetworkAdd] = useState(false);
  const [shouldResolve, setShouldResolve] = useState(false);

  // Map of resolver addresses by blockchain
  const resolverAddresses = {
    BONE: '0xD60D40674E678F0089736D6381071973a75B4B6f', // Shibarium Mainnet
    CORE: '0xe242864ADA335285fAe70Fd752d03AAA1421dC75', // Core Mainnet
    APE: '0xeA54b0E40E956383C95e28cb407FF35235Aa31fE', // ApeChain Mainnet
    // Add more as needed
  };

  // Network configurations for different blockchains
  const networkConfigs = {
    CORE: {
      chainId: '0x45c', // 1116 in hex
      chainName: 'Core Blockchain',
      nativeCurrency: {
        name: 'CORE',
        symbol: 'CORE',
        decimals: 18
      },
      rpcUrls: ['https://rpc.coredao.org'],
      blockExplorerUrls: ['https://scan.coredao.org']
    },
    BONE: {
      chainId: '0x6d', // 109 in hex
      chainName: 'Shibarium',
      nativeCurrency: {
        name: 'BONE',
        symbol: 'BONE',
        decimals: 18
      },
      rpcUrls: ['https://www.shibrpc.com'],
      blockExplorerUrls: ['https://www.shibariumscan.io']
    },
    APE: {
      chainId: '0x8173', // 4462 in hex
      chainName: 'ApeChain',
      nativeCurrency: {
        name: 'APE',
        symbol: 'APE',
        decimals: 18
      },
      rpcUrls: ['https://rpc.apechain.com	'],
      blockExplorerUrls: ['https://apescan.io']
    }
  };

  // ABI for the resolver contract based on documentation
  const resolverABI = [
    'function resolve(string name, string network) public view returns (address)',
    'function reverseResolve(address addr, string network) public view returns (string)'
  ];

  // Helper function to validate input before attempting resolution
  const isValidInput = (input) => {
    if (!input) return false;
    // For domain names, ensure they have at least one dot
    if (!input.startsWith('0x') && !input.includes('.')) return false;
    // For wallet addresses, ensure they are at least 40 chars (with 0x prefix)
    if (input.startsWith('0x') && input.length < 42) return false;
    return true;
  };

  // Function to add a network to MetaMask
  const addNetwork = async () => {
    if (!window.ethereum) {
      setError("MetaMask not detected");
      return;
    }

    setLoading(true);
    
    try {
      const config = networkConfigs[blockchain];
      if (!config) {
        setError(`No network configuration available for ${blockchain}`);
        return;
      }

      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: config.chainId,
            chainName: config.chainName,
            nativeCurrency: config.nativeCurrency,
            rpcUrls: config.rpcUrls,
            blockExplorerUrls: config.blockExplorerUrls
          }
        ]
      });

      // Reset state and retry resolution
      setNeedsNetworkAdd(false);
      setError(null);
      fetchOnChainData();
    } catch (addError) {
      console.error('Error adding network:', addError);
      setError(`Failed to add network: ${addError.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchOnChainData = async () => {
    if (!name || !blockchain) return;
    
    // Check if we have a resolver for this blockchain
    const resolverAddress = resolverAddresses[blockchain];
    if (!resolverAddress) {
      setError(`No on-chain resolver available for ${blockchain}`);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Check if window.ethereum exists
      if (!window.ethereum) {
        setError("MetaMask or compatible wallet not detected");
        setLoading(false);
        return;
      }

      // Connect to the blockchain
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      try {
        // Request account access
        await provider.send("eth_requestAccounts", []);
        
        // Get the current network
        const network = await provider.getNetwork();
        const currentChainId = `0x${network.chainId.toString(16)}`;
        const targetChainId = networkConfigs[blockchain]?.chainId;
        
        if (targetChainId && currentChainId !== targetChainId) {
          try {
            // Try to switch to the correct network
            await window.ethereum.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: targetChainId }]
            });
            
            // Re-initialize provider after network switch
            const updatedProvider = new ethers.BrowserProvider(window.ethereum);
            const signer = await updatedProvider.getSigner();
            
            // Create contract instance
            const resolverContract = new ethers.Contract(
              resolverAddress, 
              resolverABI, 
              signer
            );
            
            // Call the resolve function with CCIP Read enabled
            const resolvedAddress = await resolverContract.resolve(
              name,
              blockchain,
              { enableCcipRead: true }
            );
            
            // Get additional data
            const blockchainData = {
              resolvedAddress,
              contractAddress: resolverAddress,
              method: 'CCIP Read',
              timestamp: new Date().toISOString(),
              network: blockchain,
              chainId: targetChainId || 'Unknown'
            };
            
            setOnChainData(blockchainData);
          } catch (switchError) {
            console.error('Network switch error:', switchError);
            
            // Handle specific error for unrecognized chain
            if (switchError.code === 4902) {
              setNeedsNetworkAdd(true);
              setError(`Network ${blockchain} needs to be added to your wallet`);
            } else {
              setError(`Please switch to ${blockchain} network manually: ${switchError.message}`);
            }
          }
        } else {
          // We're already on the correct network
          const signer = await provider.getSigner();
          
          // Create contract instance
          const resolverContract = new ethers.Contract(
            resolverAddress, 
            resolverABI, 
            signer
          );
          
          // Call the resolve function with CCIP Read enabled
          const resolvedAddress = await resolverContract.resolve(
            name,
            blockchain,
            { enableCcipRead: true }
          );
          
          // Get additional data
          const blockchainData = {
            resolvedAddress,
            contractAddress: resolverAddress,
            method: 'CCIP Read',
            timestamp: new Date().toISOString(),
            network: blockchain,
            chainId: targetChainId || currentChainId
          };
          
          setOnChainData(blockchainData);
        }
      } catch (contractError) {
        console.error('Contract error:', contractError);
        setError(`Error calling resolver contract: ${contractError.message}`);
      }
    } catch (err) {
      console.error('On-chain resolution error:', err);
      setError(`Error in on-chain resolution: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only run when we have valid input and the component mounts or inputs change
    const validInput = isValidInput(name);
    
    if (validInput) {
      setShouldResolve(true);
    } else {
      // Clear any previous results for invalid inputs
      setOnChainData(null);
      setError(null);
      setNeedsNetworkAdd(false);
      setShouldResolve(false);
    }
  }, [name, blockchain]);

  // Add a separate effect that actually performs the resolution when shouldResolve is true
  useEffect(() => {
    if (shouldResolve) {
      setNeedsNetworkAdd(false);
      setError(null);
      setOnChainData(null);
      fetchOnChainData();
    }
  }, [shouldResolve]);

  if (loading) {
    return <div className="on-chain-status">Loading on-chain data...</div>;
  }

  if (needsNetworkAdd) {
    return (
      <div className="on-chain-status on-chain-error">
        <p>Network {blockchain} needs to be added to your wallet</p>
        <button 
          className="network-add-button"
          onClick={addNetwork}
        >
          Add {blockchain} Network to MetaMask
        </button>
      </div>
    );
  }

  if (error) {
    return <div className="on-chain-status on-chain-error">{error}</div>;
  }

  if (!onChainData) {
    return <div className="on-chain-status">No on-chain data available</div>;
  }

  return (
    <div className="on-chain-data">
      <h3>On-Chain Resolution Data</h3>
      <div className="on-chain-grid">
        <div className="on-chain-item">
          <span className="on-chain-label">Resolved Address:</span>
          <span className="on-chain-value">{onChainData.resolvedAddress}</span>
        </div>
        <div className="on-chain-item">
          <span className="on-chain-label">Resolver Contract:</span>
          <span className="on-chain-value">{onChainData.contractAddress}</span>
        </div>
        <div className="on-chain-item">
          <span className="on-chain-label">Network:</span>
          <span className="on-chain-value">{onChainData.network} (Chain ID: {onChainData.chainId})</span>
        </div>
        <div className="on-chain-item">
          <span className="on-chain-label">Resolution Method:</span>
          <span className="on-chain-value">{onChainData.method}</span>
        </div>
        <div className="on-chain-item">
          <span className="on-chain-label">Timestamp:</span>
          <span className="on-chain-value">
            {new Date(onChainData.timestamp).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

export default OnChainResolver;