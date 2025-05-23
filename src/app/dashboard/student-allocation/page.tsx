'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Schedule {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  shift: string;
}

export default function StudentAllocation() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [subject1, setSubject1] = useState('');
  const [subject2, setSubject2] = useState('');

  // Fetch schedules and subjects on component mount
  useEffect(() => {
    const fetchWithRetry = async (url: string, retries = 3, delay = 1000) => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch from ${url}: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithRetry(url, retries - 1, delay * 2);
      }
    };
    const fetchData = async () => {
      try {
        const [schedulesData, subjectsData] = await Promise.all([
          fetchWithRetry('/api/schedules'),
          fetchWithRetry('/api/subjects')
        ]);
        setSchedules(Array.isArray(schedulesData) ? schedulesData : []);
        setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load necessary data');
        setSchedules([]);
        setSubjects([]);
      }
    };
    fetchData();
  }, []);

  const handleAllocate = async () => {
    if (!selectedSchedule || (!subject1 && !subject2)) {
      setError('Please select a schedule and at least one subject');
      return;
    }
    const schedule = schedules.find(s => s._id === selectedSchedule);
    if (!schedule) {
      setError('Selected schedule not found');
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/allocate-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examDate: schedule.date,
          examTime: schedule.startTime,
          scheduleId: selectedSchedule,
          subject1: subject1 || null,
          subject2: subject2 || null
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to allocate room');
      }
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to get semester label for a subject id
  const getSemesterLabel = (subjectId: string) => {
    const subject = subjects.find((s: any) => s._id === subjectId);
    return subject ? ` (Sem ${subject.semester})` : '';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shared Room Allocation</h1>
          <p className="mt-1 text-gray-600">
            Allocate students from one or two different groups/semesters to rooms automatically
          </p>
        </div>
      </div>

      {/* Prerequisites */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Prerequisites</h2>
        <div className="space-y-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mr-3">1</div>
            <div>
              <p className="font-medium">Add students to the system</p>
              <p className="text-sm text-gray-500">Make sure you have added all students with their semester and section information</p>
              <Link href="/dashboard/students" className="text-sm text-purple-600 hover:underline mt-1 inline-block">Manage Students &rarr;</Link>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mr-3">2</div>
            <div>
              <p className="font-medium">Add subject details</p>
              <p className="text-sm text-gray-500">Register all subjects for the examination</p>
              <Link href="/dashboard/subjects" className="text-sm text-purple-600 hover:underline mt-1 inline-block">Manage Subjects &rarr;</Link>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mr-3">3</div>
            <div>
              <p className="font-medium">Add room information</p>
              <p className="text-sm text-gray-500">Ensure all examination rooms are registered</p>
              <Link href="/dashboard/rooms" className="text-sm text-purple-600 hover:underline mt-1 inline-block">Manage Rooms &rarr;</Link>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mr-3">4</div>
            <div>
              <p className="font-medium">Set exam schedules</p>
              <p className="text-sm text-gray-500">Create schedules for exam dates and shifts</p>
              <Link href="/dashboard/schedules" className="text-sm text-purple-600 hover:underline mt-1 inline-block">Manage Schedules &rarr;</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Room Allocation Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Room Allocation Details</h2>
        <div className="mb-6">
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
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Subject for First Group
            </label>
            <select
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
              value={subject1}
              onChange={(e) => setSubject1(e.target.value)}
            >
              <option value="">Select Subject</option>
              {subjects.map(subject => (
                <option key={subject._id} value={subject._id}>{subject.code} - {subject.name}{getSemesterLabel(subject._id)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Subject for Second Group
            </label>
            <select
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
              value={subject2}
              onChange={(e) => setSubject2(e.target.value)}
            >
              <option value="">Select Subject</option>
              {subjects.map(subject => (
                <option key={subject._id} value={subject._id}>{subject.code} - {subject.name}{getSemesterLabel(subject._id)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mb-6 text-sm text-gray-500">
          If you select only one group, the entire room will be used for that group.
        </div>
        <button
          onClick={handleAllocate}
          disabled={isLoading || !selectedSchedule || (!subject1 && !subject2)}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isLoading ? 'Processing...' : 'Allocate Rooms'}
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
              <div>Date: <span className="font-bold">{new Date(result.examDate).toLocaleDateString()}</span></div>
              <div>Time: <span className="font-bold">{result.examTime}</span></div>
              <div>Total Students: <span className="font-bold">{result.totalAllocatedStudents}</span></div>
              <div>Rooms Used: <span className="font-bold">{result.roomsUsed}</span></div>
            </div>
            <div className="mt-4">
              <Link href="/dashboard/reports/student-seating" className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">View Student Seating Report &rarr;</Link>
            </div>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">How It Works</h2>
        <ol className="list-decimal list-inside space-y-2 ml-4 text-gray-700">
          <li>Select the exam schedule and subjects for one or two groups/semesters.</li>
          <li>The system fetches all students for the selected groups/semesters.</li>
          <li>Each room is split: first half of seats for the first group, second half for the second group (if both are selected).</li>
          <li>If the room capacity is odd, the extra seat goes to the second group.</li>
          <li>Students are assigned seat numbers and rooms automatically.</li>
          <li>You can view the detailed seating report after allocation.</li>
        </ol>
      </div>
    </div>
  );
} 