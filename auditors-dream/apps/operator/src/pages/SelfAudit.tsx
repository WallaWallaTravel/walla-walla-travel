import { useState } from 'react';

interface AuditChecklist {
  id: string;
  category: string;
  items: AuditItem[];
}

interface AuditItem {
  id: string;
  question: string;
  regulation: string;
  completed: boolean;
  notes?: string;
}

// Sample audit checklist - would come from database in production
const AUDIT_CHECKLISTS: AuditChecklist[] = [
  {
    id: 'driver-files',
    category: 'Driver Qualification Files',
    items: [
      {
        id: 'dq-1',
        question: 'Do all drivers have a valid CDL or appropriate license on file?',
        regulation: '49 CFR 391.23',
        completed: false,
      },
      {
        id: 'dq-2',
        question: 'Are all medical certificates current (within 24 months)?',
        regulation: '49 CFR 391.41',
        completed: false,
      },
      {
        id: 'dq-3',
        question: 'Is there a signed application for employment on file for each driver?',
        regulation: '49 CFR 391.21',
        completed: false,
      },
      {
        id: 'dq-4',
        question: 'Have MVRs been obtained within the past 12 months?',
        regulation: '49 CFR 391.25',
        completed: false,
      },
      {
        id: 'dq-5',
        question: 'Is there a road test certificate on file for each driver?',
        regulation: '49 CFR 391.31',
        completed: false,
      },
    ],
  },
  {
    id: 'vehicle-maintenance',
    category: 'Vehicle Maintenance & Inspections',
    items: [
      {
        id: 'vm-1',
        question: 'Are all vehicles registered and insurance current?',
        regulation: 'State Requirements',
        completed: false,
      },
      {
        id: 'vm-2',
        question: 'Have annual DOT inspections been completed for all vehicles?',
        regulation: '49 CFR 396.17',
        completed: false,
      },
      {
        id: 'vm-3',
        question: 'Are driver vehicle inspection reports (DVIRs) being completed and retained?',
        regulation: '49 CFR 396.11',
        completed: false,
      },
      {
        id: 'vm-4',
        question: 'Is there a preventive maintenance program in place?',
        regulation: '49 CFR 396.3',
        completed: false,
      },
    ],
  },
  {
    id: 'hours-of-service',
    category: 'Hours of Service',
    items: [
      {
        id: 'hos-1',
        question: 'Are drivers operating within the 10-hour driving limit?',
        regulation: '49 CFR 395.5(a)',
        completed: false,
      },
      {
        id: 'hos-2',
        question: 'Are drivers taking required 8-hour off-duty periods?',
        regulation: '49 CFR 395.5(b)',
        completed: false,
      },
      {
        id: 'hos-3',
        question: 'Is the 60/70 hour weekly limit being observed?',
        regulation: '49 CFR 395.5(c)',
        completed: false,
      },
    ],
  },
];

export default function SelfAudit() {
  const [checklists, setChecklists] = useState(AUDIT_CHECKLISTS);
  const [currentSession, setCurrentSession] = useState<string | null>(null);

  // Start new audit session
  const startAudit = () => {
    const sessionId = `audit-${Date.now()}`;
    setCurrentSession(sessionId);
    // Reset all items
    setChecklists(AUDIT_CHECKLISTS.map((cl) => ({
      ...cl,
      items: cl.items.map((item) => ({ ...item, completed: false, notes: undefined })),
    })));
  };

  // Toggle item completion
  const toggleItem = (checklistId: string, itemId: string) => {
    setChecklists((prev) =>
      prev.map((cl) =>
        cl.id === checklistId
          ? {
              ...cl,
              items: cl.items.map((item) =>
                item.id === itemId ? { ...item, completed: !item.completed } : item
              ),
            }
          : cl
      )
    );
  };

  // Calculate progress
  const totalItems = checklists.reduce((acc, cl) => acc + cl.items.length, 0);
  const completedItems = checklists.reduce(
    (acc, cl) => acc + cl.items.filter((item) => item.completed).length,
    0
  );
  const progress = Math.round((completedItems / totalItems) * 100);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Self-Audit Module</h2>
          <p className="text-gray-600 mt-1">
            Conduct internal compliance audits to prepare for inspections
          </p>
        </div>
        {!currentSession ? (
          <button
            onClick={startAudit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start New Audit
          </button>
        ) : (
          <div className="text-right">
            <div className="text-sm text-gray-500">Session active</div>
            <div className="text-lg font-semibold text-blue-600">
              {progress}% Complete
            </div>
          </div>
        )}
      </div>

      {!currentSession ? (
        /* No active session */
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-900">
            Ready to start your compliance audit?
          </h3>
          <p className="text-gray-600 mt-2 max-w-md mx-auto">
            The self-audit module helps you systematically review your compliance
            status before regulatory inspections.
          </p>
          <button
            onClick={startAudit}
            className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Begin Audit
          </button>
        </div>
      ) : (
        /* Active audit session */
        <>
          {/* Progress Bar */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>
                {completedItems} of {totalItems} items reviewed
              </span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Checklists */}
          {checklists.map((checklist) => {
            const sectionComplete = checklist.items.every((item) => item.completed);
            const sectionProgress = checklist.items.filter((item) => item.completed).length;

            return (
              <div key={checklist.id} className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xl ${sectionComplete ? '' : 'grayscale'}`}
                    >
                      {sectionComplete ? '✅' : '📋'}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {checklist.category}
                    </h3>
                  </div>
                  <span className="text-sm text-gray-500">
                    {sectionProgress}/{checklist.items.length}
                  </span>
                </div>
                <div className="divide-y">
                  {checklist.items.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => toggleItem(checklist.id, item.id)}
                        className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <p
                          className={`text-gray-900 ${
                            item.completed ? 'line-through text-gray-400' : ''
                          }`}
                        >
                          {item.question}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {item.regulation}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Complete Button */}
          {progress === 100 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <div className="text-4xl mb-3">🎉</div>
              <h3 className="text-lg font-semibold text-green-800">
                Audit Complete!
              </h3>
              <p className="text-green-700 mt-1">
                You've reviewed all checklist items. Great job staying compliant!
              </p>
              <button
                onClick={() => setCurrentSession(null)}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Finish & Save
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
