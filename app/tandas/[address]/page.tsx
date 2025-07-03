'use client'

import Link from 'next/link';
import { useAccount, useContractRead } from 'wagmi';
import { useCallback, useMemo } from 'react';
import { bigIntToNumber, bigIntToString, formatDate, formatUSDC, secondsToDays } from '@/utils';
import { CycleInfo, Participant, TandaSummary } from '@/types';
import { Transaction, TransactionButton, TransactionStatus, TransactionStatusLabel, TransactionStatusAction } from '@coinbase/onchainkit/transaction';
import CountdownTimer from '@/components/ui/CountDownTimer';
import TandaABI from '@/config/abis/TandaABI.json';
import ERC20ABI from '@/config/abis/Erc20ABI.json';

export default function TandaDetail({ params }: { params: { address: string } }) {
  const { address } = params;
  const { address: userAddress } = useAccount();

  // Fetch Tanda summary
  const { data: tandaSummaryData }: any = useContractRead({
    address: address as `0x${string}`,
    abi: TandaABI,
    functionName: 'getTandaSummary',
    chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 84532,
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
    chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 84532
  }) as { data: Participant[] };

  // Fetch current cycle info
  const { data: cycleInfoData }: any = useContractRead({
    address: address as `0x${string}`,
    abi: TandaABI,
    functionName: 'getCurrentCycleInfo',
    chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 84532
  });

  const cycleInfo: CycleInfo | undefined = cycleInfoData ? {
    cycleNumber: cycleInfoData[0],
    payoutAddress: cycleInfoData[1],
    payoutAmount: cycleInfoData[2],
  } : undefined;

  // Fetch contribution amount (USDC has 6 decimals)
  const { data: contributionAmount } = useContractRead({
    address: address as `0x${string}`,
    abi: TandaABI,
    functionName: 'contributionAmount',
    chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 84532
  }) as { data: bigint };

  // Fetch payout interval
  const { data: payoutInterval } = useContractRead({
    address: address as `0x${string}`,
    abi: TandaABI,
    functionName: 'payoutInterval',
    chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 84532
  }) as { data: bigint };

  // Fetch grace period
  const { data: gracePeriod } = useContractRead({
    address: address as `0x${string}`,
    abi: TandaABI,
    functionName: 'gracePeriod',
    chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 84532
  }) as { data: bigint };

  // Fetch payout order if assigned
  const { data: payoutOrder } = useContractRead({
    address: address as `0x${string}`,
    abi: TandaABI,
    functionName: 'getPayoutOrder',
    chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 84532
  }) as { data: bigint[] };

  // Check if user is participant
  const { data: isParticipant } = useContractRead({
    address: address as `0x${string}`,
    abi: TandaABI,
    functionName: 'isParticipant',
    args: [userAddress],
    chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 84532
  }) as { data: boolean };

  // Check if user is in good standing
  const { data: isInGoodStanding } = useContractRead({
    address: address as `0x${string}`,
    abi: TandaABI,
    functionName: 'isParticipantInGoodStanding',
    args: [userAddress],
    chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 84532
  }) as { data: boolean };

  // Check if user is the current payout recipient
  const isCurrentRecipient = cycleInfo?.payoutAddress?.toLowerCase() === userAddress?.toLowerCase();

  // Check if payout can be triggered
  const canTriggerPayout = tandaSummary?.state === 1;

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
        args: [address, contributionAmount],
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
  }, [participants]);

  const cyclesToPayRemaining = useCallback(() => {
    return tandaSummary && myCurrentStatus ? tandaSummary?.participantsCount - myCurrentStatus?.paidUntilCycle : 1;
  }, [myCurrentStatus, tandaSummary]);

  // Make payment transaction
  const makePaymentCallsAllRemaining = useCallback(() => {
    const cyclesToPayRemaining = tandaSummary && myCurrentStatus ? tandaSummary?.participantsCount - myCurrentStatus?.paidUntilCycle : 1
    return [
      {
        abi: ERC20ABI,
        address: process.env.NEXT_PUBLIC_USDC_ADDRESS,
        functionName: 'approve',
        args: [address, contributionAmount * BigInt(cyclesToPayRemaining)],
      },
      {
        abi: TandaABI,
        address: address,
        functionName: 'makePayment',
        args: [BigInt(cyclesToPayRemaining)],
      }];
  }, [address, contributionAmount, tandaSummary, myCurrentStatus]);

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
          <p className="mt-4 text-lg">Loading Tanda details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-8">
      <Link href="/" className='p-2 px-3 text-gray-600 hover:bg-gray-200 duration-150' >{`< Back`}</Link>

      {/* Header Section */}
      <div className="border border-gray-200 p-6 mb-6 mt-3">
        <div className='flex justify-between'>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Tanda
            <Link
              href={`${process.env.NEXT_PUBLIC_Explorer}/address/${address}`}
              target='_blank'
              className='bg-gray-100 px-2 ml-1 text-sm rounded-full font-normal hover:underline hover:text-blue-700 cursor-pointer text-gray-500'
            >
              {address.slice(0, 4)}...{address.slice(-4)}
            </Link>
          </h1>

          <p className="text-sm bg-gray-100 h-fit px-3 py-0.5 font-medium text-gray-800">
            {
              tandaSummary.nextPayoutTimestamp && <><CountdownTimer timestamp={tandaSummary.nextPayoutTimestamp} />
                <span className="text-sm text-gray-500 ml-2">
                  ({formatDate(tandaSummary.nextPayoutTimestamp)})
                </span></>
            }

          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${tandaSummary.state === 0 ? 'bg-blue-100 text-blue-800' :
            tandaSummary.state === 1 ? 'bg-green-100 text-green-800' :
              'bg-purple-100 text-purple-800'
            }`}>
            {getStateString(tandaSummary.state)}
          </span>
          {tandaSummary.state === 1 && isParticipant && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${isInGoodStanding ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
              {isInGoodStanding ? 'In Good Standing' : Number(cyclesToPayRemaining()) > 0? 'Payment Needed': 'Fully Paid'}
            </span>
          )}
        </div>

        {/* Action Buttons Section */}
        <div className="flex flex-wrap gap-2">
          {/* Join Button */}
          {tandaSummary.state === 0 && !isParticipant && userAddress && (
            <Transaction calls={joinTandaCalls as any} chainId={Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 84532} >
              <TransactionButton text="Join Tanda" className='bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm' />
              <TransactionStatus>
                <TransactionStatusLabel />
                <TransactionStatusAction />
              </TransactionStatus>
            </Transaction>
          )}

          {/* Make Payment Button */}
          {tandaSummary.state === 1 && isParticipant && userAddress && Number(cyclesToPayRemaining()) > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Transaction calls={() => makePaymentCalls(1) as any} chainId={Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 84532}>
                <TransactionButton text={`Pay 1 Cycle (${formatUSDC(contributionAmount)} USDC)`} className='bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm' />
                <TransactionStatus>
                  <TransactionStatusLabel />
                  <TransactionStatusAction />
                </TransactionStatus>
              </Transaction>
              <Transaction calls={() => makePaymentCallsAllRemaining() as any} chainId={Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 84532}>
                <TransactionButton text={`Pay All Remaining (${formatUSDC(contributionAmount * BigInt(cyclesToPayRemaining()))} USDC)`} className='bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm' />
                <TransactionStatus>
                  <TransactionStatusLabel />
                  <TransactionStatusAction />
                </TransactionStatus>
              </Transaction>
            </div>
          )}

          {/* Trigger Payout Button */}
          {tandaSummary.state === 1 && canTriggerPayout && isParticipant && userAddress && (
            <Transaction calls={triggerPayoutCalls as any} chainId={Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 84532}>
              <TransactionButton
                text={
                  isCurrentRecipient
                    ? `You can claim your payout starting ${formatDate(tandaSummary.nextPayoutTimestamp)}.`
                    : `You can trigger the payout for ${cycleInfo?.payoutAddress.slice(0, 6)}...${cycleInfo?.payoutAddress.slice(-4)} starting ${formatDate(tandaSummary.nextPayoutTimestamp)}.`
                }
                className={`${isCurrentRecipient ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-orange-600 hover:bg-orange-700'} text-white px-4 py-2 rounded-md text-sm`}
              />
              <TransactionStatus>
                <TransactionStatusLabel />
                <TransactionStatusAction />
              </TransactionStatus>
            </Transaction>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-3">
          <div className="bg-gray-50 border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-500">Contribution Amount</h3>
            <p className="text-2xl font-semibold text-gray-800">
              {formatUSDC(contributionAmount)} USDC
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-500">Current Cycle</h3>
            <p className="text-2xl font-semibold text-gray-800">
              {bigIntToString(tandaSummary.currentCycle)} of {bigIntToString(tandaSummary.participantsCount)}
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-500">Total Funds</h3>
            <p className="text-2xl font-semibold text-gray-800">
              {formatUSDC(tandaSummary.totalFunds)} USDC
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-500">Participant</h3>
            <p className="text-2xl font-semibold text-gray-800">
              {participants.length} / {tandaSummary.participantsCount.toString()}
            </p>
          </div>
        </div>
      </div>

      {/* Cycle Information */}
      <div className="border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Cycle Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Next Payout</h3>
            <p className="text-lg font-medium text-gray-800">
              {formatDate(tandaSummary.nextPayoutTimestamp)}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Current Payout Recipient</h3>
            <p className="text-lg font-medium text-gray-800">
              {cycleInfo?.payoutAddress ?
                <Link
                  href={`${process.env.NEXT_PUBLIC_EXPLORER}/address/${cycleInfo.payoutAddress}`}
                  target='_blank'
                >
                  {cycleInfo.payoutAddress.slice(0, 6)}...{cycleInfo.payoutAddress.slice(-4)}
                </Link> :
                'Not assigned yet'}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Payout Interval</h3>
            <p className="text-lg font-medium text-gray-800">
              {secondsToDays(payoutInterval)} days
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Grace Period</h3>
            <p className="text-lg font-medium text-gray-800">
              {secondsToDays(gracePeriod)} days
            </p>
          </div>
        </div>
      </div>

      {/* Participants Section */}
      <div className="border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Participants ({bigIntToString(tandaSummary.participantsCount)})</h2>
          {payoutOrder && (
            <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded">
              Payout Order Assigned
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid Until</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payout Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {participants.map((participant, index) => (
                <tr key={index} className={participant.addr === userAddress ? 'bg-blue-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">
                        <Link
                          href={`${process.env.NEXT_PUBLIC_EXPLORER}/address/${participant.addr}`}
                          target='_blank'
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
                    {payoutOrder ? `#${bigIntToNumber(participant.payoutOrder) + 1}` : '--'}
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

      {/* Payout Schedule */}
      {payoutOrder && tandaSummary.state === 1 && (
        <div className="p-6 mb-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Payout Schedule</h2>
          <div className="space-y-2">
            {payoutOrder.map((participantIndex, cycleIndex) => (
              <div
                key={cycleIndex}
                className={`p-4 rounded-lg border ${cycleIndex + 1 < bigIntToNumber(tandaSummary.currentCycle) ? 'bg-gray-50 border-gray-200' :
                  cycleIndex + 1 === bigIntToNumber(tandaSummary.currentCycle) ? 'bg-blue-50 border-blue-200' :
                    'bg-white border-gray-200'
                  }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-gray-800">
                      Cycle {cycleIndex + 1}{' '}
                      {cycleIndex + 1 < bigIntToNumber(tandaSummary.currentCycle) && (
                        <span className="text-green-600 text-sm">(Completed)</span>
                      )}
                      {cycleIndex + 1 === bigIntToNumber(tandaSummary.currentCycle) && (
                        <span className="text-blue-600 text-sm">(Current)</span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Payout: {contributionAmount && participants ?
                        formatUSDC(contributionAmount * BigInt(participants.length)) :
                        '--'} USDC
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-800">
                      <Link
                        href={`${process.env.NEXT_PUBLIC_EXPLORER}/address/${participants[bigIntToNumber(participantIndex)]?.addr}`}
                        target='_blank'
                      >
                        {participants[bigIntToNumber(participantIndex)]?.addr.slice(0, 6)}...{participants[bigIntToNumber(participantIndex)]?.addr.slice(-4)}
                      </Link>
                    </p>
                    <p className="text-sm text-gray-500">
                      {tandaSummary.nextPayoutTimestamp && (cycleIndex + 1) === bigIntToNumber(tandaSummary.currentCycle) ?
                        `Due: ${formatDate(tandaSummary.nextPayoutTimestamp)}` :
                        (cycleIndex + 1) < bigIntToNumber(tandaSummary.currentCycle) ? 'Paid out' : 'Upcoming'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}