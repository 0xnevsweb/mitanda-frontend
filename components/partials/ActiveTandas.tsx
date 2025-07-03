'use client'

import TandaCard from '@/components/ui/TandaCard';
import { useEffect, useState, useMemo } from 'react';
import { TandaData } from '@/types';
import { useAccount } from 'wagmi';
import { debounce } from 'lodash';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import Loader from '../ui/Loader';
import IsError from '../ui/IsError';
import NoTandas from '../ui/NoTandas';
import { TabType, useTandas } from '@/contexts/TandaContext';

const TabsAndSearch = ({ tandas, setFilteredTandas, filterTandasByTab }: { tandas: TandaData[], setFilteredTandas: (tas: TandaData[]) => void, filterTandasByTab: (tas: TabType) => void }) => {
  const { isConnected } = useAccount();
  const [searchQuery, setSearchQuery] = useState('');
  const { activeTab, setActiveTab } = useTandas();

  // Debounced search
  const debouncedSearch = useMemo(
    () =>
      debounce((query: string) => {
        if (!query) {
          setFilteredTandas(tandas);
          return;
        }
        const lowerCaseQuery = query.toLowerCase();
        const filtered = tandas.filter(
          (tanda) =>
            tanda.title.toLowerCase().includes(lowerCaseQuery) ||
            tanda.contractAddress.toLowerCase().includes(lowerCaseQuery)
        );
        setFilteredTandas(filtered);
      }, 300),
    [tandas]
  );

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  // Cleanup debounce
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  return <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
    <div className="flex space-x-2 overflow-x-auto pb-2 md:pb-0">
      <button
        onClick={() => {
          setActiveTab('all');
          filterTandasByTab('all');
        }}
        className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'all' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
      >
        All Tandas
      </button>
      {isConnected && (
        <>
          <button
            onClick={() => {
              setActiveTab('joined');
              filterTandasByTab('joined');
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'joined' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            Joined Tandas
          </button>
          <button
            onClick={() => {
              setActiveTab('created');
              filterTandasByTab('created');
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'created' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            Created Tandas
          </button>
        </>
      )}
    </div>

    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="text-gray-400" />
      </div>
      <input
        type="text"
        placeholder="Search tandas..."
        value={searchQuery}
        onChange={handleSearchChange}
        className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
      />
    </div>
  </div>
}

export default function ActiveTandas() {
  const { tandas, isError, isLoading, filteredTandas, lastUpdateDate, filterTandasByTab, setFilteredTandas } = useTandas();
  const [sortConfig, setSortConfig] = useState<{ key: keyof TandaData; direction: 'asc' | 'desc' } | null>(null);

  // Handle sorting
  const requestSort = (key: keyof TandaData) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    if (key) {
      const sortedTandas = [...filteredTandas].sort((a, b) => {
        if (a[key] && b[key]) {
          if (a[key] < b[key]) {
            return direction === 'asc' ? -1 : 1;
          }
          if (a[key] > b[key]) {
            return direction === 'asc' ? 1 : -1;
          }
        }
        return 0;
      });
      setFilteredTandas(sortedTandas);
    }
  };

  // Get sort icon
  const getSortIcon = (key: keyof TandaData) => {
    return <div className='flex flex-col'>
      <ChevronUp className={`ml-1 ${sortConfig?.direction === 'asc' && sortConfig?.key == key && 'text-gray-700'}`} size={12} />
      <ChevronDown className={`ml-1 ${sortConfig?.direction === 'asc' && sortConfig?.key == key && 'text-gray-700'}`} size={12} />
    </div>
  };

  const renderContent = useMemo(() => {
    if (isError) {
      return <IsError />;
    }

    if (isLoading) {
      return <Loader />
    }

    if (!filteredTandas && !isLoading) {
      return <NoTandas />;
    }

    return filteredTandas.map((tanda, index) => (
      <tr
        key={tanda.id}
        className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
      >
        <TandaCard
          title={tanda.title}
          logo={tanda.logoUrl || ''}
          tandaAddress={tanda.contractAddress}
          contributionAmount={tanda.contributionAmount}
          payoutInterval={tanda.payoutInterval}
          chatRoomId={tanda.chatRoomId}
          members={tanda.participantCount}
        />
      </tr>
    ))

  }, [isError, isLoading, tandas, filteredTandas])

  return (
    <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
      {/* Tabs and Search */}
      <TabsAndSearch tandas={tandas} setFilteredTandas={setFilteredTandas} filterTandasByTab={filterTandasByTab} />

      {/* Table Container - Responsive */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              >
                <div className="flex items-center">
                  Logo
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('title')}
              >
                <div className="flex items-center">
                  Title
                  {getSortIcon('title')}
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              >
                <div className="flex items-center">
                  Contract
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              >
                <div className="flex items-center">
                  Status
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hidden md:table-cell"
                onClick={() => requestSort('contributionAmount')}
              >
                <div className="flex items-center">
                  Contribution
                  {getSortIcon('contributionAmount')}
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hidden lg:table-cell"
                onClick={() => requestSort('payoutInterval')}
              >
                <div className="flex items-center">
                  Interval
                  {getSortIcon('payoutInterval')}
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hidden lg:table-cell"
                onClick={() => requestSort('participantCount')}
              >
                <div className="flex items-center">
                  Members
                  {getSortIcon('participantCount')}
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hidden lg:table-cell"
              >
                <div className="flex items-center">
                  Cycle
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hidden lg:table-cell"
              >
                <div className="flex items-center">
                  Total Funds
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hidden lg:table-cell"
              >
                <div className="flex items-center">
                  Payout
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>

            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {renderContent}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{filteredTandas.length}</span> tandas
          </p>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">Last updated: {lastUpdateDate}</span>
          </div>
        </div>
      </div>
    </div>
  );
}