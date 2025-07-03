'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAllActiveTandas, getTandasByCreator, getTandasByParticipant } from '@/utils/supabase/tandas';
import { TandaData } from '@/types';
import { useAccount } from 'wagmi';

type TabType = 'all' | 'joined' | 'created';

interface TandasContextType {
    activeTab: TabType;
    tandas: TandaData[];
    filteredTandas: TandaData[];
    isLoading: boolean;
    isError: boolean;
    filterTandasByTab: (tab: TabType) => Promise<void>;
    setFilteredTandas: React.Dispatch<React.SetStateAction<TandaData[]>>;
    getTandas: () => Promise<void>;
    setActiveTab: (tap: TabType) => void;
    lastUpdateDate: string | undefined;
}

const TandasContext = createContext<TandasContextType | undefined>(undefined);

export function TandasProvider({ children }: { children: ReactNode }) {
    const { address } = useAccount();
    const [tandas, setTandas] = useState<TandaData[]>([]);
    const [filteredTandas, setFilteredTandas] = useState<TandaData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [lastUpdateDate, setLastUpdatedDate] = useState<string>();
    const [activeTab, setActiveTab] = useState<TabType>('all');

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
            setLastUpdatedDate(new Date().toLocaleTimeString());
        }
    };

    // Filter tandas based on active tab
    const filterTandasByTab = async (tab: TabType) => {
        if (!address) return;

        setIsLoading(true);
        try {
            let filtered: TandaData[] = [];
            if (tab === 'all') {
                setActiveTab('all');
                filtered = await getAllActiveTandas();
            } else if (tab === 'created') {
                setActiveTab('created');
                const createdTandas = await getTandasByCreator(address);
                filtered = createdTandas;
            } else if (tab === 'joined') {
                setActiveTab('joined');
                const joinedTandas = await getTandasByParticipant(address);
                filtered = joinedTandas;
            }
            setFilteredTandas(filtered);
            setIsLoading(false);
        } catch (error) {
            setIsError(true);
            setIsLoading(false);
        } finally {
            setLastUpdatedDate(new Date().toLocaleTimeString());
        }
    };

    // Initial fetch
    useEffect(() => {
        getTandas();
    }, []);

    const value = {
        activeTab,
        tandas,
        filteredTandas,
        isLoading,
        isError,
        filterTandasByTab,
        setFilteredTandas,
        getTandas,
        setActiveTab,
        lastUpdateDate,
    };

    return (
        <TandasContext.Provider value={value}>
            {children}
        </TandasContext.Provider>
    );
}

export function useTandas() {
    const context = useContext(TandasContext);
    if (context === undefined) {
        throw new Error('useTandas must be used within a TandasProvider');
    }
    return context;
}