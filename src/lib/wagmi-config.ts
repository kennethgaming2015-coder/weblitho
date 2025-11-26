import { createConfig, http } from 'wagmi';
import { defineChain } from 'viem';
import { walletConnect, injected } from '@wagmi/connectors';

// Define Qubetics chain (ID 9030)
export const qubetics = defineChain({
  id: 9030,
  name: 'Qubetics',
  network: 'qubetics',
  nativeCurrency: {
    decimals: 18,
    name: 'Qubetics',
    symbol: 'TICS',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.qubetics.com'],
    },
    public: {
      http: ['https://rpc.qubetics.com'],
    },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.qubetics.com' },
  },
});

export const config = createConfig({
  chains: [qubetics],
  connectors: [
    walletConnect({
      projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // User needs to add this
      metadata: {
        name: 'QubeAI Contract Interaction',
        description: 'Interact with smart contracts on Qubetics',
        url: 'https://qubeai.app',
        icons: ['https://qubeai.app/icon.png'],
      },
    }),
    injected(),
  ],
  transports: {
    [qubetics.id]: http(),
  },
});
