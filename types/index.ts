export enum TandaState {
  OPEN = 0,
  ACTIVE = 1,
  COMPLETED = 2
}

export type TailwindColorClass = `bg-${string}-100 text-${string}-800`;

export type StateConfig = {
  [key in TandaState]: {
    color: TailwindColorClass;
    label: 'Open' | 'Active' | 'Completed';
  };
};

export interface Participant {
  addr: string;
  hasPaid: boolean;
  paidUntilCycle: bigint;
  isActive: boolean;
  payoutOrder: bigint;
  joinTimestamp: bigint;
}

export interface TandaSummary {
  state: number;
  currentCycle: bigint;
  participantsCount: bigint;
  totalFunds: bigint;
  nextPayoutTimestamp: bigint;
}

export interface CycleInfo {
  cycleNumber: bigint;
  payoutAddress: string;
  payoutAmount: bigint;
}

export interface TandaEvent {
  type: string;
  participant?: string;
  amount?: bigint;
  cycle?: bigint;
  timestamp: number;
  txHash?: string;
}

export interface PayoutTimeStatus {
  canTrigger: boolean;
  currentTimeStemp: bigint;
  startTimestamp: bigint;
  targetTime: bigint;
}

export interface CountdownResult {
  timeString: string;
  status: 'pending' | 'due' | 'past-due';
}

export type TandaFormValues = {
  title: string;
  description: string;
  contributionAmount: number;
  payoutInterval: number;
  participantCount: number;
  logo?: string;
};

export type TandaData = {
  id: string;
  contractAddress: string;
  creatorAddress: string;
  title: string;
  description: string | null;
  logoUrl: string | null;
  contributionAmount: number;
  payoutInterval: number;
  participantCount: number;
  chatRoomId: string | null;
  participants: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type PaginatedTandas = {
  data: TandaData[];
  total: number;
  page: number;
  totalPages: number;
};