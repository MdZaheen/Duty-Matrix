'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function StudentAllocation() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  // Fetch schedules and subjects on component mount
  useEffect(() => {
    // Helper function to retry fetching with exponential backoff
    const fetchWithRetry = async (url: string, retries = 3, delay = 1000) => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch from ${url}: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        if (retries === 0) throw error;
        console.log(`Retrying fetch to ${url} (${retries} attempts left)...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithRetry(url, retries - 1, delay * 2);
      }
    };

    const fetchData = async () => {
      try {
        // Fetch schedules with retry
        const schedulesData = await fetchWithRetry('/api/schedules');
        setSchedules(Array.isArray(schedulesData) ? schedulesData : []);
        
        // Fetch subjects with retry
        const subjectsData = await fetchWithRetry('/api/subjects');
        setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load necessary data');
        // Initialize with empty arrays to prevent map errors
        setSchedules([]);
        setSubjects([]);
      }
    };
    
    fetchData();
  }, []);

  const handleAllocate = async () => {
    if (!selectedSchedule || !selectedSubject) {
      setError('Please select both schedule and subject');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Helper function to retry POST request with exponential backoff
      const postWithRetry = async (url: string, body: any, retries = 3, delay = 1000) => {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          });
          
          if (!response.ok) {
            const data = await response.json().catch(() => ({ error: `Server error: ${response.status}` }));
            throw new Error(data.error || `Failed to post to ${url}: ${response.status}`);
          }
          
          const data = await response.json();
          return data;
        } catch (error) {
          if (retries === 0) throw error;
          console.log(`Retrying POST to ${url} (${retries} attempts left)...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return postWithRetry(url, body, retries - 1, delay * 2);
        }
      };
      
      const data = await postWithRetry('/api/allocate-students', {
        scheduleId: selectedSchedule,
        subjectId: selectedSubject,
      });
      
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
          <h1 className="text-2xl font-bold text-gray-900">Student Room Allocation</h1>
          <p className="mt-1 text-gray-600">
            Allocate students to examination rooms by section and seat number
          </p>
        </div>
      </div>

      {/* Prerequisites */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Prerequisites</h2>
        <div className="space-y-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mr-3">
              1
            </div>
            <div>
              <p className="font-medium">Add students to the system</p>
              <p className="text-sm text-gray-500">Make sure you have added all students with their section information</p>
              <Link href="/dashboard/students" className="text-sm text-purple-600 hover:underline mt-1 inline-block">
                Manage Students &rarr;
              </Link>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mr-3">
              2
            </div>
            <div>
              <p className="font-medium">Add subject details</p>
              <p className="text-sm text-gray-500">Register all subjects for the examination</p>
              <Link href="/dashboard/subjects" className="text-sm text-purple-600 hover:underline mt-1 inline-block">
                Manage Subjects &rarr;
              </Link>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mr-3">
              3
            </div>
            <div>
              <p className="font-medium">Set up room information</p>
              <p className="text-sm text-gray-500">Ensure examination rooms with capacities are defined</p>
              <Link href="/dashboard/rooms" className="text-sm text-purple-600 hover:underline mt-1 inline-block">
                Manage Rooms &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Allocation */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Generate Student Allocation</h2>
        <p className="text-gray-600 mb-6">
          Select an exam schedule and subject to allocate students by section. Students will be seated together 
          by section and sorted by USN for easy identification.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="schedule" className="block text-sm font-medium text-gray-700 mb-1">
              Select Exam Schedule
            </label>
            <select
              id="schedule"
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
              value={selectedSchedule}
              onChange={(e) => setSelectedSchedule(e.target.value)}
            >
              <option value="">Select Schedule</option>
              {Array.isArray(schedules) && schedules.map((schedule) => (
                <option key={schedule._id} value={schedule._id}>
                  {new Date(schedule.date).toLocaleDateString()} - {schedule.shift} ({schedule.startTime}-{schedule.endTime})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
              Select Subject
            </label>
            <select
              id="subject"
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <option value="">Select Subject</option>
              {Array.isArray(subjects) && subjects.map((subject) => (
                <option key={subject._id} value={subject._id}>
                  {subject.code} - {subject.name} (Sem {subject.semester}, {subject.branch})
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <button
          onClick={handleAllocate}
          disabled={isLoading || !selectedSchedule || !selectedSubject}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50"
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
              <div>Sections: <span className="font-bold">{result.data.sections}</span></div>
              <div>Rooms: <span className="font-bold">{result.data.roomsUsed}</span></div>
              <div>Students: <span className="font-bold">{result.data.students}</span></div>
            </div>
            
            <div className="mt-4">
              <Link 
                href={`/dashboard/reports/student-seating?scheduleId=${selectedSchedule}&subjectId=${selectedSubject}`} 
                className="text-purple-600 hover:underline"
              >
                View Student Seating Report &rarr;
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">How It Works</h2>
        <div className="space-y-3 text-gray-600">
          <p>Our section-wise student allocation follows these principles:</p>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>Groups students by section to keep classmates together</li>
            <li>Allocates entire sections to rooms when possible</li>
            <li>Splits sections across rooms when needed based on capacity</li>
            <li>Ensures students are sorted by USN for easy identification</li>
          </ol>
        </div>
      </div>
    </div>
  );
} 