'use client'

import { AppConnectWallet } from '@/components/ui/ConnectWallet';
import { MessageCircle } from 'lucide-react';
import Link from 'next/link';

export default function Header() {
    return (
        <nav className="border border-gray-200 bg-gray-50 h-[64px]">
            <div className="px-4 flex justify-between items-center h-full">
                <Link href={'/'} className="text-xl font-bold text-blue-600 hidden sm:inline-block">MiTanda</Link>
                <div className='inline-block sm:hidden'></div>
                <div className='flex gap-2 items-center'>
                    <Link href={'/chat/home'} className='bg-white p-2 rounded-full border border-gray-200'>
                        <MessageCircle color='#525252' size={14} />
                    </Link>
                    <AppConnectWallet />
                </div>
            </div>
        </nav>
    );
}