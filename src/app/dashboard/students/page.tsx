'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Student {
  _id: string;
  name: string;
  usn: string;
  branch: string;
  section: string;
  semester: number;
  email?: string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  total: number;
  errors?: string[];
}

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    usn: '',
    branch: '',
    section: '',
    semester: 1,
    email: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    branch: '',
    section: '',
    semester: ''
  });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Branch options
  const branchOptions = [
    { value: '', label: 'All Branches' },
    { value: 'CSE', label: 'Computer Science' },
    { value: 'ISE', label: 'Information Science' },
    { value: 'ECE', label: 'Electronics & Communication' },
    { value: 'EEE', label: 'Electrical & Electronics' },
    { value: 'ME', label: 'Mechanical Engineering' },
    { value: 'CV', label: 'Civil Engineering' }
  ];
  
  // Section options
  const sectionOptions = [
    { value: '', label: 'All Sections' },
    { value: 'A', label: 'Section A' },
    { value: 'B', label: 'Section B' },
    { value: 'C', label: 'Section C' },
    { value: 'D', label: 'Section D' }
  ];
  
  // Semester options
  const semesterOptions = [
    { value: '', label: 'All Semesters' },
    { value: '1', label: '1st Semester' },
    { value: '2', label: '2nd Semester' },
    { value: '3', label: '3rd Semester' },
    { value: '4', label: '4th Semester' },
    { value: '5', label: '5th Semester' },
    { value: '6', label: '6th Semester' },
    { value: '7', label: '7th Semester' },
    { value: '8', label: '8th Semester' }
  ];

  // Fetch students on component mount and when filters change
  useEffect(() => {
    fetchStudents();
  }, [filter]);

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Build query string from filters
      const queryParams = new URLSearchParams();
      if (filter.branch) queryParams.append('branch', filter.branch);
      if (filter.section) queryParams.append('section', filter.section);
      if (filter.semester) queryParams.append('semester', filter.semester);
      
      const queryString = queryParams.toString();
      const url = `/api/students${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch students');
      }
      
      setStudents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
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

      const response = await fetch('/api/import/students', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import students');
      }

      setImportResult(data);
      fetchStudents();

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

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilter(prev => ({ ...prev, [name]: value }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'semester' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      
      const url = `/api/students${isEditing && currentStudentId ? `/${currentStudentId}` : ''}`;
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Failed to ${isEditing ? 'update' : 'create'} student`);
      }
      
      // Refresh the student list
      fetchStudents();
      
      // Close modal and reset form
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (student: Student) => {
    setFormData({
      name: student.name,
      usn: student.usn,
      branch: student.branch,
      section: student.section,
      semester: student.semester,
      email: student.email || ''
    });
    setCurrentStudentId(student._id);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/students/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete student');
      }
      
      // Refresh the student list
      fetchStudents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      usn: '',
      branch: '',
      section: '',
      semester: 1,
      email: ''
    });
    setIsEditing(false);
    setCurrentStudentId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Students</h1>
        <div className="flex space-x-3">
          <button 
            onClick={handleImportClick}
            disabled={isImporting}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none"
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
            onClick={openCreateModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none"
          >
            Add New Student
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error mb-4 bg-red-50 p-4 text-red-600 rounded-md border border-red-200">
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

      {importResult && (
        <div className="mb-4 bg-green-50 p-4 rounded-md text-green-600 border border-green-200">
          <p className="font-medium">Import Successful</p>
          <p>Successfully imported {importResult.imported} out of {importResult.total} students.</p>
          {importResult.errors && importResult.errors.length > 0 && (
            <div className="mt-2">
              <p className="font-medium text-yellow-600">Warnings:</p>
              <ul className="list-disc pl-5 text-yellow-600 mt-1 text-sm max-h-40 overflow-y-auto">
                {importResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="form-label">Branch</label>
            <select
              name="branch"
              value={filter.branch}
              onChange={handleFilterChange}
              className="w-full rounded-md border-gray-300"
            >
              {branchOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Section</label>
            <select
              name="section"
              value={filter.section}
              onChange={handleFilterChange}
              className="w-full rounded-md border-gray-300"
            >
              {sectionOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Semester</label>
            <select
              name="semester"
              value={filter.semester}
              onChange={handleFilterChange}
              className="w-full rounded-md border-gray-300"
            >
              {semesterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Student List</h2>
        
        {isLoading && <div className="text-center py-4">Loading...</div>}
        
        {!isLoading && students.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            No students found. Please add some students or adjust your filters.
          </div>
        )}
        
        {!isLoading && students.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th>USN</th>
                  <th>Name</th>
                  <th>Branch</th>
                  <th>Section</th>
                  <th>Semester</th>
                  <th>Email</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map(student => (
                  <tr key={student._id}>
                    <td>{student.usn}</td>
                    <td>{student.name}</td>
                    <td>{student.branch}</td>
                    <td>{student.section}</td>
                    <td>{student.semester}</td>
                    <td>{student.email || '-'}</td>
                    <td>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(student)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(student._id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {isEditing ? 'Edit Student' : 'Add New Student'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="form-label">Name <span className="form-required">*</span></label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-md border-gray-300"
                  />
                </div>
                
                <div>
                  <label className="form-label">USN <span className="form-required">*</span></label>
                  <input
                    type="text"
                    name="usn"
                    value={formData.usn}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-md border-gray-300"
                  />
                </div>
                
                <div>
                  <label className="form-label">Branch <span className="form-required">*</span></label>
                  <select
                    name="branch"
                    value={formData.branch}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-md border-gray-300"
                  >
                    <option value="">Select Branch</option>
                    {branchOptions.filter(opt => opt.value).map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="form-label">Section <span className="form-required">*</span></label>
                  <select
                    name="section"
                    value={formData.section}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-md border-gray-300"
                  >
                    <option value="">Select Section</option>
                    {sectionOptions.filter(opt => opt.value).map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="form-label">Semester <span className="form-required">*</span></label>
                  <select
                    name="semester"
                    value={formData.semester}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-md border-gray-300"
                  >
                    {semesterOptions.filter(opt => opt.value).map(option => (
                      <option key={option.value} value={Number(option.value)}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-outline px-4 py-2 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-4 py-2 rounded-md"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : isEditing ? 'Update Student' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 