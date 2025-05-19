'use client';

import { useState } from 'react';

export default function FixProfessorEmailsPage() {
  const [isFixing, setIsFixing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFixEmails = async () => {
    if (!confirm('This will modify duplicate email addresses in the database. Continue?')) {
      return;
    }
    
    try {
      setIsFixing(true);
      setError(null);
      setResult(null);
      
      const response = await fetch('/api/admin/fix-professor-emails', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fix professor emails');
      }
      
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fix Professor Emails</h1>
          <p className="mt-1 text-gray-600">
            This utility will fix duplicate email addresses in the database
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-md text-red-600 border border-red-200">
          <p className="font-medium">Error</p>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-green-50 p-4 rounded-md text-green-600 border border-green-200">
          <p className="font-medium">Success</p>
          <p>{result.message}</p>
          {result.details && (
            <div className="mt-2 text-sm">
              <p>Fixed {result.details.fixedCount} duplicate emails</p>
              <p>Normalized {result.details.normalizedCount} emails</p>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <p className="mb-4 text-gray-600">
          This tool will:
        </p>
        <ul className="list-disc pl-5 mb-6 text-gray-600">
          <li>Find professors with duplicate email addresses</li>
          <li>Add a unique suffix to make duplicate emails unique</li>
          <li>Normalize all emails (lowercase, trim whitespace)</li>
          <li>Rebuild the database indexes for email uniqueness</li>
        </ul>
        
        <div className="flex justify-end">
          <button
            onClick={handleFixEmails}
            disabled={isFixing}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-gray-400"
          >
            {isFixing ? 'Fixing Emails...' : 'Fix Duplicate Emails'}
          </button>
        </div>
      </div>
    </div>
  );
} 