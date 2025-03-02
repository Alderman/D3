# D3 Name Resolution Explorer

A cross-blockchain domain resolution explorer for the D3.app ecosystem, allowing users to look up domains across multiple blockchains including CORE, BONE/Shibarium, APE, VIC, ETH, and MATIC.

**Live Demo:** [https://alderman.github.io/D3/](https://alderman.github.io/D3/)

![D3 Name Resolution Explorer Screenshot](screenshot.png)

## Features

- **Domain Resolution**: Forward lookup to resolve domain names to wallet addresses
- **Reverse Resolution**: Find domains owned by a specific wallet address
- **Multi-Blockchain Support**: Seamlessly works across CORE, BONE/Shibarium, APE, VIC, ETH, and MATIC blockchains
- **Resolution Analytics**: Track and analyze resolution queries and performance
- **Query History**: View and rerun previous resolution requests
- **User Profile Display**: View comprehensive domain ownership information

## How to Use

1. **Forward Resolution**
   - Enter a domain name (e.g., `example.core`, `example.shib`)
   - Select the blockchain network from the dropdown
   - Click "Resolve" to find the associated wallet address

2. **Reverse Resolution**
   - Enter a wallet address (e.g., `0x1234...`)
   - Toggle on "Reverse Resolution"
   - Click "Resolve" to find all domains owned by this wallet

3. **View Results**
   - The application displays detailed resolution results including domain ownership
   - For wallet addresses, all domains owned by the wallet are displayed
   - Domain registration information and blockchain details are shown when available

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

## License

[MIT License](LICENSE)

## Acknowledgments

- [D3.app](https://d3.app) for the domain resolution infrastructure
- React and Vite communities for the development tools 