'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import type {
  PipelineTemplate,
  PipelineStageSummary,
  CrmDealWithRelations,
  DealType,
  Brand,
} from '@/types/crm';

interface PipelineData {
  templates: PipelineTemplate[];
  stages: PipelineStageSummary[];
  deals: CrmDealWithRelations[];
  dealTypes: DealType[];
  summary: {
    totalValue: number;
    weightedValue: number;
    dealCount: number;
  };
}

const BRAND_LABELS: Record<Brand, string> = {
  nw_touring: 'NW Touring',
  walla_walla_travel: 'Walla Walla Travel',
};

const STAGE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  slate: { bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-700' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-700' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-300', text: 'text-violet-700' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700' },
  green: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700' },
  red: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700' },
};

export default function PipelinePage() {
  const [data, setData] = useState<PipelineData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState<Brand | 'all'>('all');
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [showNewDealModal, setShowNewDealModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<CrmDealWithRelations | null>(null);

  const fetchPipeline = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedTemplateId) params.set('template_id', String(selectedTemplateId));
      else if (selectedBrand !== 'all') params.set('brand', selectedBrand);

      const response = await fetch(`/api/admin/crm/pipeline?${params.toString()}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      logger.error('Failed to fetch pipeline', { error });
    } finally {
      setIsLoading(false);
    }
  }, [selectedBrand, selectedTemplateId]);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  const handleStageDrop = async (dealId: number, newStageId: number) => {
    try {
      const response = await fetch(`/api/admin/crm/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage_id: newStageId }),
      });
      if (response.ok) {
        fetchPipeline();
      }
    } catch (error) {
      logger.error('Failed to update deal stage', { error });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-48 mb-4"></div>
          <div className="flex gap-4 overflow-x-auto">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-72 flex-shrink-0 h-96 bg-slate-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <p className="text-slate-600">Failed to load pipeline</p>
          <button onClick={fetchPipeline} className="mt-4 text-[#8B1538] hover:underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { templates, stages, deals, summary } = data;

  // Get unique template IDs from stages
  const activeTemplateId = selectedTemplateId || (stages.length > 0 ? stages[0].template_id : null);
  const visibleStages = activeTemplateId
    ? stages.filter(s => s.template_id === activeTemplateId && !s.is_won && !s.is_lost)
    : stages.filter(s => !s.is_won && !s.is_lost);

  // Group deals by stage
  const dealsByStage = deals.reduce((acc, deal) => {
    if (!acc[deal.stage_id]) acc[deal.stage_id] = [];
    acc[deal.stage_id].push(deal);
    return acc;
  }, {} as Record<number, CrmDealWithRelations[]>);

  return (
    <div className="p-6 lg:p-8 h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
            <Link href="/admin/crm" className="hover:text-[#8B1538]">CRM</Link>
            <span>/</span>
            <span>Pipeline</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Pipeline Board</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-slate-500">Pipeline Value</div>
            <div className="text-xl font-bold text-slate-900">{formatCurrency(summary.totalValue)}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-500">Weighted Value</div>
            <div className="text-xl font-bold text-green-600">{formatCurrency(summary.weightedValue)}</div>
          </div>
          <button
            onClick={() => setShowNewDealModal(true)}
            className="px-4 py-2 bg-[#8B1538] hover:bg-[#722F37] text-white rounded-lg font-medium"
          >
            + New Deal
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Pipeline</label>
          <select
            value={selectedTemplateId || ''}
            onChange={(e) => setSelectedTemplateId(e.target.value ? parseInt(e.target.value) : null)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B1538] outline-none"
          >
            <option value="">All Pipelines</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.brand && `(${BRAND_LABELS[t.brand as Brand]})`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Brand</label>
          <select
            value={selectedBrand}
            onChange={(e) => {
              setSelectedBrand(e.target.value as Brand | 'all');
              setSelectedTemplateId(null);
            }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B1538] outline-none"
          >
            <option value="all">All Brands</option>
            <option value="nw_touring">NW Touring</option>
            <option value="walla_walla_travel">Walla Walla Travel</option>
          </select>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 h-full min-w-max">
          {visibleStages.map((stage) => {
            const stageDeals = dealsByStage[stage.id] || [];
            const colors = STAGE_COLORS[stage.color] || STAGE_COLORS.slate;

            return (
              <div
                key={stage.id}
                className={`w-72 flex-shrink-0 rounded-xl border ${colors.border} ${colors.bg} flex flex-col`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const dealId = parseInt(e.dataTransfer.getData('dealId'));
                  if (dealId) handleStageDrop(dealId, stage.id);
                }}
              >
                {/* Stage Header */}
                <div className="p-4 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-semibold ${colors.text}`}>{stage.name}</h3>
                    <span className="px-2 py-0.5 bg-white/50 rounded-full text-xs font-medium">
                      {stage.deal_count}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    {formatCurrency(Number(stage.total_value))}
                  </div>
                </div>

                {/* Stage Deals */}
                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                  {stageDeals.length === 0 ? (
                    <div className="text-center py-8 text-sm text-slate-400">
                      No deals
                    </div>
                  ) : (
                    stageDeals.map((deal) => (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('dealId', String(deal.id))}
                        onClick={() => setSelectedDeal(deal)}
                        className="bg-white rounded-lg border border-slate-200 p-3 cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <div className="font-medium text-slate-900 text-sm truncate">{deal.title}</div>
                        <div className="text-xs text-slate-600 mt-1 truncate">{deal.contact_name}</div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-semibold text-slate-900">
                            {deal.estimated_value ? formatCurrency(deal.estimated_value) : '-'}
                          </span>
                          {deal.expected_close_date && (
                            <span className="text-xs text-slate-500">
                              {formatDate(deal.expected_close_date)}
                            </span>
                          )}
                        </div>
                        {deal.deal_type_name && (
                          <div className="mt-2">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                              {deal.deal_type_name}
                            </span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}

          {/* Won/Lost Summary Columns */}
          {stages.filter(s => s.template_id === activeTemplateId && (s.is_won || s.is_lost)).map((stage) => {
            const colors = STAGE_COLORS[stage.color] || STAGE_COLORS.slate;
            return (
              <div
                key={stage.id}
                className={`w-48 flex-shrink-0 rounded-xl border ${colors.border} ${colors.bg} opacity-75`}
              >
                <div className="p-4">
                  <h3 className={`font-semibold ${colors.text}`}>{stage.name}</h3>
                  <div className="text-2xl font-bold mt-2">{stage.deal_count}</div>
                  <div className="text-sm text-slate-600">
                    {formatCurrency(Number(stage.total_value))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Deal Detail Modal */}
      {selectedDeal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg m-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{selectedDeal.title}</h2>
              <button
                onClick={() => setSelectedDeal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500">Contact</label>
                  <div className="font-medium text-slate-900">{selectedDeal.contact_name}</div>
                  <div className="text-sm text-slate-600">{selectedDeal.contact_email}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Value</label>
                  <div className="text-xl font-bold text-slate-900">
                    {selectedDeal.estimated_value ? formatCurrency(selectedDeal.estimated_value) : '-'}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Stage</label>
                  <div className="font-medium text-slate-900">{selectedDeal.stage_name}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Type</label>
                  <div className="font-medium text-slate-900">{selectedDeal.deal_type_name || '-'}</div>
                </div>
                {selectedDeal.expected_tour_date && (
                  <div>
                    <label className="text-xs font-medium text-slate-500">Tour Date</label>
                    <div className="font-medium text-slate-900">
                      {new Date(selectedDeal.expected_tour_date).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {selectedDeal.party_size && (
                  <div>
                    <label className="text-xs font-medium text-slate-500">Party Size</label>
                    <div className="font-medium text-slate-900">{selectedDeal.party_size} guests</div>
                  </div>
                )}
              </div>
              {selectedDeal.description && (
                <div>
                  <label className="text-xs font-medium text-slate-500">Description</label>
                  <div className="text-slate-700 mt-1">{selectedDeal.description}</div>
                </div>
              )}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <Link
                  href={`/admin/crm/contacts/${selectedDeal.contact_id}`}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-center"
                >
                  View Contact
                </Link>
                <button
                  onClick={async () => {
                    if (confirm('Mark this deal as won?')) {
                      await fetch(`/api/admin/crm/deals/${selectedDeal.id}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'win' }),
                      });
                      setSelectedDeal(null);
                      fetchPipeline();
                    }
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  Mark Won
                </button>
                <button
                  onClick={async () => {
                    const reason = prompt('Why was this deal lost?');
                    if (reason !== null) {
                      await fetch(`/api/admin/crm/deals/${selectedDeal.id}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'lose', lost_reason: reason }),
                      });
                      setSelectedDeal(null);
                      fetchPipeline();
                    }
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                >
                  Mark Lost
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Deal Modal Placeholder */}
      {showNewDealModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md m-4">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Create New Deal</h2>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-4">
                To create a deal, first select a contact from the contacts list.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNewDealModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <Link
                  href="/admin/crm/contacts"
                  className="flex-1 px-4 py-2 bg-[#8B1538] hover:bg-[#722F37] text-white rounded-lg text-center"
                >
                  Go to Contacts
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
