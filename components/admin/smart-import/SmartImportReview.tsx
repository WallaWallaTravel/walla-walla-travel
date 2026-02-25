'use client';

import type { SmartImportResult, SmartImportStop } from '@/lib/import/types';

interface SmartImportReviewProps {
  result: SmartImportResult;
  onApply: () => void;
  onDiscard: () => void;
}

function ConfidenceBadge({ value, label }: { value: number; label?: string }) {
  let color = 'bg-red-100 text-red-700';
  let text = 'Low';

  if (value >= 0.8) {
    color = 'bg-green-100 text-green-700';
    text = 'High';
  } else if (value >= 0.6) {
    color = 'bg-amber-100 text-amber-700';
    text = 'Medium';
  }

  const pct = Math.round(value * 100);

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {label ? `${label}: ` : ''}{text} ({pct}%)
    </span>
  );
}

function VenueMatchDisplay({ stop }: { stop: SmartImportStop }) {
  if (!stop.venue_name) return null;

  if (stop.matched_venue_id && stop.match_confidence) {
    const pct = Math.round(stop.match_confidence * 100);
    let color = 'text-green-700';
    if (stop.match_confidence < 0.8) color = 'text-amber-700';

    return (
      <span className={`text-xs ${color}`}>
        {stop.venue_name} → ID {stop.matched_venue_id} ({pct}%)
      </span>
    );
  }

  return (
    <span className="text-xs text-red-600">
      {stop.venue_name} (no match — will need manual selection)
    </span>
  );
}

export default function SmartImportReview({ result, onApply, onDiscard }: SmartImportReviewProps) {
  const { proposal, days, guests, inclusions, extraction_notes, source_files, confidence } = result;

  const hasData = (
    proposal.customer_name ||
    days.length > 0 ||
    guests.length > 0 ||
    inclusions.length > 0
  );

  return (
    <div className="space-y-4">
      {/* Header with overall confidence */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900">Extraction Results</h3>
        <ConfidenceBadge value={confidence} label="Overall" />
      </div>

      {!hasData && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-amber-800 font-medium">No useful data could be extracted.</p>
          {extraction_notes && (
            <p className="text-amber-700 text-sm mt-1">{extraction_notes}</p>
          )}
        </div>
      )}

      {hasData && (
        <div className="space-y-3">
          {/* Customer info */}
          {(proposal.customer_name || proposal.customer_email || proposal.party_size) && (
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <h4 className="text-sm font-bold text-gray-700 mb-2">Customer</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {proposal.customer_name && (
                  <>
                    <span className="text-gray-600">Name</span>
                    <span className="text-gray-900">{proposal.customer_name}</span>
                  </>
                )}
                {proposal.customer_email && (
                  <>
                    <span className="text-gray-600">Email</span>
                    <span className="text-gray-900">{proposal.customer_email}</span>
                  </>
                )}
                {proposal.customer_phone && (
                  <>
                    <span className="text-gray-600">Phone</span>
                    <span className="text-gray-900">{proposal.customer_phone}</span>
                  </>
                )}
                {proposal.customer_company && (
                  <>
                    <span className="text-gray-600">Company</span>
                    <span className="text-gray-900">{proposal.customer_company}</span>
                  </>
                )}
                {proposal.party_size && (
                  <>
                    <span className="text-gray-600">Party Size</span>
                    <span className="text-gray-900">{proposal.party_size}</span>
                  </>
                )}
                {proposal.trip_type && (
                  <>
                    <span className="text-gray-600">Trip Type</span>
                    <span className="text-gray-900 capitalize">{proposal.trip_type.replace(/_/g, ' ')}</span>
                  </>
                )}
                {proposal.start_date && (
                  <>
                    <span className="text-gray-600">Dates</span>
                    <span className="text-gray-900">
                      {proposal.start_date}
                      {proposal.end_date && ` to ${proposal.end_date}`}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Itinerary */}
          {days.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <h4 className="text-sm font-bold text-gray-700 mb-2">
                Itinerary ({days.length} day{days.length !== 1 ? 's' : ''})
              </h4>
              <div className="space-y-2">
                {days.map((day, i) => (
                  <div key={i} className="text-sm">
                    <p className="font-medium text-gray-900">
                      {day.title || `Day ${i + 1}`}
                      {day.date && <span className="text-gray-600 font-normal ml-2">{day.date}</span>}
                    </p>
                    {day.stops.length > 0 && (
                      <ul className="ml-4 mt-1 space-y-1">
                        {day.stops.map((stop, j) => (
                          <li key={j} className="flex items-start gap-2">
                            <span className="text-gray-600 capitalize text-xs mt-0.5 shrink-0">
                              {stop.stop_type.replace(/_/g, ' ')}
                            </span>
                            <div>
                              <span className="text-gray-900">
                                {stop.venue_name || stop.custom_name || '(unnamed stop)'}
                              </span>
                              {stop.scheduled_time && (
                                <span className="text-gray-600 ml-1">at {stop.scheduled_time}</span>
                              )}
                              <div>
                                <VenueMatchDisplay stop={stop} />
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Guests */}
          {guests.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <h4 className="text-sm font-bold text-gray-700 mb-2">
                Guests ({guests.length})
              </h4>
              <div className="space-y-1">
                {guests.map((guest, i) => (
                  <div key={i} className="text-sm flex items-center gap-2">
                    <span className="text-gray-900">{guest.name}</span>
                    {guest.is_primary && (
                      <span className="text-xs px-1.5 py-0.5 bg-brand-light text-brand rounded">Primary</span>
                    )}
                    {guest.email && <span className="text-gray-600">{guest.email}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inclusions */}
          {inclusions.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <h4 className="text-sm font-bold text-gray-700 mb-2">
                Services ({inclusions.length})
              </h4>
              <div className="space-y-1">
                {inclusions.map((incl, i) => (
                  <div key={i} className="text-sm flex items-center justify-between">
                    <span className="text-gray-900">{incl.description}</span>
                    <div className="flex items-center gap-2">
                      {incl.pricing_type && (
                        <span className="text-xs text-gray-600 capitalize">
                          {incl.pricing_type.replace(/_/g, '/')}
                        </span>
                      )}
                      {incl.unit_price !== undefined && (
                        <span className="font-medium text-gray-900">
                          ${incl.unit_price}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes from AI */}
          {extraction_notes && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-bold text-blue-800 mb-1">AI Notes</h4>
              <p className="text-sm text-blue-700">{extraction_notes}</p>
            </div>
          )}

          {/* Source files */}
          {source_files && source_files.length > 0 && (
            <div className="text-xs text-gray-600">
              Sources: {source_files.map(f => `${f.filename} (${f.status})`).join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-2 border-t border-gray-200">
        {hasData && (
          <button
            type="button"
            onClick={onApply}
            className="px-4 py-2.5 bg-brand hover:bg-brand-hover text-white rounded-lg font-medium transition-colors"
          >
            Apply to Form
          </button>
        )}
        <button
          type="button"
          onClick={onDiscard}
          className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
        >
          {hasData ? 'Discard' : 'Try Different Files'}
        </button>
      </div>
    </div>
  );
}
