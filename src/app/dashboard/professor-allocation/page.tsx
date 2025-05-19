'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ProfessorAllocation() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAllocate = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/allocate-professors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to allocate professors');
      }
      
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Professor Duty Allocation</h1>
          <p className="mt-1 text-gray-600">
            Automatically allocate professors to examination rooms using fair round-robin scheduling
          </p>
        </div>
      </div>

      {/* Prerequisites */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Prerequisites</h2>
        <div className="space-y-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3">
              1
            </div>
            <div>
              <p className="font-medium">Add professors to the system</p>
              <p className="text-sm text-gray-500">Make sure you have added all professors with their designations</p>
              <Link href="/dashboard/professors" className="text-sm text-blue-600 hover:underline mt-1 inline-block">
                Manage Professors &rarr;
              </Link>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3">
              2
            </div>
            <div>
              <p className="font-medium">Add room information</p>
              <p className="text-sm text-gray-500">Ensure all examination rooms are registered</p>
              <Link href="/dashboard/rooms" className="text-sm text-blue-600 hover:underline mt-1 inline-block">
                Manage Rooms &rarr;
              </Link>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3">
              3
            </div>
            <div>
              <p className="font-medium">Set exam schedules</p>
              <p className="text-sm text-gray-500">Create schedules for exam dates and shifts</p>
              <Link href="/dashboard/schedules" className="text-sm text-blue-600 hover:underline mt-1 inline-block">
                Manage Schedules &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Allocation */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Generate Allocation</h2>
        <p className="text-gray-600 mb-4">
          Click the button below to automatically assign professors to rooms in a fair round-robin manner.
          The system will ensure equitable distribution of duties based on seniority.
        </p>
        
        <button
          onClick={handleAllocate}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isLoading ? 'Processing...' : 'Run Allocation'}
        </button>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}
        
        {result && (
          <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-md">
            <p className="font-medium">Allocation Successful!</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>Total Allocations: <span className="font-bold">{result.data.totalAllocations}</span></div>
              <div>Professors: <span className="font-bold">{result.data.professors}</span></div>
              <div>Rooms: <span className="font-bold">{result.data.rooms}</span></div>
              <div>Schedules: <span className="font-bold">{result.data.schedules}</span></div>
            </div>
            
            <div className="mt-4">
              <Link href="/dashboard/reports/professor-duty" className="text-blue-600 hover:underline">
                View Professor Duty Report &rarr;
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">How It Works</h2>
        <div className="space-y-3 text-gray-600">
          <p>Our allocation algorithm follows these principles:</p>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>Sorts professors by seniority (Professor &gt; Associate &gt; Assistant)</li>
            <li>Uses fair round-robin allocation to distribute duties evenly</li>
            <li>Considers previous allocations to ensure rotation of duties</li>
            <li>Tracks duty counts for each professor to maintain balance</li>
          </ol>
        </div>
      </div>
    </div>
  );
} 