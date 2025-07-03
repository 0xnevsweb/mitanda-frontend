'use client'

import { getAllActiveTandas, getTandasByCreator, getTandasByParticipant } from '@/utils/supabase/tandas';
import { useEffect, useState } from 'react';
import { TandaData } from '@/types';
import { useAccount } from 'wagmi';

type TabType = 'all' | 'joined' | 'created';

export default function useTandas() {
  const { address } = useAccount();
  const [tandas, setTandas] = useState<TandaData[]>([]);
  const [filteredTandas, setFilteredTandas] = useState<TandaData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [lastUpdateDate, setLastUpdatedDate] = useState<string>();

  // Fetch all tandas once and cache them
  const getTandas = async () => {
    try {
      setIsLoading(true);
      const allTandas = await getAllActiveTandas();
      setTandas(allTandas);
      setFilteredTandas(allTandas);
      setIsLoading(false);
    } catch (error) {
      setIsError(true);
      setIsLoading(false);
    } finally {
      setLastUpdatedDate(new Date().toLocaleTimeString())
    }
  };

  // Filter tandas based on active tab
  const filterTandasByTab = async (tab: TabType) => {
    if (!address) return;

    setIsLoading(true);
    try {
      let filtered: TandaData[] = [];
      if (tab === 'all') {
        filtered = tandas;
      } else if (tab === 'created') {
        const createdTandas = await getTandasByCreator(address);
        filtered = createdTandas;
      } else if (tab === 'joined') {
        const joinedTandas = await getTandasByParticipant(address);
        filtered = joinedTandas;
      }
      setFilteredTandas(filtered);
      setIsLoading(false);
    } catch (error) {
      setIsError(true);
      setIsLoading(false);
    } finally {
      setLastUpdatedDate(new Date().toLocaleTimeString())
    }
  };

  // Initial fetch
  useEffect(() => {
    getTandas();
  }, []);

  return {
    tandas,
    filteredTandas,
    isLoading,
    isError,
    filterTandasByTab,
    setFilteredTandas,
    lastUpdateDate
  }

}