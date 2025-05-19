'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface StudentAllocation {
  _id: string;
  student: {
    _id: string;
    name: string;
    usn: string;
    section: string;
  };
  room: {
    _id: string;
    number: string;
  };
  subject: {
    _id: string;
    code: string;
    name: string;
  };
  schedule: {
    _id: string;
    date: string;
    shift: string;
    startTime: string;
    endTime: string;
  };
  seatNumber: number;
  attendance: boolean;
  ciaMarks: {
    cia1: number | null;
    cia2: number | null;
    cia3: number | null;
  };
}

export default function StudentSeatingReport() {
  const searchParams = useSearchParams();
  const [allocations, setAllocations] = useState<StudentAllocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState(searchParams.get('scheduleId') || '');
  const [selectedSubject, setSelectedSubject] = useState(searchParams.get('subjectId') || '');
  const [groupedAllocations, setGroupedAllocations] = useState<Record<string, StudentAllocation[]>>({});

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        // Fetch schedules
        const schedulesRes = await fetch('/api/schedules');
        if (!schedulesRes.ok) {
          throw new Error(`Failed to fetch schedules: ${schedulesRes.status}`);
        }
        const schedulesData = await schedulesRes.json();
        setSchedules(Array.isArray(schedulesData) ? schedulesData : []);
        
        // Fetch subjects
        const subjectsRes = await fetch('/api/subjects');
        if (!subjectsRes.ok) {
          throw new Error(`Failed to fetch subjects: ${subjectsRes.status}`);
        }
        const subjectsData = await subjectsRes.json();
        setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load options data');
      }
    };
    
    fetchOptions();
  }, []);

  useEffect(() => {
    if (selectedSchedule && selectedSubject) {
      fetchAllocations();
    }
  }, [selectedSchedule, selectedSubject]);

  const fetchAllocations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch allocations with the selected filters
      const queryString = `scheduleId=${selectedSchedule}&subjectId=${selectedSubject}`;
      const res = await fetch(`/api/student-allocations?${queryString}`);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `Server error: ${res.status}` }));
        throw new Error(errorData.error || `Failed to fetch allocations: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setAllocations(data);
        
        // Group allocations by room for easy display
        const grouped: Record<string, StudentAllocation[]> = {};
        data.forEach((allocation: StudentAllocation) => {
          if (!allocation.room?.number) return;
          
          const key = allocation.room.number;
          if (!grouped[key]) {
            grouped[key] = [];
          }
          grouped[key].push(allocation);
        });
        
        // Sort allocations within each room by seat number
        Object.keys(grouped).forEach(roomNumber => {
          grouped[roomNumber].sort((a, b) => a.seatNumber - b.seatNumber);
        });
        
        setGroupedAllocations(grouped);
      } else {
        // If the response is not an array, set empty allocations
        setAllocations([]);
        setGroupedAllocations({});
        setError('No student allocations found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load student allocations');
      console.error(err);
      // Initialize with empty arrays to prevent render errors
      setAllocations([]);
      setGroupedAllocations({});
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (!selectedSchedule || !selectedSubject) {
      setError('Please select both schedule and subject to export');
      return;
    }
    
    // Redirect to the export API endpoint with query parameters
    window.location.href = `/api/export-student-allocation?scheduleId=${selectedSchedule}&subjectId=${selectedSubject}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Seating Report</h1>
          <p className="mt-1 text-gray-600">
            View and export student seating arrangements
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleExport}
            disabled={!selectedSchedule || !selectedSubject}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
          >
            Export to Excel
          </button>
          
          <Link 
            href="/dashboard/student-allocation" 
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            Manage Allocation
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Filter Allocations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              {schedules.map((schedule) => (
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
              {subjects.map((subject) => (
                <option key={subject._id} value={subject._id}>
                  {subject.code} - {subject.name} (Sem {subject.semester}, {subject.branch})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-3 text-gray-600">Loading allocations...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-md text-red-600">
          <p className="font-medium">Error</p>
          <p>{error}</p>
        </div>
      ) : !selectedSchedule || !selectedSubject ? (
        <div className="bg-blue-50 p-4 rounded-md text-blue-600">
          <p>Please select both schedule and subject to view seating arrangements.</p>
        </div>
      ) : Object.keys(groupedAllocations).length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-700 mb-4">No student allocations found for the selected criteria.</p>
          <Link 
            href="/dashboard/student-allocation" 
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            Create Allocations Now
          </Link>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Total Students</p>
                <p className="text-2xl font-bold text-purple-600">{allocations.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Rooms Utilized</p>
                <p className="text-2xl font-bold text-purple-600">{Object.keys(groupedAllocations).length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Subject</p>
                <p className="text-lg font-medium text-purple-600">
                  {allocations.length > 0 ? `${allocations[0].subject.code} - ${allocations[0].subject.name}` : 'N/A'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Room-wise Seating */}
          {Object.entries(groupedAllocations).map(([roomNumber, roomAllocations]) => (
            <div key={roomNumber} className="bg-white rounded-lg shadow overflow-hidden mb-6">
              <div className="p-6 pb-2 border-b">
                <h2 className="text-lg font-semibold text-gray-700">Room {roomNumber}</h2>
                <p className="text-sm text-gray-500">
                  Total Students: {roomAllocations.length} | 
                  Sections: {Array.from(new Set(roomAllocations.map(a => a.student.section))).join(', ')}
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Seat No.
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        USN
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Section
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CIA-1
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CIA-2
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CIA-3
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Attendance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {roomAllocations.map((allocation) => (
                      <tr key={allocation._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {allocation.seatNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {allocation.student.usn}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {allocation.student.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {allocation.student.section}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {allocation.ciaMarks?.cia1 || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {allocation.ciaMarks?.cia2 || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {allocation.ciaMarks?.cia3 || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {allocation.attendance ? '✓' : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
} 