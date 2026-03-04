'use client';

import { useState, useEffect, use } from 'react';
import { useToast } from '@/lib/hooks/useToast';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { useProposalData } from '@/hooks/use-proposal-data';
import { useProposalActions } from '@/hooks/use-proposal-actions';
import { useGuestManagement } from '@/hooks/use-guest-management';
import { useProposalItinerary } from '@/hooks/use-proposal-itinerary';
import { useBilling } from '@/hooks/use-billing';
import { useNotes } from '@/hooks/use-notes';
import {
  OverviewTab,
  DaysStopsTab,
  GuestsTab,
  PricingTab,
  BillingTab,
  NotesTab,
  SendProposalModal,
  DeleteConfirmModal,
  ProposalHeader,
  ProposalSidebar,
} from './components';

type TabKey = 'overview' | 'days' | 'guests' | 'pricing' | 'billing' | 'notes';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: '📋 Overview' },
  { key: 'days', label: '📅 Days & Stops' },
  { key: 'guests', label: '👥 Guests' },
  { key: 'pricing', label: '💰 Pricing' },
  { key: 'billing', label: '💳 Billing' },
  { key: 'notes', label: '💬 Notes' },
];

export default function EditTripProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toasts, toast, dismissToast } = useToast();

  // --- UI state ---
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [showSendModal, setShowSendModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [localLunchOrders, setLocalLunchOrders] = useState<Array<{ id: number; ordering_mode: string; day?: { day_number: number; title: string | null }; supplier?: { name: string } }>>([]);

  // --- Data layer ---
  const {
    proposal, setProposal, wineries, restaurants, hotels,
    lunchOrders, reminderHistory, loading,
    refetchProposal, loadReminderHistory, setReminderHistory,
  } = useProposalData(id, activeTab);

  useEffect(() => {
    if (lunchOrders.length > 0 && localLunchOrders.length === 0) setLocalLunchOrders(lunchOrders);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lunchOrders]);

  // --- Hooks ---
  const {
    actionLoading, updateProposal, updateProposalDebounced, updateStatus,
    recalculatePricing, convertToBooking, generateItinerary,
    sendProposal: sendProposalAction, archiveProposal: archiveAction,
    unarchiveProposal: unarchiveAction, deleteProposal: deleteAction,
    updatePlanningPhase, updateLunchOrderingMode,
  } = useProposalActions(id, proposal, setProposal, refetchProposal, toast);

  const {
    guestLoading, addGuest: addGuestAction,
    updateGuestField: updateGuestFieldAction, updateGuestSettings,
    approveGuest, rejectGuest, deleteGuest: deleteGuestAction,
  } = useGuestManagement(id, proposal, setProposal, refetchProposal, toast);

  const {
    itineraryLoading, addDay, addStop, updateStop, updateStopDebounced,
    deleteStop, updateVendorField, logVendorInteraction,
  } = useProposalItinerary(id, proposal, setProposal, refetchProposal, toast);

  const {
    billingLoading, updateInclusionTaxable, updateInclusionTaxIncluded,
    recalculateBilling, verifyBilling, updateGuestSponsored, updateGuestOverride,
    recordPayment, createPaymentGroup, pauseResumeReminders,
    generateReminderSchedule, cancelReminder, addCustomReminder,
  } = useBilling(id, refetchProposal, loadReminderHistory, setReminderHistory, toast);

  const { notes, notesLoading, newNote, setNewNote, loadNotes, sendNote } = useNotes(id, toast);

  useEffect(() => {
    if (activeTab === 'notes' && proposal) loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, proposal?.id]);

  const saving = Object.values(actionLoading).some(Boolean) ||
    Object.values(guestLoading).some(Boolean) ||
    Object.values(itineraryLoading).some(Boolean) ||
    Object.values(billingLoading).some(Boolean);

  // --- Page-level handlers ---
  const handleSendProposal = async (customMessage: string) => {
    await sendProposalAction(customMessage);
    setShowSendModal(false);
  };

  const handleArchive = async () => { await archiveAction(); setShowMoreMenu(false); };
  const handleDelete = async () => { await deleteAction(); setShowDeleteConfirm(false); setShowMoreMenu(false); };
  const handleConvertToBooking = async () => {
    if (!confirm('Convert this trip proposal to a booking?')) return;
    await convertToBooking();
  };
  const handleUpdateLunchOrderingMode = async (orderId: number, mode: string) => {
    const success = await updateLunchOrderingMode(orderId, mode);
    if (success) setLocalLunchOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ordering_mode: mode } : o)));
  };

  // --- Loading / not found ---
  // Only show full-page loading on initial load (no data yet).
  // During refetches (after add stop, add day, etc.), keep showing
  // existing content to avoid a jarring flash.
  if (loading && !proposal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading trip proposal...</p>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-gray-600">Trip proposal not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <SendProposalModal
        show={showSendModal}
        onClose={() => setShowSendModal(false)}
        onSend={handleSendProposal}
        proposalNumber={proposal.proposal_number}
        customerEmail={proposal.customer_email}
        total={proposal.total}
        sending={actionLoading['sendProposal'] || false}
      />
      <DeleteConfirmModal
        show={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        proposalNumber={proposal.proposal_number}
        loading={saving}
      />

      <div className="max-w-7xl mx-auto">
        <ProposalHeader
          proposal={proposal}
          saving={saving}
          showMoreMenu={showMoreMenu}
          setShowMoreMenu={setShowMoreMenu}
          onSendClick={() => setShowSendModal(true)}
          onArchive={handleArchive}
          onUnarchive={unarchiveAction}
          onDeleteClick={() => { setShowMoreMenu(false); setShowDeleteConfirm(true); }}
          onGenerateItinerary={generateItinerary}
          onConvertToBooking={handleConvertToBooking}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-md">
              <div className="flex border-b border-gray-200">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
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
                {activeTab === 'overview' && (
                  <OverviewTab proposal={proposal} updateProposal={updateProposal} updateProposalDebounced={updateProposalDebounced} updateStatus={updateStatus} saving={saving} />
                )}
                {activeTab === 'days' && (
                  <DaysStopsTab proposal={proposal} wineries={wineries} restaurants={restaurants} hotels={hotels} addDay={addDay} addStop={addStop} updateStop={updateStop} updateStopDebounced={updateStopDebounced} deleteStop={deleteStop} updateVendorField={updateVendorField} logVendorInteraction={logVendorInteraction} setProposal={setProposal} refetchProposal={refetchProposal} saving={saving} />
                )}
                {activeTab === 'guests' && (
                  <GuestsTab proposal={proposal} addGuest={addGuestAction} updateGuestField={updateGuestFieldAction} updateGuestSettings={updateGuestSettings} approveGuest={approveGuest} rejectGuest={rejectGuest} deleteGuest={deleteGuestAction} saving={saving} toast={toast} />
                )}
                {activeTab === 'pricing' && (
                  <PricingTab proposal={proposal} updateProposal={updateProposal} updateProposalDebounced={updateProposalDebounced} recalculatePricing={recalculatePricing} updateInclusionTaxable={updateInclusionTaxable} updateInclusionTaxIncluded={updateInclusionTaxIncluded} saving={saving} />
                )}
                {activeTab === 'billing' && (
                  <BillingTab proposal={proposal} updateProposal={updateProposal} recalculateBilling={recalculateBilling} verifyBilling={verifyBilling} updateGuestSponsored={updateGuestSponsored} updateGuestOverride={updateGuestOverride} recordPayment={recordPayment} createPaymentGroup={createPaymentGroup} pauseResumeReminders={pauseResumeReminders} generateReminderSchedule={generateReminderSchedule} cancelReminder={cancelReminder} addCustomReminder={addCustomReminder} reminderHistory={reminderHistory} loadReminderHistory={loadReminderHistory} saving={saving} toast={toast} />
                )}
                {activeTab === 'notes' && (
                  <NotesTab notes={notes} notesLoading={notesLoading} newNote={newNote} setNewNote={setNewNote} loadNotes={loadNotes} sendNote={sendNote} />
                )}
              </div>
            </div>
          </div>

          <ProposalSidebar
            proposal={proposal}
            saving={saving}
            localLunchOrders={localLunchOrders}
            updateProposal={updateProposal}
            updatePlanningPhase={updatePlanningPhase}
            onUpdateLunchOrderingMode={handleUpdateLunchOrderingMode}
            toast={toast}
          />
        </div>
      </div>
    </div>
  );
}
