import {
    ConnectWallet,
    Wallet,
    WalletDropdown,
    WalletDropdownBasename,
    WalletDropdownDisconnect,
} from '@coinbase/onchainkit/wallet';
import {
    Address,
    Avatar,
    Name,
    Identity,
    EthBalance,
} from '@coinbase/onchainkit/identity';
import { color } from '@coinbase/onchainkit/theme';
import { useAccount, useSignMessage } from 'wagmi';
import { useEffect } from 'react';
import { useXMTP } from '@/contexts/XMTPContext';
import { createEOASigner } from '@/helpers/createSigner';

export function AppConnectWallet() {
    const { isConnected, address } = useAccount();
    const { client, initialize, disconnect } = useXMTP();
    const { signMessageAsync } = useSignMessage();

    // create client if wallet is connected
    useEffect(() => {
        if (!isConnected || !address) {
            return;
        }
        void initialize({
            dbEncryptionKey: undefined,
            env: 'production',
            signer: createEOASigner(address, (message: string) =>
                signMessageAsync({ message }),
            ),
        });
    }, [address, isConnected, signMessageAsync]);

    useEffect(() => {
        if (client && !isConnected) {
            disconnect();
        }
    }, [isConnected, address])

    return (
        <div className="flex justify-end">
            <Wallet>
                <ConnectWallet className={`${isConnected ? 'bg-white border border-gray-200 hover:bg-blue-50 text-gray-700' : 'bg-blue-600 hover:bg-blue-500 rounded-md'} py-2.5 shadow-none rounded-full text-sm`}>
                    <Avatar className="h-6 w-6 text-gray-700" />
                    <Name className='text-gray-700' />
                </ConnectWallet>
                <WalletDropdown className='z-50'>
                    <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                        <Avatar />
                        <Name />
                        <Address className={color.foregroundMuted} />
                        <EthBalance />
                    </Identity>
                    <WalletDropdownBasename />
                    <WalletDropdownDisconnect />
                </WalletDropdown>
            </Wallet>
        </div>
    );
}