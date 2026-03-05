'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

const PRIORITY_COLORS: Record<string, { badge: string }> = {
  low: { badge: 'bg-slate-100 text-slate-700' },
  normal: { badge: 'bg-blue-100 text-blue-700' },
  high: { badge: 'bg-amber-100 text-amber-700' },
  urgent: { badge: 'bg-red-100 text-red-700' },
};

export interface TaskCardData {
  id: number;
  title: string;
  due_date: string;
  priority: string;
  contact_id?: number | null;
  contact_name?: string | null;
  deal_id?: number | null;
  deal_title?: string | null;
  deal_proposal_id?: number | null;
}

interface TaskCardProps {
  task: TaskCardData;
  dueLabel: ReactNode;
  actions?: ReactNode;
}

/**
 * Shared TaskCard component for consistent task display across the admin portal.
 *
 * Enforces: title (linked to entity), entity context (contact + deal),
 * due date, priority badge, and action buttons.
 *
 * Usage: Today's Priorities, CRM Tasks page, CRM Dashboard, Contact detail.
 */
export function TaskCard({ task, dueLabel, actions }: TaskCardProps) {
  const entityLink = getEntityLink(task);
  const priorityStyle = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.normal;

  return (
    <div className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
      <div className="flex-1 min-w-0">
        {entityLink ? (
          <Link
            href={entityLink}
            className="text-sm font-medium text-slate-900 hover:text-[#8B1538] hover:underline truncate block"
          >
            {task.title}
          </Link>
        ) : (
          <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
        )}

        {(task.contact_name || task.deal_title) && (
          <div className="text-xs text-slate-600 mt-0.5 truncate">
            {task.contact_name && task.contact_id && (
              <Link
                href={`/admin/crm/contacts/${task.contact_id}`}
                className="hover:text-[#8B1538]"
              >
                {task.contact_name}
              </Link>
            )}
            {task.contact_name && task.deal_title && ' \u2022 '}
            {task.deal_title && <span>{task.deal_title}</span>}
          </div>
        )}

        <div className="flex items-center gap-2 mt-1">
          {dueLabel}
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${priorityStyle.badge}`}
          >
            {task.priority.toUpperCase()}
          </span>
        </div>
      </div>

      {actions && <div className="flex items-center gap-2 ml-4">{actions}</div>}
    </div>
  );
}

function getEntityLink(task: TaskCardData): string | null {
  if (task.deal_proposal_id) return `/admin/trip-proposals/${task.deal_proposal_id}`;
  if (task.contact_id) return `/admin/crm/contacts/${task.contact_id}`;
  return null;
}
