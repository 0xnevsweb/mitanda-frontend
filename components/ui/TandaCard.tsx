import Link from 'next/link';
import { useContractRead } from 'wagmi';
import TandaABI from '@/config/abis/TandaABI.json';
import { StateConfig, TandaState } from '@/types';
import Image from 'next/image';
import { ImageIcon } from 'lucide-react';

export default function TandaCard(
  {
    title,
    logo,
    tandaAddress,
    contributionAmount,
    payoutInterval,
    chatRoomId,
    members
  }:
    {
      title: string,
      logo: string,
      tandaAddress: string,
      contributionAmount: number,
      payoutInterval: number,
      chatRoomId: string | null,
      members: number
    }
) {
  // Then get the summary from the specific Tanda contract
  const { data: tandaSummary, isLoading, isError }: any = useContractRead({
    address: tandaAddress as `0x${string}`,
    abi: TandaABI,
    functionName: 'getTandaSummary',
    chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 84532
  });

  const [
    currentState = TandaState.OPEN,
    currentCycle = BigInt(0),
    participantsCount = BigInt(0),
    totalFunds = BigInt(0),
    nextPayoutTimestamp = BigInt(0)
  ] = tandaSummary || [];


  const formatUSDC = (value: bigint) => (Number(value) / 1e6).toFixed(0);
  const formatDate = (timestamp: bigint) => {
    if (timestamp === BigInt(0)) return 'Not started';
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  const stateConfig: StateConfig = {
    [TandaState.OPEN]: { color: 'bg-blue-100 text-blue-800', label: 'Open' },
    [TandaState.ACTIVE]: { color: 'bg-green-100 text-green-800', label: 'Active' },
    [TandaState.COMPLETED]: { color: 'bg-purple-100 text-purple-800', label: 'Completed' }
  };

  if (isLoading) return (
    <>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center">
          <div className="h-6 bg-gray-200 rounded w-6 animate-pulse"></div>
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center">
          <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="h-3 bg-gray-200 rounded w-12 animate-pulse"></div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="h-3 bg-gray-200 rounded w-12 animate-pulse"></div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="h-3 bg-gray-200 rounded w-12 animate-pulse"></div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="h-3 bg-gray-200 rounded w-12 animate-pulse"></div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
      </td>
    </>
  );

  if (isError) return (
    <>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center">
          <span className="text-sm font-medium text-gray-700">{title}</span>
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-red-500 text-sm" colSpan={9}>
        Error loading data
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <button className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded-md hover:bg-red-200 transition-colors">
          Retry
        </button>
      </td>
    </>
  );

  return (
    <>
      <td className="px-4">
        <div className="flex gap-1 items-center">
          {
            logo ? <Image src={logo} width={36} height={36} className='rounded-md' alt='logo' /> : <ImageIcon size={36} />
          }

        </div>
      </td>

      {/* Tanda ID & Info */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex gap-1 items-center">
          <div className="text-sm text-gray-700 truncate font-semibold">
            {title}
          </div>
        </div>
      </td>

      {/* Address */}
      <td className="px-4 py-3 whitespace-nowrap">
        <Link
          href={`${process.env.NEXT_PUBLIC_EXPLORER}/address/${tandaAddress}`}
          target='_blank'
          className='text-xs text-gray-600 hover:text-blue-600 font-mono bg-gray-100 px-2 py-1 rounded'
        >
          {tandaAddress.slice(0, 6)}...{tandaAddress.slice(-4)}
        </Link>
      </td>

      {/* Status */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={`${stateConfig[currentState as TandaState].color} text-xs font-medium px-2 py-1 rounded-full`}>
          {stateConfig[currentState as TandaState].label}
        </span>
      </td>

      {/* Contribution */}
      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-700">
        {contributionAmount} USDC
      </td>

      {/* Interval */}
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
        {payoutInterval}d
      </td>

      {/* Cycle Progress */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center space-x-2">
          <div className="w-12 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((Number(currentCycle) / Number(members)) * 100, 100)}%` }}
            ></div>
          </div>
          <span className="text-sm font-medium text-gray-700">
            {currentCycle.toString()}/{Number(members)}
          </span>
        </div>
      </td>

      {/* Participants */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center space-x-2">
          <div className="w-12 bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(Number(participantsCount) / Number(members)) * 100}%` }}
            ></div>
          </div>
          <span className="text-sm font-medium text-gray-700">
            {participantsCount.toString()}/{Number(members)}
          </span>
        </div>
      </td>

      {/* Total Funds */}
      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-700">
        {formatUSDC(totalFunds)} USDC
      </td>

      {/* Next Payout */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="text-sm text-gray-700 font-medium">
          {formatDate(nextPayoutTimestamp)}
        </span>
      </td>

      {/* Action */}
      <td className="px-4 py-3 whitespace-nowrap flex items-center gap-2">
        <Link
          href={`/tandas/${tandaAddress}`}
          className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${currentState === TandaState.OPEN
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : currentState === TandaState.ACTIVE
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
        >
          {currentState === TandaState.OPEN ? 'Join' : 'View'}
        </Link>
        <Link
          href={`/chat/${chatRoomId}`}
          className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${currentState === TandaState.OPEN
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : currentState === TandaState.ACTIVE
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
        >
          Chat
        </Link>
      </td>
    </>
  );
}