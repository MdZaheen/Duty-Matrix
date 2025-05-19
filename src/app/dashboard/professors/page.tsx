'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface Professor {
  _id: string;
  name: string;
  designation: string;
  email?: string;
  department?: string;
  dutyCount: number;
}

interface ImportResult {
  success: boolean;
  imported: number;
  total: number;
  errors?: string[];
}

export default function ProfessorsPage() {
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    designation: 'Assistant Professor',
    email: '',
    department: ''
  });
  const [isAllocating, setIsAllocating] = useState(false);
  const [allocateMessage, setAllocateMessage] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [warningsMinimized, setWarningsMinimized] = useState(false);

  useEffect(() => {
    fetchProfessors();
  }, []);

  const fetchProfessors = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Fetching professors from API');
      
      const response = await fetch('/api/professors');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received professors data:', data);
      
      if (Array.isArray(data)) {
        setProfessors(data);
      } else {
        console.error('Expected array but got:', data);
        throw new Error('Invalid data format received from server');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load professors';
      setError(errorMessage);
      console.error('Error fetching professors:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/professors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add professor');
      }
      
      setFormData({
        name: '',
        designation: 'Assistant Professor',
        email: '',
        department: ''
      });
      setShowAddForm(false);
      fetchProfessors();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this professor?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/professors/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete professor');
      }
      
      fetchProfessors();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const handleAllocateProfessors = async () => {
    try {
      setIsAllocating(true);
      setAllocateMessage(null);
      setError(null);
      
      const response = await fetch('/api/allocate-professors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to allocate professors');
      }
      
      setAllocateMessage('Professors allocated successfully!');
      fetchProfessors();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsAllocating(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Only Excel files (.xlsx, .xls) are supported');
      return;
    }

    try {
      setIsImporting(true);
      setImportResult(null);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/import/professors', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import professors');
      }

      setImportResult(data);
      fetchProfessors();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during import');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Professors</h1>
          <p className="mt-1 text-gray-600">
            Add, edit, or remove professors for duty allocation
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleImportClick}
            disabled={isImporting}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:bg-gray-400"
          >
            {isImporting ? 'Importing...' : 'Import Excel'}
          </button>
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange} 
            accept=".xlsx,.xls" 
            className="hidden"
          />
          
          <button
            onClick={handleAllocateProfessors}
            disabled={isAllocating || professors.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400"
          >
            {isAllocating ? 'Allocating...' : 'Allocate Professors'}
          </button>
          
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {showAddForm ? 'Cancel' : 'Add Professor'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-md text-red-600 border border-red-200">
          <p className="font-medium">Error</p>
          <p>{error}</p>
          <button 
            onClick={() => setError(null)} 
            className="mt-2 px-3 py-1 bg-red-100 text-red-800 rounded-md hover:bg-red-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {allocateMessage && (
        <div className="bg-green-50 p-4 rounded-md text-green-600">
          <p className="font-medium">Success</p>
          <p>{allocateMessage}</p>
        </div>
      )}

      {importResult && (
        <div className="bg-green-50 p-4 rounded-md text-green-600 border border-green-200">
          <p className="font-medium">Import Successful</p>
          <p>Successfully imported {importResult.imported} out of {importResult.total} professors.</p>
          {importResult.errors && importResult.errors.length > 0 && (
            <div className="mt-2">
              <div className="flex justify-between items-center">
                <p className="font-medium text-yellow-600">Warnings:</p>
                <button 
                  onClick={() => setWarningsMinimized(!warningsMinimized)} 
                  className="text-sm px-2 py-1 bg-yellow-100 rounded hover:bg-yellow-200 text-yellow-700"
                >
                  {warningsMinimized ? 'Show Warnings' : 'Minimize Warnings'}
                </button>
              </div>
              {!warningsMinimized && (
                <ul className="list-disc pl-5 text-yellow-600 mt-1 text-sm max-h-40 overflow-y-auto">
                  {importResult.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Add New Professor</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-black mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-black"
                />
              </div>
              
              <div>
                <label htmlFor="designation" className="block text-sm font-medium text-gray-700 mb-1">
                  Designation <span className="text-red-500">*</span>
                </label>
                <select
                  id="designation"
                  name="designation"
                  required
                  value={formData.designation}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-black"
                >
                  <option value="Professor">Professor</option>
                  <option value="Associate Professor">Associate Professor</option>
                  <option value="Assistant Professor">Assistant Professor</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-black mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-black"
                />
              </div>
              
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-black"
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Save Professor
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
          <p className="text-gray-600">Loading professors...</p>
        </div>
      ) : professors.length === 0 && !error ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600 mb-4">No professors found in the database.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none"
          >
            Add Your First Professor
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Designation
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duty Count
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {professors.map((professor) => (
                  <tr key={professor._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {professor.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {professor.designation}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {professor.department || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {professor.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {professor.dutyCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      <button
                        onClick={() => handleDelete(professor._id)}
                        className="text-red-600 hover:text-red-900 ml-3"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
