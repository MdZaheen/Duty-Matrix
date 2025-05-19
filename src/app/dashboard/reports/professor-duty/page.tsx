'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ProfessorDuty {
  _id: string;
  professor: {
    _id: string;
    name: string;
    designation: string;
  } | null;
  room: {
    _id: string;
    number: string;
  } | null;
  date: string;
  shift: string;
  startTime?: string;
  endTime?: string;
}

export default function ProfessorDutyReport() {
  const [duties, setDuties] = useState<ProfessorDuty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupedDuties, setGroupedDuties] = useState<Record<string, ProfessorDuty[]>>({});
  const [professors, setProfessors] = useState<any[]>([]);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [assessmentNumber, setAssessmentNumber] = useState<string>('2');
  const [showExportOptions, setShowExportOptions] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all professors
      console.log('Fetching professors data...');
      const professorsRes = await fetch('/api/professors');
      const professorsData = await professorsRes.json();
      setProfessors(professorsData);
      console.log(`Fetched ${professorsData.length} professors`);
      
      // Fetch all duties with populated data
      console.log('Fetching professor duties...');
      const res = await fetch('/api/professor-duties');
      const data = await res.json();
      console.log('Professor duties response:', data);
      
      if (Array.isArray(data)) {
        console.log(`Got ${data.length} duties from API`);
        
        // Map professor and room IDs to their objects if needed
        const validDuties = data.map(duty => {
          // Check if professor is not populated
          if (duty.professor && typeof duty.professor === 'string') {
            // Find professor by ID
            const professor = professorsData.find((p: any) => p._id === duty.professor);
            if (professor) {
              duty.professor = professor;
            } else {
              console.warn(`Professor ID ${duty.professor} not found`);
            }
          }
          
          return duty;
        }).filter(duty => 
          duty.professor && 
          duty.room && 
          typeof duty.professor !== 'string' && 
          typeof duty.room !== 'string'
        );
        
        if (validDuties.length < data.length) {
          console.warn(`Filtered out ${data.length - validDuties.length} invalid duties`);
          if (data.length > 0) {
            console.log('Sample duty:', JSON.stringify(data[0], null, 2));
          }
        }
        
        setDuties(validDuties);
        
        // Group duties by date and shift for easy display
        const grouped: Record<string, ProfessorDuty[]> = {};
        validDuties.forEach((duty: ProfessorDuty) => {
          const key = `${duty.date}-${duty.shift}`;
          if (!grouped[key]) {
            grouped[key] = [];
          }
          grouped[key].push(duty);
        });
        
        setGroupedDuties(grouped);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load professor duties';
      setError(errorMessage);
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = (format?: string) => {
    // Build the URL with format and assessment parameters if provided
    let url = '/api/export-professor-duty';
    const params = new URLSearchParams();
    
    if (format) {
      params.append('format', format);
      
      // Add assessment number for CIA format
      if (format === 'cia') {
        params.append('assessment', assessmentNumber);
      }
    }
    
    // Add params to URL if there are any
    if (params.toString()) {
      url = `${url}?${params.toString()}`;
    }
    
    // Redirect to the export API endpoint
    window.location.href = url;
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all professor duties? This action cannot be undone.')) {
      return;
    }
    
    try {
      setIsResetting(true);
      setResetMessage(null);
      setError(null);
      
      const response = await fetch('/api/reset-professor-duties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset professor duties');
      }
      
      setResetMessage('All professor duties have been reset successfully.');
      
      // Refetch data
      fetchData();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Professor Duty Report</h1>
          <p className="mt-1 text-gray-600">
            View and export professor invigilation duties
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleReset}
            disabled={isResetting}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-gray-400"
          >
            {isResetting ? 'Resetting...' : 'Reset Duties'}
          </button>
          
          <div className="relative inline-block text-left">
            <button
              onClick={() => setShowExportOptions(!showExportOptions)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Export CIA Format
            </button>
            
            {showExportOptions && (
              <div className="absolute right-0 mt-2 w-60 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 p-3 z-10">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CIA Assessment Number
                  </label>
                  <select
                    value={assessmentNumber}
                    onChange={(e) => setAssessmentNumber(e.target.value)}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="1">CIA-1</option>
                    <option value="2">CIA-2</option>
                    <option value="3">CIA-3</option>
                  </select>
                </div>
                
                <button
                  onClick={() => {
                    handleExport('cia');
                    setShowExportOptions(false);
                  }}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Export CIA-{assessmentNumber} Format
                </button>
              </div>
            )}
          </div>
          
          <Link 
            href="/dashboard/professor-allocation" 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Manage Allocation
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-md text-red-600">
          <p className="font-medium">Error</p>
          <p>{error}</p>
        </div>
      )}

      {resetMessage && (
        <div className="bg-green-50 p-4 rounded-md text-green-600">
          <p className="font-medium">Success</p>
          <p>{resetMessage}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-3 text-gray-600">Loading duties...</p>
          </div>
        </div>
      ) : Object.keys(groupedDuties).length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-700 mb-4">No professor duties have been allocated yet.</p>
          <Link 
            href="/dashboard/professor-allocation" 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Allocate Professors Now
          </Link>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Total Professors</p>
                <p className="text-2xl font-bold text-blue-600">{professors.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Duties Assigned</p>
                <p className="text-2xl font-bold text-blue-600">{duties.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Exam Sessions</p>
                <p className="text-2xl font-bold text-blue-600">{Object.keys(groupedDuties).length}</p>
              </div>
            </div>
          </div>
          
          {/* Duty Chart */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-700 p-6 pb-2">Duty Chart</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shift
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Room
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Professor
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Designation
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {duties.map((duty) => (
                    <tr key={duty._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {duty.date ? new Date(duty.date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {duty.shift || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {duty.startTime && duty.endTime 
                          ? `${duty.startTime} - ${duty.endTime}` 
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {duty.room && duty.room.number ? duty.room.number : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {duty.professor && duty.professor.name ? duty.professor.name : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {duty.professor && duty.professor.designation ? duty.professor.designation : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 