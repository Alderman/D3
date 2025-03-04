# D3 Name Resolution Explorer

A cross-blockchain domain resolution explorer for the D3.app ecosystem, allowing users to look up domains across multiple blockchains including CORE, BONE/Shibarium, APE, VIC, ETH, MATIC, and BTC.

**Live Demo:** [https://alderman.github.io/D3/](https://alderman.github.io/D3/)

![D3 Name Resolution Explorer Screenshot](screenshot.png)

## Features

- **Domain Resolution**: Forward lookup to resolve domain names to wallet addresses
- **Reverse Resolution**: Find domains owned by a specific wallet address (supports both Ethereum and Bitcoin addresses)
- **Multi-Blockchain Support**: Seamlessly works across CORE, BONE/Shibarium, APE, VIC, ETH, MATIC, and BTC blockchains
- **Wallet Address Detection**: Automatically detects and properly formats different wallet address types (ETH, BTC SegWit, BTC Legacy)
- **Resolution Analytics**: Track and analyze resolution queries and performance
- **Query History**: View and rerun previous resolution requests
- **User Profile Display**: View comprehensive domain ownership information
- **Enhanced Error Handling**: Clear messages when no domains are found for an address

## How to Use

1. **Forward Resolution**
   - Enter a domain name (e.g., `example.core`, `example.shib`)
   - Select the blockchain network from the dropdown
   - Click "Resolve" to find the associated wallet address

2. **Reverse Resolution**
   - Enter a wallet address (e.g., `0x1234...` for Ethereum or `bc1...` for Bitcoin)
   - Toggle on "Reverse Resolution"
   - Click "Resolve" to find all domains owned by this wallet
   - For Bitcoin addresses, it shows wallet type (SegWit or Legacy)

3. **View Results**
   - The application displays detailed resolution results including domain ownership
   - For wallet addresses, all domains owned by the wallet are displayed
   - Domain registration information and blockchain details are shown when available
   - Primary domains are clearly labeled for quick identification

## Multi-Chain Resolution Explained

The D3 Name Resolution Explorer supports multi-chain resolution, allowing a single domain name to resolve to different wallet addresses across various blockchains:

- **One Domain, Multiple Blockchains**: A domain like `example.core` can be mapped to different wallet addresses for BTC, ETH, Solana, etc.
- **How It Works**: When you select a specific blockchain in the dropdown, the application resolves the domain to the appropriate wallet address for that blockchain.
- **Use Case**: This allows users to share a single human-readable domain name that can route payments to the correct blockchain address based on which network the transaction is happening on.

For domain owners, you can map multiple wallet addresses to your domain through the [D3.app](https://d3.app) interface:

1. Navigate to "My Assets" on D3.app
2. Select your domain and click "Manage Name"
3. Go to "Settings" and find "Crypto Wallet Addresses"
4. Click "Edit Addresses" to add/modify wallet addresses for different blockchains
5. (Optional) Set your domain as "Primary" to replace your wallet address in supported dApps

This multi-chain resolution capability enables true cross-chain functionality, allowing one domain to serve as a universal identifier across the Web3 ecosystem.

## Bitcoin Address Support

This application now fully supports Bitcoin addresses in several formats:

- **SegWit Addresses**: Starting with `bc1` (bech32 format)
- **Legacy Addresses**: Starting with `1` (P2PKH format)
- **Script Addresses**: Starting with `3` (P2SH format)

The application will:
1. Automatically detect the Bitcoin address format
2. Display the appropriate wallet type in the profile view
3. Use the correct API endpoints for reverse resolution
4. Show a helpful message when no domains are found for the address

Note that Bitcoin addresses must have a domain registered on D3.app before they'll show up in reverse resolution lookups.

## Technologies Used

- React 17
- Vite
- Ethers.js
- D3 Name Resolution API
- GitHub Pages for deployment

## Local Development

To set up the project locally:

```bash
# Clone the repository
git clone https://github.com/Alderman/D3.git

# Navigate to the project directory
cd D3

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the application in your browser.

## Deployment

The application is deployed using GitHub Pages. To deploy updates:

```bash
# Build and deploy the application
npm run deploy
```

## Recent Updates

- Added full support for Bitcoin addresses in forward and reverse resolution
- Improved error handling and display when no domains are found
- Enhanced wallet address type detection and display
- Fixed API endpoint issues for various blockchain address formats
- Made UI improvements to better display primary domains
- Added proper links to domain management on D3.app

## License

[MIT License](LICENSE)

## Acknowledgments

- [D3.app](https://d3.app) for the domain resolution infrastructure
- React and Vite communities for the development tools 