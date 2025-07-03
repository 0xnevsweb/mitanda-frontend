'use client';

import type { ReactNode } from 'react';
import { AppOnchainKitProvider } from './OnChainKitProvider';
import { WalletProvider } from './WalletProvider';
import { XMTPProvider } from '@/contexts/XMTPContext';
import { MantineProvider } from '@mantine/core';
import { Toaster } from 'react-hot-toast';
import { TandasProvider } from '@/contexts/TandaContext';

export function Providers(props: { children: ReactNode }) {
    return (
        <AppOnchainKitProvider
        >
            <MantineProvider>
                <WalletProvider>
                    <XMTPProvider>
                        <TandasProvider>
                            {props.children}
                        </TandasProvider>
                        <Toaster position="top-center"
                            reverseOrder={false} />
                    </XMTPProvider>
                </WalletProvider>
            </MantineProvider>
        </AppOnchainKitProvider>
    );
}