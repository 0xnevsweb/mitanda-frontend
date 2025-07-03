'use client';

import type { ReactNode } from 'react';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'wagmi/chains';

export function AppOnchainKitProvider(props: { children: ReactNode }) {
    return (
        <OnchainKitProvider
            apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
            chain={base}
            config={{
                appearance: {
                    name: 'MiTanda',
                    logo: 'https://app.mitanda.org/assets/logo.jpeg',
                    mode: 'light',
                    theme: 'default',
                },
                wallet: {
                    display: 'modal',
                    supportedWallets: {
                        rabby: true,
                        trust: true,
                        frame: true,
                    },
                },
            }}
        >
            {props.children}
        </OnchainKitProvider>
    );
}