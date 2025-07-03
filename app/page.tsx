'use client'

import { useState } from 'react';
import { useAccount } from 'wagmi';
import ActiveTandas from '@/components/partials/ActiveTandas';
import CreateTandaForm from '@/components/partials/CreateTandaForm';

export default function Home() {
  const { isConnected } = useAccount();
  const [showForm, setShowForm] = useState(false);

  const toggleForm = () => setShowForm(!showForm);

  return (
    <main className="max-w-screen-2xl mx-auto px-4 py-8">
      {isConnected && (
        <div className="mb-4">
          {!showForm ? (
            <button
              onClick={toggleForm}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              + Create a new tanda
            </button>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4">
                <span></span>
                <button
                  onClick={toggleForm}
                  className="text-sm text-gray-500 hover:text-red-500"
                >
                  Close
                </button>
              </div>
                <CreateTandaForm setShowForm={setShowForm} />
            </div>
          )}
        </div>
      )}

      <ActiveTandas />
    </main>
  );
}
