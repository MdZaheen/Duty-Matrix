'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Subject {
  _id: string;
  code: string;
  name: string;
  semester: number;
  branch: string;
  credits?: number;
}

export default function SubjectsPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    semester: 1,
    branch: '',
    credits: undefined as number | undefined
  });
  const [isEditing, setIsEditing] = useState(false);
  const [currentSubjectId, setCurrentSubjectId] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    branch: '',
    semester: ''
  });

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

  // Fetch subjects on component mount and when filters change
  useEffect(() => {
    fetchSubjects();
  }, [filter]);

  const fetchSubjects = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Build query string from filters
      const queryParams = new URLSearchParams();
      if (filter.branch) queryParams.append('branch', filter.branch);
      if (filter.semester) queryParams.append('semester', filter.semester);
      
      const queryString = queryParams.toString();
      const url = `/api/subjects${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch subjects');
      }
      
      setSubjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilter(prev => ({ ...prev, [name]: value }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'credits') {
      // Handle credits as a number or undefined
      const numValue = value === '' ? undefined : Number(value);
      setFormData(prev => ({ ...prev, [name]: numValue }));
    } else if (name === 'semester') {
      // Handle semester as a number
      setFormData(prev => ({ ...prev, [name]: Number(value) }));
    } else {
      // Handle other fields as strings
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      
      const url = `/api/subjects${isEditing && currentSubjectId ? `/${currentSubjectId}` : ''}`;
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
        throw new Error(data.error || `Failed to ${isEditing ? 'update' : 'create'} subject`);
      }
      
      // Refresh the subject list
      fetchSubjects();
      
      // Close modal and reset form
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (subject: Subject) => {
    setFormData({
      code: subject.code,
      name: subject.name,
      semester: subject.semester,
      branch: subject.branch,
      credits: subject.credits
    });
    setCurrentSubjectId(subject._id);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/subjects/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete subject');
      }
      
      // Refresh the subject list
      fetchSubjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      semester: 1,
      branch: '',
      credits: undefined
    });
    setIsEditing(false);
    setCurrentSubjectId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Subjects</h1>
        <button 
          onClick={openCreateModal}
          className="btn-primary px-4 py-2 rounded-md"
        >
          Add New Subject
        </button>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Subjects Table */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Subject List</h2>
        
        {isLoading && <div className="text-center py-4">Loading...</div>}
        
        {!isLoading && subjects.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            No subjects found. Please add some subjects or adjust your filters.
          </div>
        )}
        
        {!isLoading && subjects.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Branch</th>
                  <th>Semester</th>
                  <th>Credits</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map(subject => (
                  <tr key={subject._id}>
                    <td>{subject.code}</td>
                    <td>{subject.name}</td>
                    <td>{subject.branch}</td>
                    <td>{subject.semester}</td>
                    <td>{subject.credits || '-'}</td>
                    <td>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(subject)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(subject._id)}
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

      {/* Add/Edit Subject Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {isEditing ? 'Edit Subject' : 'Add New Subject'}
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
                  <label className="form-label">Subject Code <span className="form-required">*</span></label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-md border-gray-300"
                    placeholder="e.g., CS101"
                  />
                </div>
                
                <div>
                  <label className="form-label">Subject Name <span className="form-required">*</span></label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-md border-gray-300"
                    placeholder="e.g., Introduction to Programming"
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
                  <label className="form-label">Credits</label>
                  <input
                    type="number"
                    name="credits"
                    value={formData.credits === undefined ? '' : formData.credits}
                    onChange={handleInputChange}
                    min="1"
                    max="10"
                    className="w-full rounded-md border-gray-300"
                    placeholder="e.g., 4"
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
                  {isLoading ? 'Saving...' : isEditing ? 'Update Subject' : 'Add Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 