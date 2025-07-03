import { ReactNode } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { coinbaseWallet } from 'wagmi/connectors';

const wagmiConfig = createConfig({
    chains: [base],
    connectors: [
        coinbaseWallet({
            appName: 'onchainkit',
        }),
    ],
    ssr: true,
    transports: {
        [base.id]: http()
    },
});

export function WalletProvider({ children }: { children: ReactNode }) {
    return <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>;
}