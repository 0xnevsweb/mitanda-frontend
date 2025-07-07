'use client'

import Link from 'next/link';
import { useAccount, useContractRead } from 'wagmi';
import { useCallback, useMemo, useEffect, useState } from 'react';
import { FaDiscord, FaTelegram, FaTwitter, FaWhatsapp } from 'react-icons/fa';
import { bigIntToString, formatDate, formatUSDC, secondsToDays } from '@/utils';
import { Participant, TandaSummary } from '@/types';
import { Transaction, TransactionButton, TransactionStatus, TransactionStatusLabel, TransactionStatusAction } from '@coinbase/onchainkit/transaction';
import CountdownTimer from '@/components/ui/CountDownTimer';
import TandaABI from '@/config/abis/TandaABI.json';
import ERC20ABI from '@/config/abis/Erc20ABI.json';
import { TandaData } from '@/types';
import { getTandaByAddress } from '@/utils/supabase/tandas';

export default function TandaDetail({ params }: { params: { address: string } }) {
  const { address } = params;
  const { address: userAddress } = useAccount();
  const [tandaMetadata, setTandaMetadata] = useState<TandaData | null>(null);

  // Fetch Tanda metadata from DB
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const data = await getTandaByAddress(address);
        setTandaMetadata(data);
      } catch (error) {
        console.error('Failed to fetch tanda metadata:', error);
      } finally {
      }
    };

    fetchMetadata();
  }, [address]);

  // Fetch Tanda summary
  const { data: tandaSummaryData }: any = useContractRead({
    address: address as `0x${string}`,
    abi: TandaABI,
    functionName: 'getTandaSummary',
    chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 8453,
  });

  const tandaSummary: TandaSummary | undefined = tandaSummaryData ? {
    state: tandaSummaryData[0],
    currentCycle: tandaSummaryData[1],
    participantsCount: tandaSummaryData[2],
    totalFunds: tandaSummaryData[3],
    nextPayoutTimestamp: tandaSummaryData[4]
  } : undefined;

  // Fetch participants
  const { data: participants } = useContractRead({
    address: address as `0x${string}`,
    abi: TandaABI,
    functionName: 'getAllParticipants',
    chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 8453
  }) as { data: Participant[], isLoading: boolean };

  // Fetch current cycle info
  const { data: currentCycleWinner }: any = useContractRead({
    address: address as `0x${string}`,
    abi: TandaABI,
    functionName: 'getCurrentPayoutRecipient',
    chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 8453
  });

  // Fetch contribution amount (USDC has 6 decimals)
  const { data: contributionAmount } = useContractRead({
    address: address as `0x${string}`,
    abi: TandaABI,
    functionName: 'contributionAmount',
    chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 8453
  }) as { data: bigint };

  // Fetch payout interval
  const { data: payoutInterval } = useContractRead({
    address: address as `0x${string}`,
    abi: TandaABI,
    functionName: 'payoutInterval',
    chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 8453
  }) as { data: bigint };

  // Check if payout order is assigned
  const { data: payoutOrderAssigned } = useContractRead({
    address: address as `0x${string}`,
    abi: TandaABI,
    functionName: 'payoutOrderAssigned',
    chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 8453
  }) as { data: boolean };

  // Check if user is participant
  const { data: isParticipant } = useContractRead({
    address: address as `0x${string}`,
    abi: TandaABI,
    functionName: 'isParticipant',
    args: [userAddress],
    chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 8453
  }) as { data: boolean };

  // Check if user is in good standing
  const { data: isInGoodStanding } = useContractRead({
    address: address as `0x${string}`,
    abi: TandaABI,
    functionName: 'isParticipantInGoodStanding',
    args: [userAddress],
    chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 8453
  }) as { data: boolean };

  // Check if user is the current payout recipient
  const isCurrentRecipient = useMemo(() => {
    if (!currentCycleWinner || !userAddress) return false;
    return currentCycleWinner?.toLowerCase() === userAddress?.toLowerCase()
  }, [userAddress, currentCycleWinner]);

  // Check if payout can be triggered
  const canTriggerPayout = tandaSummary?.state === 1;

  // Loading state
  const isUserWhiteListed = useMemo(() => {
    if (address && tandaMetadata) {
      const find = tandaMetadata.participants.find((p) => p === userAddress);
      return find ? true : false;
    }
    return false;
  }, [userAddress, tandaMetadata])

  // Get Tanda state as string
  const getStateString = (state?: number) => {
    switch (state) {
      case 0: return 'Open for Participants';
      case 1: return 'Active';
      case 2: return 'Completed';
      default: return 'Unknown';
    }
  };

  // Get participant status
  const getParticipantStatus = (participant: Participant) => {
    if (!participant.isActive) return 'Removed';
    if (participant.hasPaid && participant.paidUntilCycle > (tandaSummary?.currentCycle || BigInt(0))) {
      return 'In Good Standing';
    }
    if (participant.hasPaid) return 'Paid';
    return 'Pending Payment';
  };

  // Join Tanda transaction
  const joinTandaCalls = useCallback(() => {
    return [
      {
        abi: ERC20ABI,
        address: process.env.NEXT_PUBLIC_USDC_ADDRESS,
        functionName: 'approve',
        args: [address, contributionAmount],
      },
      {
        abi: TandaABI,
        address: address,
        functionName: 'join',
        args: []
      }];
  }, [address, contributionAmount]);

  // Make payment transaction
  const makePaymentCalls = useCallback((cyclesToPay: number) => {
    return [
      {
        abi: ERC20ABI,
        address: process.env.NEXT_PUBLIC_USDC_ADDRESS,
        functionName: 'approve',
        args: [address, contributionAmount * BigInt(cyclesToPay)],
      },
      {
        abi: TandaABI,
        address: address,
        functionName: 'makePayment',
        args: [BigInt(cyclesToPay)],
      }];
  }, [address, contributionAmount]);

  const myCurrentStatus = useMemo(() => {
    return participants ? participants.find(p => p.addr === userAddress) : {} as Participant;
  }, [participants, userAddress]);

  const cyclesToPayRemaining = useCallback(() => {
    return tandaSummary && myCurrentStatus ? tandaSummary?.participantsCount - myCurrentStatus?.paidUntilCycle : 1;
  }, [myCurrentStatus, tandaSummary]);

  // Trigger payout transaction
  const triggerPayoutCalls = useCallback(() => {
    return [{
      abi: TandaABI,
      address: address,
      functionName: 'triggerPayout',
      args: []
    }];
  }, [address]);

  if (!tandaSummary || !participants) {
    return (
      <div className="max-w-screen-2xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading Tanda details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-8 text-gray-600">
      <Link href="/" className='inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 duration-150'>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
        Back to Tandas
      </Link>

      {/* Header Section */}
      <div className="border border-gray-200 rounded-lg p-6 mb-6 mt-4">
        <div className='flex flex-col md:flex-row justify-between gap-4'>
          <div>
            <div className="flex sm:flex-row flex-col items-center gap-3 mb-2">
              <div className='flex gap-2 items-center'>
                {tandaMetadata?.logoUrl && (
                  <img src={tandaMetadata.logoUrl} alt="Tanda logo" className="w-10 h-10 rounded-full object-cover" />
                )}
                <h1 className="text-2xl font-bold text-gray-800">
                  {tandaMetadata?.title || 'Tanda'}
                  <Link
                    href={`${process.env.NEXT_PUBLIC_EXPLORER}/address/${address}`}
                    target='_blank'
                    className='ml-2 text-sm font-normal text-gray-500 hover:text-blue-600 hover:underline'
                  >
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </Link>
                </h1></div>


              <div className='flex gap-1 items-center'>
                {
                  tandaMetadata?.twitter && <Link
                    href={`${tandaMetadata?.twitter}`}
                    target='_blank'
                    className='w-7 h-7 bg-gray-50 border border-gray-200 rounded-full flex justify-center items-center hover:border-blue-500 hover:text-blue-500'
                  >
                    <FaTwitter size={12} />
                  </Link>
                }

                {
                  tandaMetadata?.discord && <Link
                    href={`${tandaMetadata?.discord}`}
                    target='_blank'
                    className='w-7 h-7 bg-gray-50 border border-gray-200 rounded-full flex justify-center items-center hover:border-blue-500 hover:text-blue-500'
                  >
                    <FaDiscord size={12} />
                  </Link>
                }

                {
                  tandaMetadata?.telegram && <Link
                    href={`${tandaMetadata?.telegram}`}
                    target='_blank'
                    className='w-7 h-7 bg-gray-50 border border-gray-200 rounded-full flex justify-center items-center hover:border-blue-500 hover:text-blue-500'
                  >
                    <FaTelegram size={12} />
                  </Link>
                }

                {
                  tandaMetadata?.whatsapp && <Link
                    href={`${tandaMetadata?.whatsapp}`}
                    target='_blank'
                    className='w-7 h-7 bg-gray-50 border border-gray-200 rounded-full flex justify-center items-center hover:border-blue-500 hover:text-blue-500'
                  >
                    <FaWhatsapp size={12} />
                  </Link>
                }

              </div>
            </div>

            {tandaMetadata?.description && (
              <p className="text-gray-600 mb-4">{tandaMetadata.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${tandaSummary.state === 0 ? 'bg-blue-100 text-blue-800' :
                tandaSummary.state === 1 ? 'bg-green-100 text-green-800' :
                  'bg-purple-100 text-purple-800'
                }`}>
                {getStateString(tandaSummary.state)}
              </span>
              {tandaSummary.state === 1 && isParticipant && (
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${isInGoodStanding ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                  {isInGoodStanding ? 'In Good Standing' : Number(cyclesToPayRemaining()) > 0 ? 'Payment Needed' : 'Fully Paid'}
                </span>
              )}
            </div>
          </div>

          {tandaSummary.nextPayoutTimestamp && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 min-w-fit h-fit">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-500">Next Payout</p>
                  <div className="flex items-center">
                    <CountdownTimer timestamp={tandaSummary.nextPayoutTimestamp} />
                    <span className="text-sm text-gray-500 ml-2">
                      ({formatDate(tandaSummary.nextPayoutTimestamp)})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons Section */}
        <div className="mt-6">
          {/* Join Button */}
          {tandaSummary.state === 0 && !isParticipant && userAddress && isUserWhiteListed && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Join this Tanda</h3>
              <p className="text-sm text-blue-700 mb-3">Contribute {formatUSDC(contributionAmount)} USDC to participate</p>
              <Transaction calls={joinTandaCalls as any} chainId={Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 8453}>
                <TransactionButton text="Join Tanda" className='bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium' />
                <TransactionStatus>
                  <TransactionStatusLabel />
                  <TransactionStatusAction />
                </TransactionStatus>
              </Transaction>
            </div>
          )}

          {/* Make Payment Button */}
          {tandaSummary.state === 1 && isParticipant && userAddress && isUserWhiteListed && Number(cyclesToPayRemaining()) > 0 && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">Payment Required</h3>
              <p className="text-sm text-yellow-700 mb-3">
                You need to pay for {cyclesToPayRemaining()} more cycle(s) to stay in good standing
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Transaction calls={() => makePaymentCalls(1) as any} chainId={Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 8453}>
                  <TransactionButton
                    text={`Pay 1 Cycle (${formatUSDC(contributionAmount)} USDC)`}
                    className='bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium w-full'
                  />
                  <TransactionStatus>
                    <TransactionStatusLabel />
                    <TransactionStatusAction />
                  </TransactionStatus>
                </Transaction>
                <Transaction calls={() => makePaymentCalls(Number(cyclesToPayRemaining())) as any} chainId={Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 8453}>
                  <TransactionButton
                    text={`Pay All (${formatUSDC(contributionAmount * BigInt(cyclesToPayRemaining()))} USDC)`}
                    className='bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium w-full'
                  />
                  <TransactionStatus>
                    <TransactionStatusLabel />
                    <TransactionStatusAction />
                  </TransactionStatus>
                </Transaction>
              </div>
            </div>
          )}

          {/* Trigger Payout Button */}
          {tandaSummary.state === 1 && canTriggerPayout && isParticipant && userAddress && (
            <div className={`${isCurrentRecipient ? 'bg-yellow-50 border-yellow-100' : 'bg-orange-50 border-orange-100'} border rounded-lg p-4 mt-2`}>
              <h3 className="text-sm font-medium mb-2">
                {isCurrentRecipient ? 'Claim Your Payout' : 'Trigger Payout'}
              </h3>
              <p className="text-sm mb-3">
                {isCurrentRecipient
                  ? `You can claim your payout of ${formatUSDC(contributionAmount * BigInt(participants.length))} USDC starting ${formatDate(tandaSummary.nextPayoutTimestamp)}.`
                  : `You can trigger the payout for ${currentCycleWinner ? `${currentCycleWinner?.toString().slice(0, 6)}...${currentCycleWinner?.toString().slice(-4)}` : '...'} starting ${formatDate(tandaSummary.nextPayoutTimestamp)}.`}
              </p>
              <Transaction calls={triggerPayoutCalls as any} chainId={Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 8453}>
                <TransactionButton
                  text={isCurrentRecipient ? 'Claim Payout' : 'Trigger Payout'}
                  className={`${isCurrentRecipient ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-orange-600 hover:bg-orange-700'} text-white px-4 py-2 rounded-md text-sm font-medium`}
                />
                <TransactionStatus>
                  <TransactionStatusLabel />
                  <TransactionStatusAction />
                </TransactionStatus>
              </Transaction>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500">Contribution</h3>
            <p className="text-2xl font-semibold text-gray-800">
              {formatUSDC(contributionAmount)} USDC
            </p>
            <p className="text-xs text-gray-500 mt-1">per cycle</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500">Current Cycle</h3>
            <p className="text-2xl font-semibold text-gray-800">
              {bigIntToString(tandaSummary.currentCycle)} of {tandaMetadata?.participantCount}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {payoutOrderAssigned ? 'Order assigned' : 'Order pending'}
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500">Total Funds</h3>
            <p className="text-2xl font-semibold text-gray-800">
              {formatUSDC(tandaSummary.totalFunds)} USDC
            </p>
            <p className="text-xs text-gray-500 mt-1">in contract</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500">Participants</h3>
            <p className="text-2xl font-semibold text-gray-800">
              {participants.length} / {tandaMetadata?.participantCount}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {tandaSummary.state === 0 ? 'needed to start' : 'joined'}
            </p>
          </div>
        </div>
      </div>

      {/* Cycle Information */}
      <div className="border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Cycle Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">Next Payout</h3>
            <p className="text-lg font-medium text-gray-800">
              {tandaSummary.nextPayoutTimestamp ? formatDate(tandaSummary.nextPayoutTimestamp) : 'Not started'}
            </p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">Current Recipient</h3>
            <p className="text-lg font-medium text-gray-800">
              {currentCycleWinner ?
                <Link
                  href={`${process.env.NEXT_PUBLIC_EXPLORER}/address/${currentCycleWinner}`}
                  target='_blank'
                  className="hover:underline hover:text-blue-600"
                >
                  {currentCycleWinner?.toString().slice(0, 6)}...{currentCycleWinner?.toString().slice(-4)}
                </Link> :
                'Not assigned yet'}
            </p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">Payout Interval</h3>
            <p className="text-lg font-medium text-gray-800">
              {secondsToDays(payoutInterval)} days
            </p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">Creator</h3>
            <p className="text-lg font-medium text-gray-800">
              {tandaMetadata?.creatorAddress ?
                <Link
                  href={`${process.env.NEXT_PUBLIC_EXPLORER}/address/${tandaMetadata.creatorAddress}`}
                  target='_blank'
                  className="hover:underline hover:text-blue-600"
                >
                  {tandaMetadata.creatorAddress.slice(0, 6)}...{tandaMetadata.creatorAddress.slice(-4)}
                </Link> :
                'Unknown'}
            </p>
          </div>
        </div>
      </div>

      {/* Participants Section */}
      <div className="border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Participants ({participants.length} of {tandaMetadata?.participantCount})
          </h2>
          {payoutOrderAssigned && (
            <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm font-medium rounded-full">
              Payout Order Assigned
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid Until</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {participants?.map((participant, index) => (
                <tr key={index} className={participant.addr === userAddress ? 'bg-blue-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">
                        <Link
                          href={`${process.env.NEXT_PUBLIC_EXPLORER}/address/${participant.addr}`}
                          target='_blank'
                          className="hover:underline hover:text-blue-600"
                        >
                          {participant.addr.slice(0, 6)}...{participant.addr.slice(-4)}
                        </Link>
                      </div>
                      {participant.addr === userAddress && (
                        <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          You
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getParticipantStatus(participant) === 'In Good Standing' ? 'bg-green-100 text-green-800' :
                      getParticipantStatus(participant) === 'Paid' ? 'bg-blue-100 text-blue-800' :
                        getParticipantStatus(participant) === 'Removed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                      }`}>
                      {getParticipantStatus(participant)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Cycle {bigIntToString(participant.paidUntilCycle)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(participant.joinTimestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}