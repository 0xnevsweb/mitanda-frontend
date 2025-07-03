'use client';

import type { ReactNode } from 'react';
import { AppOnchainKitProvider } from './OnChainKitProvider';
import { WalletProvider } from './WalletProvider';
import { XMTPProvider } from '@/contexts/XMTPContext';
import { MantineProvider } from '@mantine/core';
import { Toaster } from 'react-hot-toast';

export function Providers(props: { children: ReactNode }) {
    return (
        <AppOnchainKitProvider
        >
            <MantineProvider>
                <WalletProvider>
                    <XMTPProvider>
                        {props.children}
                        <Toaster position="top-center"
                            reverseOrder={false} />
                    </XMTPProvider>
                </WalletProvider>
            </MantineProvider>
        </AppOnchainKitProvider>
    );
}