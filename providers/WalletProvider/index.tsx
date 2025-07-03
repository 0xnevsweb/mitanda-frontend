import { ReactNode } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { coinbaseWallet } from 'wagmi/connectors';

const wagmiConfig = createConfig({
    chains: [base, baseSepolia],
    connectors: [
        coinbaseWallet({
            appName: 'onchainkit',
        }),
    ],
    ssr: true,
    transports: {
        [base.id]: http(),
        [baseSepolia.id]: http()
    },
});

export function WalletProvider({ children }: { children: ReactNode }) {
    return <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>;
}