import React from 'react';
import { isWalletAddress } from './App';

// Helper function to format wallet address display
const formatWalletAddress = (address) => {
  if (!address) return '';
  
  // Ethereum/EVM addresses (0x...)
  if (address.startsWith('0x')) {
    return `${address.substring(0, 10)}...${address.substring(address.length - 8)}`;
  }
  
  // Bitcoin and other addresses - display appropriate amount
  if (address.length > 20) {
    const start = Math.min(10, Math.floor(address.length / 3));
    const end = Math.min(8, Math.floor(address.length / 3));
    return `${address.substring(0, start)}...${address.substring(address.length - end)}`;
  }
  
  return address;
};

// Add a helper function to detect specific Bitcoin address types
const getBitcoinAddressType = (address) => {
  if (!address) return null;
  
  // SegWit (Bech32) addresses start with bc1
  if (address.startsWith('bc1')) {
    return 'Bitcoin Wallet (SegWit)';
  }
  
  // Legacy (P2PKH) addresses start with 1
  if (/^1[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)) {
    return 'Bitcoin Wallet (Legacy)';
  }
  
  // Script (P2SH) addresses start with 3
  if (/^3[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)) {
    return 'Bitcoin Wallet (Script)';
  }
  
  return null;
};

// Add the getFormattedBlockchainName helper function
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

function UserProfileCard({ profile }) {
  if (!profile) return null;
  
  console.log('UserProfileCard rendering profile:', profile);
  
  // Check if there's a primary domain
  const primaryDomain = profile.domainsOwned?.find(domain => domain.primaryDomain || domain.primary);
  
  // Log more information about domains for debugging
  console.log('UserProfileCard domains owned:', profile.domainsOwned?.length || 0);
  if (profile.domainsOwned?.length > 0) {
    const domainNames = profile.domainsOwned.map(d => d.name).join(', ');
    console.log('Domain names:', domainNames);
    
    // Log if we found a primary domain
    if (primaryDomain) {
      console.log('Primary domain found:', primaryDomain.name);
    } else {
      console.log('No primary domain found in domains owned');
    }
  } else {
    console.log('Domain names: none');
  }
  
  // Check for different Bitcoin address formats
  const isBitcoinAddress = profile.id?.startsWith('bc1') || /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(profile.id || '');
  
  if (isBitcoinAddress) {
    console.log('Detected Bitcoin address in profile card, using BTC-specific link format');
  }
  
  // Handle the case where the wallet might be on a blockchain but we don't have a primary domain
  const walletType = getBitcoinAddressType(profile.id) || (profile.id?.startsWith('0x') ? 'Ethereum' : 'Unknown');
  
  return (
    <div className="user-profile-card">
      <h3>User Profile</h3>
      
      {profile.type === 'unconnected' ? (
        <div className="unconnected-notice">
          <div className="unconnected-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
            </svg>
          </div>
          <div className="unconnected-message">
            <h4>Unconnected Domain</h4>
            <p>This domain is registered but the owner hasn't connected a wallet address yet.</p>
            <p>Domain ownership information is limited.</p>
            {profile.note && (
              <p className="unconnected-note">{profile.note}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="profile-header">
          <div className="profile-avatar">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.displayName || profile.id} />
            ) : (
              <div className="avatar-placeholder">
                {(profile.displayName || profile.id || '?').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          <div className="profile-info">
            <h4 className="profile-name">
              {primaryDomain ? primaryDomain.name : profile.displayName}
            </h4>
            
            <div className="profile-id">
              <span className="id-label">
                {profile.type === 'wallet' ? 
                  (walletType !== 'Unknown' ? `${walletType} Wallet` : 'Wallet') 
                  : 'ID'}:
              </span>
              <span className="id-value">{formatWalletAddress(profile.id)}</span>
            </div>
            
            {profile.id && isWalletAddress(profile.id) && (
              <a 
                href={isBitcoinAddress 
                  ? `https://d3.app/blockchain/BTC/user/${profile.id}`
                  : (profile.id.startsWith('0x')
                    ? `https://d3.app/user/${profile.id}`
                    : profile.profileUrl)
                } 
                target="_blank" 
                rel="noopener noreferrer"
                className="profile-link"
              >
                View Profile
              </a>
            )}
          </div>
        </div>
      )}
      
      {/* Display domain info for unconnected domain */}
      {profile.type === 'unconnected' && (
        <div className="domain-info">
          <h4>Domain Information</h4>
          <div className="domain-item">
            <div className="domain-name">{profile.domainName}</div>
            <div className="domain-details">
              <span className="domain-blockchain">{profile.blockchain}</span>
              {profile.registrationDate && (
                <span className="domain-date">Registered: {profile.registrationDate}</span>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Display domains owned by this wallet/user if available */}
      {profile.type !== 'unconnected' && profile.domainsOwned && profile.domainsOwned.length > 0 && (
        <div className="profile-domains">
          <h4>Domains Owned</h4>
          <ul className="domains-list">
            {profile.domainsOwned.map((domain, index) => (
              <li 
                key={index} 
                className={`domain-item ${domain.primaryDomain || domain.primary ? 'primary-domain' : ''}`}
              >
                {domain.primaryDomain || domain.primary && (
                  <span className="primary-badge">Primary</span>
                )}
                
                <div className="domain-name">
                  <a 
                    href={`https://d3.app/domain/${domain.name}`} 
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {domain.name}
                  </a>
                </div>
                
                <div className="domain-details">
                  <span className="domain-blockchain">
                    {getFormattedBlockchainName(domain.blockchain)}
                  </span>
                  {domain.registrationDate && (
                    <span className="domain-date">
                      Registered: {new Date(domain.registrationDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Display message when no domains are found for a wallet */}
      {profile.type !== 'unconnected' && (!profile.domainsOwned || profile.domainsOwned.length === 0) && (
        <div className="profile-domains no-domains">
          <h4>Domains Owned</h4>
          <p className="no-domains-message">
            No domains found for this {getBitcoinAddressType(profile.id) || "wallet"} address. 
            {profile.id && profile.id.startsWith('bc1') && (
              <span className="btc-note">
                Note: BTC addresses must first register a domain on D3.app to establish a primary domain.
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

export default UserProfileCard;