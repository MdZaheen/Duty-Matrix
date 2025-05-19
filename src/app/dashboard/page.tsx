'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DashboardStats {
  professors: number;
  rooms: number;
  students: number;
  schedules: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    professors: 0,
    rooms: 0,
    students: 0,
    schedules: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardStats() {
      try {
        setLoading(true);
        
        // Fetch professors count
        const professorsRes = await fetch('/api/professors');
        const professorsData = await professorsRes.json();
        
        // Fetch rooms count
        const roomsRes = await fetch('/api/rooms');
        const roomsData = await roomsRes.json();
        
        // Fetch students count
        const studentsRes = await fetch('/api/students');
        const studentsData = await studentsRes.json();
        
        // Fetch schedules count
        const schedulesRes = await fetch('/api/schedules');
        const schedulesData = await schedulesRes.json();
        
        setStats({
          professors: Array.isArray(professorsData) ? professorsData.length : 0,
          rooms: Array.isArray(roomsData) ? roomsData.length : 0,
          students: Array.isArray(studentsData) ? studentsData.length : 0,
          schedules: Array.isArray(schedulesData) ? schedulesData.length : 0
        });
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    }
    
    fetchDashboardStats();
  }, []);

  const StatCard = ({ title, count, icon, linkTo }: { title: string, count: number, icon: string, linkTo: string }) => (
    <Link href={linkTo}>
      <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-gray-500 text-sm uppercase font-semibold">{title}</h3>
            <p className="text-3xl font-bold text-purple-600 mt-1">{loading ? '...' : count}</p>
          </div>
          <div className="bg-purple-100 p-3 rounded-full">
            <span className="text-2xl text-purple-600">{icon}</span>
          </div>
        </div>
        <div className="mt-4 text-sm text-purple-600 font-medium">
          View details &rarr;
        </div>
      </div>
    </Link>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome to the CIE Room Allocation System dashboard</p>
      </div>
      
      {error && (
        <div className="bg-red-50 p-4 rounded-md text-red-600">
          <p className="font-medium">Error</p>
          <p>{error}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Professors" 
          count={stats.professors} 
          icon="👨‍🏫" 
          linkTo="/dashboard/professors" 
        />
        
        <StatCard 
          title="Rooms" 
          count={stats.rooms} 
          icon="🚪" 
          linkTo="/dashboard/rooms" 
        />
        
        <StatCard 
          title="Students" 
          count={stats.students} 
          icon="👨‍🎓" 
          linkTo="/dashboard/students" 
        />
        
        <StatCard 
          title="Exam Schedules" 
          count={stats.schedules} 
          icon="📅" 
          linkTo="/dashboard/schedules" 
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link href="/dashboard/student-allocation" className="flex items-center p-3 bg-purple-50 rounded-md hover:bg-purple-100 transition-colors">
              <div className="bg-purple-100 p-2 rounded-full mr-3">
                <span className="text-purple-600">📋</span>
              </div>
              <div>
                <p className="font-medium text-gray-800">Allocate Students</p>
                <p className="text-sm text-gray-600">Assign students to rooms for exams</p>
              </div>
            </Link>
            
            <Link href="/dashboard/reports/student-seating" className="flex items-center p-3 bg-green-50 rounded-md hover:bg-green-100 transition-colors">
              <div className="bg-green-100 p-2 rounded-full mr-3">
                <span className="text-green-600">📊</span>
              </div>
              <div>
                <p className="font-medium text-gray-800">View Seating Report</p>
                <p className="text-sm text-gray-600">Check student seating arrangements</p>
              </div>
            </Link>
            
            <Link href="/dashboard/subjects" className="flex items-center p-3 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors">
              <div className="bg-blue-100 p-2 rounded-full mr-3">
                <span className="text-blue-600">📚</span>
              </div>
              <div>
                <p className="font-medium text-gray-800">Manage Subjects</p>
                <p className="text-sm text-gray-600">Add or edit subject information</p>
              </div>
            </Link>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">System Overview</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Database Status</span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Connected</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Latest Allocation</span>
              <Link href="/dashboard/reports/student-seating" className="text-purple-600 hover:underline text-sm">
                View &rarr;
              </Link>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">System Version</span>
              <span className="text-gray-800 font-medium">v1.0.0</span>
            </div>
            
            <div className="pt-2 mt-2 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                CIE Room Allocation System provides streamlined exam management with section-wise student allocation and automated seating arrangements.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 