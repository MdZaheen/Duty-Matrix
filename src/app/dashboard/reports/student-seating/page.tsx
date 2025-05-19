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
    semester: number;
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

interface RoomInfo {
  _id: string;
  number: string;
  capacity: number;
}

export default function StudentSeatingReport() {
  const searchParams = useSearchParams();
  const [allocations, setAllocations] = useState<StudentAllocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState(searchParams.get('scheduleId') || '');
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
        // Fetch rooms
        const roomsRes = await fetch('/api/rooms');
        if (!roomsRes.ok) {
          throw new Error(`Failed to fetch rooms: ${roomsRes.status}`);
        }
        const roomsData = await roomsRes.json();
        setRooms(Array.isArray(roomsData) ? roomsData : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load options data');
      }
    };
    fetchOptions();
  }, []);

  useEffect(() => {
    if (selectedSchedule) {
      fetchAllocations();
    }
  }, [selectedSchedule]);

  const fetchAllocations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Fetch allocations for the selected schedule
      const queryString = `scheduleId=${selectedSchedule}`;
      const res = await fetch(`/api/student-allocations?${queryString}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `Server error: ${res.status}` }));
        throw new Error(errorData.error || `Failed to fetch allocations: ${res.status}`);
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setAllocations(data);
        // Group allocations by room
        const grouped: Record<string, StudentAllocation[]> = {};
        data.forEach((allocation: StudentAllocation) => {
          if (!allocation.room?.number) return;
          const roomKey = allocation.room.number;
          if (!grouped[roomKey]) grouped[roomKey] = [];
          grouped[roomKey].push(allocation);
        });
        // Sort allocations within each room by subject and then by USN
        Object.keys(grouped).forEach(roomNumber => {
          grouped[roomNumber].sort((a, b) => {
            if (a.subject.semester !== b.subject.semester) {
              return a.subject.semester - b.subject.semester;
            }
            return a.student.usn.localeCompare(b.student.usn);
          });
        });
        setGroupedAllocations(grouped);
      } else {
        setAllocations([]);
        setGroupedAllocations({});
        setError('No student allocations found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load student allocations');
      setAllocations([]);
      setGroupedAllocations({});
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to get subject info
  const getSubjectInfo = (subject: any) => {
    if (!subject) return '';
    return `${subject.code} - ${subject.name} (Sem ${subject.semester})`;
  };

  // Helper to get room capacity
  const getRoomCapacity = (roomNumber: string) => {
    const room = rooms.find(r => r.number === roomNumber);
    return room ? room.capacity : 0;
  };

  // Summary
  const totalRoomsUsed = Object.keys(groupedAllocations).length;
  const totalStudents = allocations.length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Seating Report</h1>
          <p className="mt-1 text-gray-600">
            View and export student seating arrangements for shared room allocations
          </p>
        </div>
        <div className="flex space-x-3">
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
        </div>
      </div>
      {/* Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Allocation Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-purple-700">{totalRoomsUsed}</div>
            <div className="text-gray-600">Rooms Used</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-700">{totalStudents}</div>
            <div className="text-gray-600">Total Students</div>
          </div>
        </div>
      </div>
      {/* Per Room Table */}
      {Object.keys(groupedAllocations).length === 0 && !isLoading && (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          No student allocations found for the selected schedule.
        </div>
      )}
      {Object.keys(groupedAllocations).map(roomNumber => {
        const roomCapacity = getRoomCapacity(roomNumber);
        // Use the seatNumber assigned by the backend, do not reassign
        const seatAssignments = groupedAllocations[roomNumber]
          .filter(a => typeof a.seatNumber === 'number')
          .sort((a, b) => a.seatNumber - b.seatNumber);
        return (
          <div key={roomNumber} className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Room {roomNumber} <span className="text-sm text-gray-500">(Capacity: {roomCapacity})</span></h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seat</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">USN</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Semester</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {seatAssignments.map((allocation, idx) => (
                    <tr key={allocation._id}>
                      <td className="px-2 py-1">{allocation.seatNumber}</td>
                      <td className="px-2 py-1">{allocation.student.usn}</td>
                      <td className="px-2 py-1">{allocation.student.name}</td>
                      <td className="px-2 py-1">{allocation.student.section}</td>
                      <td className="px-2 py-1">{allocation.subject.semester}</td>
                      <td className="px-2 py-1">{allocation.subject.code} - {allocation.subject.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-sm text-gray-600 mt-2">
                Total students in this room: <span className="font-bold">{seatAssignments.length}</span>
              </div>
            </div>
          </div>
        );
      })}
      {isLoading && (
        <div className="text-center text-gray-500">Loading...</div>
      )}
      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
} 