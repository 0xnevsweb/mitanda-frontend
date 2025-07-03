'use client'

import React from 'react';
import {
    MessageCircle,
    X,
} from 'lucide-react';
import { AppConnectWallet } from '@/components/ui/ConnectWallet';
import { useXMTP } from '@/contexts/XMTPContext';
import { useAccount } from 'wagmi';
import { ConversationsNavbar } from '@/components/partials/ConversationsNavbar';

const XMTPChatApp = ({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) => {
    const { client, initializing, error } = useXMTP();
    const { isConnected } = useAccount();

    // Render connection screen when wallet is not connected
    if (!isConnected) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-68px)]">
                <div className="text-center max-w-lg">
                    <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <MessageCircle size={48} className="text-blue-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-4">XMTP Chat</h1>
                    <p className="text-gray-600 mb-6">
                        Connect your wallet to start messaging on the decentralized web
                    </p>
                    <div className='flex justify-center'>
                        <AppConnectWallet />
                    </div>
                </div>
            </div>
        );
    }

    // Render loading state for XMTP initialization
    if (initializing) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-68px)] bg-gray-50">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Initializing XMTP</h2>
                    <p className="text-gray-600">Setting up secure messaging...</p>
                </div>
            </div>
        );
    }

    // Render error state
    if (error || !client) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-68px)]">
                <div className="text-center max-w-lg">
                    <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <X size={48} className="text-red-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-4">Connection Error</h1>
                    <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4">
                        {error?.message}
                    </div>
                    <p className="text-gray-600 mb-6">
                        Please try refreshing the page or reconnecting your wallet.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-68px)] bg-white">
            {/* Sidebar */}
            <ConversationsNavbar />

            {/* Main Chat Area */}
            {children}

        </div>
    );
};

export default XMTPChatApp;