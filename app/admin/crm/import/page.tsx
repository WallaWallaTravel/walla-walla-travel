'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';

// ============================================================================
// Types
// ============================================================================

interface ImportSource {
  id: string;
  name: string;
  description: string;
  expected_columns: string[];
}

interface PreviewData {
  source_detected: string;
  headers: string[];
  total_rows: number;
  valid_rows: number;
  errors: Array<{ row: number; field: string; message: string; value?: string }>;
  total_errors: number;
  duplicates: Array<{ row: number; email: string; existing_id: number; existing_name: string }>;
  total_duplicates: number;
  sample_data: Array<{ email: string; name: string; phone?: string; company?: string }>;
  field_mapping: Record<string, string>;
}

interface ImportResult {
  total_rows: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; field: string; message: string }>;
  duplicates_found: number;
}

interface MigrationStatus {
  total_customers: number;
  already_migrated: number;
  needs_migration: number;
  unlinked_crm_contacts: number;
  ready_to_migrate: boolean;
}

// ============================================================================
// Component
// ============================================================================

export default function CrmImportPage() {
  // State
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicateAction, setDuplicateAction] = useState<'skip' | 'update' | 'merge'>('skip');
  const [sourceOverride, setSourceOverride] = useState<string>('');

  // Migration state
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{
    migrated: number;
    already_exists: number;
    errors: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Available sources (would normally fetch from API)
  const sources: ImportSource[] = [
    { id: 'square', name: 'Square', description: 'Square Customer export', expected_columns: ['Email Address', 'Customer Name'] },
    { id: 'stripe', name: 'Stripe', description: 'Stripe Customer export', expected_columns: ['email', 'name'] },
    { id: 'quickbooks', name: 'QuickBooks', description: 'QuickBooks Customer export', expected_columns: ['Email', 'Display Name'] },
    { id: 'generic', name: 'Generic CSV', description: 'Any CSV with email and name', expected_columns: ['email', 'name'] },
  ];

  // ============================================================================
  // File Handling
  // ============================================================================

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.type === 'text/csv')) {
      setFile(droppedFile);
      setPreview(null);
      setImportResult(null);
      setError(null);
    } else {
      setError('Please upload a CSV file');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(null);
      setImportResult(null);
      setError(null);
    }
  }, []);

  // ============================================================================
  // Preview & Import
  // ============================================================================

  const handlePreview = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', 'preview');
      if (sourceOverride) {
        formData.append('source', sourceOverride);
      }

      const response = await fetch('/api/admin/crm/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setPreview(data.data);
      } else {
        setError(data.error || 'Failed to preview file');
      }
    } catch (_err) {
      setError('Failed to process file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', 'import');
      formData.append('duplicate_action', duplicateAction);
      if (sourceOverride) {
        formData.append('source', sourceOverride);
      }

      const response = await fetch('/api/admin/crm/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setImportResult(data.data);
        setPreview(null);
      } else {
        setError(data.error || 'Import failed');
      }
    } catch (_err) {
      setError('Import failed');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // Migration
  // ============================================================================

  const checkMigrationStatus = async () => {
    try {
      const response = await fetch('/api/admin/crm/migrate');
      const data = await response.json();
      if (data.success) {
        setMigrationStatus(data.data);
      }
    } catch (_err) {
      // Migration status check is non-critical - silently fail
    }
  };

  const handleMigrate = async () => {
    setIsMigrating(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/crm/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: false }),
      });

      const data = await response.json();

      if (data.success) {
        setMigrationResult(data.data);
        checkMigrationStatus(); // Refresh status
      } else {
        setError(data.error || 'Migration failed');
      }
    } catch (_err) {
      setError('Migration failed');
    } finally {
      setIsMigrating(false);
    }
  };

  // Check migration status on mount
  useState(() => {
    checkMigrationStatus();
  });

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <Link href="/admin/crm" className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-block">
          ← Back to CRM
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Import Customers to CRM</h1>
        <p className="text-gray-600 mt-1">
          Import customer data from Square, Stripe, QuickBooks, or any CSV file.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Existing Customer Migration Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">Migrate Existing Customers</h2>
        <p className="text-blue-700 text-sm mb-4">
          Sync your existing customers to CRM contacts with their booking history.
        </p>

        {migrationStatus && (
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded p-3">
              <div className="text-2xl font-bold text-gray-900">{migrationStatus.total_customers}</div>
              <div className="text-sm text-gray-600">Total Customers</div>
            </div>
            <div className="bg-white rounded p-3">
              <div className="text-2xl font-bold text-green-600">{migrationStatus.already_migrated}</div>
              <div className="text-sm text-gray-600">Already in CRM</div>
            </div>
            <div className="bg-white rounded p-3">
              <div className="text-2xl font-bold text-blue-600">{migrationStatus.needs_migration}</div>
              <div className="text-sm text-gray-600">Needs Migration</div>
            </div>
          </div>
        )}

        {migrationResult && (
          <div className="bg-green-100 rounded p-4 mb-4">
            <div className="font-medium text-green-800">Migration Complete!</div>
            <div className="text-sm text-green-700">
              {migrationResult.migrated} migrated, {migrationResult.already_exists} already existed, {migrationResult.errors} errors
            </div>
          </div>
        )}

        <button
          onClick={handleMigrate}
          disabled={isMigrating || (migrationStatus?.needs_migration === 0)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isMigrating ? 'Migrating...' : 'Sync Customers to CRM'}
        </button>
      </div>

      {/* File Upload Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Import from File</h2>

        {/* Source Override */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data Source (auto-detected if not specified)
          </label>
          <select
            value={sourceOverride}
            onChange={(e) => setSourceOverride(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">Auto-detect</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name} - {source.description}
              </option>
            ))}
          </select>
        </div>

        {/* Drag & Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : file
              ? 'border-green-500 bg-green-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />

          {file ? (
            <div>
              <div className="text-green-600 text-lg font-medium">{file.name}</div>
              <div className="text-gray-600 text-sm mt-1">
                {(file.size / 1024).toFixed(1)} KB
              </div>
              <div className="text-gray-600 text-sm mt-2">Click or drag to replace</div>
            </div>
          ) : (
            <div>
              <div className="text-gray-600 text-lg">
                Drag and drop a CSV file here, or click to browse
              </div>
              <div className="text-gray-500 text-sm mt-2">
                Supports Square, Stripe, QuickBooks exports
              </div>
            </div>
          )}
        </div>

        {/* Preview Button */}
        {file && !preview && !importResult && (
          <button
            onClick={handlePreview}
            disabled={isLoading}
            className="mt-4 w-full bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 disabled:bg-gray-400"
          >
            {isLoading ? 'Processing...' : 'Preview Import'}
          </button>
        )}
      </div>

      {/* Preview Results */}
      {preview && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Preview</h2>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded p-3">
              <div className="text-xl font-bold text-gray-900">{preview.total_rows}</div>
              <div className="text-sm text-gray-600">Total Rows</div>
            </div>
            <div className="bg-green-50 rounded p-3">
              <div className="text-xl font-bold text-green-600">{preview.valid_rows}</div>
              <div className="text-sm text-gray-600">Valid</div>
            </div>
            <div className="bg-yellow-50 rounded p-3">
              <div className="text-xl font-bold text-yellow-600">{preview.total_duplicates}</div>
              <div className="text-sm text-gray-600">Duplicates</div>
            </div>
            <div className="bg-red-50 rounded p-3">
              <div className="text-xl font-bold text-red-600">{preview.total_errors}</div>
              <div className="text-sm text-gray-600">Errors</div>
            </div>
          </div>

          {/* Detected Source */}
          <div className="mb-4 text-sm text-gray-700">
            <span className="font-medium">Detected Source:</span> {preview.source_detected}
          </div>

          {/* Sample Data */}
          {preview.sample_data.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Sample Data (first 5 rows)</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Phone</th>
                      <th className="px-3 py-2 text-left">Company</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sample_data.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{row.email}</td>
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="px-3 py-2">{row.phone || '-'}</td>
                        <td className="px-3 py-2">{row.company || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Errors */}
          {preview.errors.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-red-700 mb-2">
                Validation Errors ({preview.total_errors})
              </h3>
              <div className="bg-red-50 rounded p-3 max-h-40 overflow-y-auto">
                {preview.errors.slice(0, 10).map((err, i) => (
                  <div key={i} className="text-sm text-red-700">
                    Row {err.row}: {err.field} - {err.message}
                    {err.value && <span className="text-red-500"> (value: {err.value})</span>}
                  </div>
                ))}
                {preview.total_errors > 10 && (
                  <div className="text-sm text-red-600 font-medium mt-2">
                    ...and {preview.total_errors - 10} more errors
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Duplicates */}
          {preview.duplicates.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-yellow-700 mb-2">
                Duplicate Contacts ({preview.total_duplicates})
              </h3>
              <div className="bg-yellow-50 rounded p-3 max-h-40 overflow-y-auto mb-4">
                {preview.duplicates.slice(0, 5).map((dup, i) => (
                  <div key={i} className="text-sm text-yellow-700">
                    Row {dup.row}: {dup.email} already exists as &ldquo;{dup.existing_name}&rdquo;
                  </div>
                ))}
                {preview.total_duplicates > 5 && (
                  <div className="text-sm text-yellow-600 font-medium mt-2">
                    ...and {preview.total_duplicates - 5} more duplicates
                  </div>
                )}
              </div>

              {/* Duplicate Action */}
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How to handle duplicates?
              </label>
              <select
                value={duplicateAction}
                onChange={(e) => setDuplicateAction(e.target.value as 'skip' | 'update' | 'merge')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="skip">Skip - Keep existing contacts unchanged</option>
                <option value="update">Update - Replace existing with new data</option>
                <option value="merge">Merge - Combine data (append notes, keep highest values)</option>
              </select>
            </div>
          )}

          {/* Import Button */}
          <div className="flex gap-4">
            <button
              onClick={() => {
                setPreview(null);
                setFile(null);
              }}
              className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={isLoading || preview.valid_rows === 0}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              {isLoading ? 'Importing...' : `Import ${preview.valid_rows} Contacts`}
            </button>
          </div>
        </div>
      )}

      {/* Import Results */}
      {importResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-green-900 mb-4">Import Complete!</h2>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded p-3">
              <div className="text-xl font-bold text-gray-900">{importResult.total_rows}</div>
              <div className="text-sm text-gray-600">Total Rows</div>
            </div>
            <div className="bg-green-100 rounded p-3">
              <div className="text-xl font-bold text-green-600">{importResult.imported}</div>
              <div className="text-sm text-gray-600">Imported</div>
            </div>
            <div className="bg-blue-100 rounded p-3">
              <div className="text-xl font-bold text-blue-600">{importResult.updated}</div>
              <div className="text-sm text-gray-600">Updated</div>
            </div>
            <div className="bg-gray-100 rounded p-3">
              <div className="text-xl font-bold text-gray-600">{importResult.skipped}</div>
              <div className="text-sm text-gray-600">Skipped</div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => {
                setImportResult(null);
                setFile(null);
              }}
              className="flex-1 border border-green-300 text-green-700 px-4 py-2 rounded-lg hover:bg-green-100"
            >
              Import More
            </button>
            <Link
              href="/admin/crm/contacts"
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-center"
            >
              View Contacts
            </Link>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="mt-8 text-sm text-gray-600">
        <h3 className="font-medium text-gray-900 mb-2">Tips for importing</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Make sure your CSV has headers in the first row</li>
          <li>Email column is required; name will use email prefix if missing</li>
          <li>Phone and company columns are optional</li>
          <li>The system will auto-detect Square, Stripe, and QuickBooks formats</li>
          <li>For other formats, ensure you have &ldquo;email&rdquo; and &ldquo;name&rdquo; columns</li>
        </ul>
      </div>
    </div>
  );
}
