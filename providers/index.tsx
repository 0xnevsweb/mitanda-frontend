'use client';

import type { ReactNode } from 'react';
import { AppOnchainKitProvider } from './OnChainKitProvider';
import { WalletProvider } from './WalletProvider';
import { XMTPProvider } from '@/contexts/XMTPContext';
import { MantineProvider } from '@mantine/core';

export function Providers(props: { children: ReactNode }) {
    return (
        <AppOnchainKitProvider
        >
            <MantineProvider>
                <WalletProvider>
                    <XMTPProvider>
                        {props.children}
                    </XMTPProvider>
                </WalletProvider>
            </MantineProvider>
        </AppOnchainKitProvider>
    );
}