'use client';

import Link from 'next/link';
import { ToastContainer } from '@/components/ui/ToastContainer';
import SmartImportUploader from '@/components/admin/smart-import/SmartImportUploader';
import SmartImportReview from '@/components/admin/smart-import/SmartImportReview';

import { useProposalForm } from '@/components/trip-proposals/useProposalForm';
import DetailsTab from '@/components/trip-proposals/DetailsTab';
import DaysTab from '@/components/trip-proposals/DaysTab';
import GuestsTab from '@/components/trip-proposals/GuestsTab';
import PricingTab from '@/components/trip-proposals/PricingTab';
import PricingSummary from '@/components/trip-proposals/PricingSummary';

export default function NewTripProposalPage() {
  const {
    formData,
    setFormData,
    brands,
    wineries,
    restaurants,
    hotels,
    savedMenus,
    saving,
    activeTab,
    setActiveTab,
    importOpen,
    setImportOpen,
    importResult,
    setImportResult,
    totals,
    toasts,
    toast,
    dismissToast,
    addStop,
    updateStop,
    removeStop,
    addGuest,
    updateGuest,
    removeGuest,
    addServiceFromTemplate,
    updateInclusion,
    removeInclusion,
    applyImportResult,
    saveDraft,
    handleSubmit,
  } = useProposalForm();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/trip-proposals"
            className="inline-flex items-center text-brand hover:text-brand-hover font-bold mb-4"
          >
            ← Back to Trip Proposals
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🗺️ Create Trip Proposal</h1>
          <p className="text-gray-600">Build a comprehensive multi-day trip experience</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Form */}
            <div className="lg:col-span-2 space-y-6">

              {/* Smart Import Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <button
                  type="button"
                  onClick={() => setImportOpen(!importOpen)}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors rounded-xl"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="font-medium text-gray-900">Import from files</span>
                    <span className="text-xs text-gray-500 ml-1">PDF, Word, Excel, CSV, images</span>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${importOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {importOpen && (
                  <div className="px-5 pb-5 border-t border-gray-100">
                    <p className="text-sm text-gray-600 mt-3 mb-4">
                      Upload trip details (itineraries, guest lists, screenshots) and AI will extract the data to pre-fill the form. You always review before saving.
                    </p>
                    {!importResult ? (
                      <SmartImportUploader
                        onResult={(result) => setImportResult(result)}
                        onError={(message) => toast(message, 'error')}
                      />
                    ) : (
                      <SmartImportReview
                        result={importResult}
                        onApply={applyImportResult}
                        onDiscard={() => setImportResult(null)}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div className="bg-white rounded-xl shadow-md">
                <div className="flex border-b border-gray-200">
                  {[
                    { key: 'details', label: '👤 Details' },
                    { key: 'days', label: '📅 Days & Stops' },
                    { key: 'guests', label: '👥 Guests' },
                    { key: 'pricing', label: '💰 Pricing' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key as typeof activeTab)}
                      className={`flex-1 px-4 py-3 text-sm font-bold transition-colors ${
                        activeTab === tab.key
                          ? 'text-brand border-b-2 border-brand bg-brand-light'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="p-6">
                  {activeTab === 'details' && (
                    <DetailsTab formData={formData} setFormData={setFormData} brands={brands} />
                  )}
                  {activeTab === 'days' && (
                    <DaysTab
                      formData={formData}
                      setFormData={setFormData}
                      wineries={wineries}
                      restaurants={restaurants}
                      hotels={hotels}
                      savedMenus={savedMenus}
                      onAddStop={addStop}
                      onUpdateStop={updateStop}
                      onRemoveStop={removeStop}
                    />
                  )}
                  {activeTab === 'guests' && (
                    <GuestsTab
                      guests={formData.guests}
                      onAddGuest={addGuest}
                      onUpdateGuest={updateGuest}
                      onRemoveGuest={removeGuest}
                    />
                  )}
                  {activeTab === 'pricing' && (
                    <PricingTab
                      formData={formData}
                      setFormData={setFormData}
                      onAddServiceFromTemplate={addServiceFromTemplate}
                      onUpdateInclusion={updateInclusion}
                      onRemoveInclusion={removeInclusion}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Pricing Summary */}
            <div className="lg:col-span-1">
              <PricingSummary
                formData={formData}
                totals={totals}
                saving={saving}
                onSaveDraft={saveDraft}
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
