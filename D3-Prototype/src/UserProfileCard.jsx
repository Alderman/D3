import React from 'react';

function UserProfileCard({ profile }) {
  if (!profile) return null;
  
  console.log('UserProfileCard rendering profile:', profile);
  
  // Check if this is a domain without a connected wallet
  const isUnconnectedDomain = profile.type === 'unconnected';
  
  // Check if this is a wallet address (for profile URL)
  const isWalletAddress = profile.id && profile.id.startsWith('0x');
  
  // Check domains owned
  if (profile.domainsOwned) {
    console.log('UserProfileCard domains owned:', profile.domainsOwned.length);
    console.log('Domain names:', profile.domainsOwned.map(d => d.name).join(', '));
  }
  
  return (
    <div className="user-profile-card">
      <h3>User Profile</h3>
      
      {isUnconnectedDomain ? (
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
              {profile.displayName || (profile.id ? 
                `${profile.id.substring(0, 6)}...${profile.id.substring(profile.id.length - 4)}` : 
                'Unknown User')}
            </h4>
            
            <div className="profile-id">
              <span className="profile-id-label">ID Type:</span>
              <span className="profile-id-value">
                {profile.type === 'wallet' ? 'Wallet' : 'D3 User'}
              </span>
            </div>
            
            {profile.id && (
              <div className="wallet-address">
                <span className="wallet-address-label">Address:</span>
                <span className="wallet-address-value">
                  {profile.id.substring(0, 10)}...{profile.id.substring(profile.id.length - 8)}
                </span>
              </div>
            )}
            
            {/* Always show profile link for wallet addresses */}
            {isWalletAddress && (
              <a 
                href={profile.profileUrl || `https://d3.app/user/${profile.id}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="profile-link"
              >
                View Profile on D3
              </a>
            )}
            
            {/* Show profile link if it exists in the data */}
            {!isWalletAddress && profile.profileUrl && (
              <a 
                href={profile.profileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="profile-link"
              >
                View Profile on D3
              </a>
            )}
          </div>
        </div>
      )}
      
      {/* Display domain info for unconnected domain */}
      {isUnconnectedDomain && (
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
      {!isUnconnectedDomain && profile.domainsOwned && profile.domainsOwned.length > 0 && (
        <div className="profile-domains">
          <h4>Domains Owned ({profile.domainsOwned.length})</h4>
          <ul className="domains-list">
            {profile.domainsOwned.map((domain, index) => {
              console.log(`Rendering domain ${index}: ${domain.name}, blockchain: ${domain.blockchain}`);
              return (
                <li key={index} className={`domain-item ${domain.primaryDomain ? 'primary-domain' : ''}`}>
                  <div className="domain-name">{domain.name}</div>
                  {domain.primaryDomain && <span className="primary-badge">Primary</span>}
                  <div className="domain-details">
                    <span className="domain-blockchain">{domain.blockchain}</span>
                    {domain.registrationDate && (
                      <span className="domain-date">Registered: {domain.registrationDate}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default UserProfileCard;