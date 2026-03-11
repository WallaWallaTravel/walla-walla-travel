/**
 * Compliance Notification Service
 *
 * Handles checking and notifying about driver and vehicle compliance deadlines.
 * Sends email notifications at 30 days, 7 days, and day of expiration.
 */

import { query } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';

// Notification thresholds in days
const THRESHOLDS = {
  NOTICE_40: 40,   // First notice (40 days)
  WARNING_20: 20,  // Warning (20 days)
  URGENT_10: 10,   // Urgent (10 days)
  CRITICAL_5: 5,   // Critical (5 days)
  CRITICAL_1: 1,   // Critical (1 day)
  EXPIRED: 0,      // Day of/after expiration
};

// All thresholds for notification sending
const NOTIFICATION_DAYS = [40, 20, 10, 5, 1, 0];

// Staff notification email
const STAFF_EMAIL = process.env.STAFF_NOTIFICATION_EMAIL || 'info@wallawalla.travel';

export type ComplianceSeverity = 'expired' | 'critical' | 'urgent' | 'warning';

export interface ComplianceItem {
  type: 'driver' | 'vehicle';
  entityId: number;
  entityName: string;
  entityEmail?: string;
  field: string;
  fieldLabel: string;
  expiryDate: Date;
  daysUntilExpiry: number;
  severity: ComplianceSeverity;
}

export interface ComplianceCheckResult {
  expired: ComplianceItem[];   // 0 days or less
  critical: ComplianceItem[];  // 1-5 days
  urgent: ComplianceItem[];    // 6-10 days
  warning: ComplianceItem[];   // 11-40 days
  all: ComplianceItem[];       // All items combined
}

/**
 * Get severity level based on days until expiry
 */
function getSeverity(daysUntil: number): ComplianceSeverity {
  if (daysUntil <= THRESHOLDS.EXPIRED) return 'expired';
  if (daysUntil <= THRESHOLDS.CRITICAL_5) return 'critical';
  if (daysUntil <= THRESHOLDS.URGENT_10) return 'urgent';
  return 'warning';
}

/**
 * Check all driver and vehicle compliance items
 */
export async function checkAllCompliance(): Promise<ComplianceCheckResult> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Use 40-day window for first notice
  const noticeDate = new Date(today);
  noticeDate.setDate(noticeDate.getDate() + THRESHOLDS.NOTICE_40);

  const result: ComplianceCheckResult = {
    expired: [],
    critical: [],
    urgent: [],
    warning: [],
    all: [],
  };

  // Helper to categorize and add item
  const addItem = (item: ComplianceItem) => {
    result.all.push(item);
    switch (item.severity) {
      case 'expired': result.expired.push(item); break;
      case 'critical': result.critical.push(item); break;
      case 'urgent': result.urgent.push(item); break;
      case 'warning': result.warning.push(item); break;
    }
  };

  // Check driver compliance
  const driversResult = await query(
    `SELECT
      id,
      name,
      email,
      license_expiry,
      medical_cert_expiry
    FROM users
    WHERE role = 'driver'
      AND is_active = true
      AND (
        license_expiry <= $1
        OR medical_cert_expiry <= $1
      )`,
    [noticeDate.toISOString().split('T')[0]]
  );

  for (const driver of driversResult.rows) {
    // Check license
    if (driver.license_expiry) {
      const expiry = new Date(driver.license_expiry);
      const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntil <= THRESHOLDS.NOTICE_40) {
        addItem({
          type: 'driver',
          entityId: driver.id,
          entityName: driver.name,
          entityEmail: driver.email,
          field: 'license_expiry',
          fieldLabel: 'Driver License',
          expiryDate: expiry,
          daysUntilExpiry: daysUntil,
          severity: getSeverity(daysUntil),
        });
      }
    }

    // Check medical cert
    if (driver.medical_cert_expiry) {
      const expiry = new Date(driver.medical_cert_expiry);
      const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntil <= THRESHOLDS.NOTICE_40) {
        addItem({
          type: 'driver',
          entityId: driver.id,
          entityName: driver.name,
          entityEmail: driver.email,
          field: 'medical_cert_expiry',
          fieldLabel: 'Medical Certificate',
          expiryDate: expiry,
          daysUntilExpiry: daysUntil,
          severity: getSeverity(daysUntil),
        });
      }
    }
  }

  // Check vehicle compliance
  const vehiclesResult = await query(
    `SELECT
      id,
      name,
      insurance_expiry,
      registration_expiry
    FROM vehicles
    WHERE is_active = true
      AND (
        insurance_expiry <= $1
        OR registration_expiry <= $1
      )`,
    [noticeDate.toISOString().split('T')[0]]
  );

  for (const vehicle of vehiclesResult.rows) {
    // Check insurance
    if (vehicle.insurance_expiry) {
      const expiry = new Date(vehicle.insurance_expiry);
      const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntil <= THRESHOLDS.NOTICE_40) {
        addItem({
          type: 'vehicle',
          entityId: vehicle.id,
          entityName: vehicle.name,
          field: 'insurance_expiry',
          fieldLabel: 'Insurance',
          expiryDate: expiry,
          daysUntilExpiry: daysUntil,
          severity: getSeverity(daysUntil),
        });
      }
    }

    // Check registration
    if (vehicle.registration_expiry) {
      const expiry = new Date(vehicle.registration_expiry);
      const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntil <= THRESHOLDS.NOTICE_40) {
        addItem({
          type: 'vehicle',
          entityId: vehicle.id,
          entityName: vehicle.name,
          field: 'registration_expiry',
          fieldLabel: 'Registration',
          expiryDate: expiry,
          daysUntilExpiry: daysUntil,
          severity: getSeverity(daysUntil),
        });
      }
    }
  }

  // Sort all items by severity (expired first) then by days until expiry
  const severityOrder: Record<ComplianceSeverity, number> = { expired: 0, critical: 1, urgent: 2, warning: 3 };
  result.all.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return a.daysUntilExpiry - b.daysUntilExpiry;
  });

  return result;
}

/**
 * Get email styling based on severity
 */
function getSeverityStyle(severity: ComplianceSeverity): { label: string; color: string } {
  switch (severity) {
    case 'expired': return { label: 'EXPIRED', color: '#DC2626' };
    case 'critical': return { label: 'CRITICAL - 1 DAY', color: '#DC2626' };
    case 'urgent': return { label: 'URGENT', color: '#F59E0B' };
    case 'warning': return { label: 'REMINDER', color: '#3B82F6' };
  }
}

/**
 * Send compliance warning email to driver
 */
export async function sendComplianceWarningToDriver(item: ComplianceItem): Promise<boolean> {
  if (!item.entityEmail) {
    logger.warn('Cannot send compliance warning - no email for driver', { driverId: item.entityId });
    return false;
  }

  const style = getSeverityStyle(item.severity);
  const daysText = item.daysUntilExpiry === 1 ? '1 day' : `${item.daysUntilExpiry} days`;

  const subject = `[${style.label}] Your ${item.fieldLabel} ${item.severity === 'expired' ? 'has expired' : `expires in ${daysText}`}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: ${style.color}; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">${style.label}: ${item.fieldLabel}</h1>
      </div>
      <div style="padding: 20px; background-color: #f9f9f9;">
        <p style="font-size: 16px; color: #333;">Hi ${item.entityName},</p>
        <p style="font-size: 16px; color: #333;">
          ${item.severity === 'expired'
            ? `Your <strong>${item.fieldLabel}</strong> has expired as of ${item.expiryDate.toLocaleDateString()}.`
            : `Your <strong>${item.fieldLabel}</strong> will expire on <strong>${item.expiryDate.toLocaleDateString()}</strong> (in ${daysText}).`
          }
        </p>
        ${item.severity === 'expired'
          ? `<p style="font-size: 16px; color: #DC2626; font-weight: bold;">
               You cannot be assigned to tours until this is renewed.
             </p>`
          : item.severity === 'critical'
          ? `<p style="font-size: 16px; color: #DC2626; font-weight: bold;">
               FINAL NOTICE: Your ${item.fieldLabel.toLowerCase()} expires TOMORROW. Please renew immediately.
             </p>`
          : `<p style="font-size: 16px; color: #333;">
               Please renew your ${item.fieldLabel.toLowerCase()} before it expires to avoid any service interruptions.
             </p>`
        }
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          Once renewed, please submit the updated documentation to management.
        </p>
      </div>
      <div style="padding: 15px; background-color: #eee; text-align: center; font-size: 12px; color: #666;">
        NW Touring & Concierge | (509) 540-3600 | info@nwtouring.com
      </div>
    </div>
  `;

  return sendEmail({
    to: item.entityEmail,
    subject,
    html,
  });
}

/**
 * Send compliance alert to staff
 */
export async function sendComplianceAlertToStaff(items: ComplianceItem[], alertType: ComplianceSeverity): Promise<boolean> {
  if (items.length === 0) return true;

  const typeLabels: Record<ComplianceSeverity, string> = {
    expired: 'EXPIRED',
    critical: 'CRITICAL (1 day)',
    urgent: 'URGENT (2-5 days)',
    warning: 'WARNING (6-40 days)',
  };
  const typeLabel = typeLabels[alertType];

  const alertColors: Record<ComplianceSeverity, string> = {
    expired: '#DC2626',
    critical: '#DC2626',
    urgent: '#F59E0B',
    warning: '#3B82F6',
  };

  const subject = `[Compliance ${typeLabel}] ${items.length} item${items.length > 1 ? 's' : ''} need attention`;

  const driverItems = items.filter(i => i.type === 'driver');
  const vehicleItems = items.filter(i => i.type === 'vehicle');

  const formatItem = (item: ComplianceItem) => {
    const style = getSeverityStyle(item.severity);
    const status = item.severity === 'expired' ? 'EXPIRED' : `${item.daysUntilExpiry} day${item.daysUntilExpiry === 1 ? '' : 's'}`;
    return `<li style="margin: 8px 0;">
      <strong>${item.entityName}</strong> - ${item.fieldLabel}
      <span style="color: ${style.color};">
        (${status})
      </span>
      - Expires: ${item.expiryDate.toLocaleDateString()}
    </li>`;
  };

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: ${alertColors[alertType]}; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">Compliance Alert: ${typeLabel}</h1>
        <p style="margin: 10px 0 0 0;">${items.length} item${items.length > 1 ? 's' : ''} require attention</p>
      </div>
      <div style="padding: 20px; background-color: #f9f9f9;">
        ${driverItems.length > 0 ? `
          <h2 style="color: #333; border-bottom: 2px solid #ddd; padding-bottom: 10px;">
            Driver Credentials (${driverItems.length})
          </h2>
          <ul style="list-style: none; padding: 0;">
            ${driverItems.map(formatItem).join('')}
          </ul>
        ` : ''}

        ${vehicleItems.length > 0 ? `
          <h2 style="color: #333; border-bottom: 2px solid #ddd; padding-bottom: 10px;">
            Vehicle Compliance (${vehicleItems.length})
          </h2>
          <ul style="list-style: none; padding: 0;">
            ${vehicleItems.map(formatItem).join('')}
          </ul>
        ` : ''}

        <div style="margin-top: 20px; padding: 15px; background-color: #fff; border-radius: 8px;">
          <p style="margin: 0; color: #666;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://wallawalla.travel'}/admin/dashboard" style="color: #3B82F6;">
              View in Admin Dashboard
            </a>
          </p>
        </div>
      </div>
      <div style="padding: 15px; background-color: #eee; text-align: center; font-size: 12px; color: #666;">
        This is an automated compliance check notification.
      </div>
    </div>
  `;

  return sendEmail({
    to: STAFF_EMAIL,
    subject,
    html,
  });
}

/**
 * Check if today is a notification day for this item
 * Notifications are sent at 40, 20, 10, 5, 1, and 0 (expired) days
 */
function shouldNotifyToday(daysUntilExpiry: number): boolean {
  return NOTIFICATION_DAYS.includes(daysUntilExpiry);
}

/**
 * Run compliance check and send all notifications
 * This should be called by a daily cron job
 *
 * Notification schedule:
 * - 40 days: Staff + Driver notification
 * - 20 days: Staff + Driver reminder
 * - 10 days: Staff + Driver reminder
 * - 5 days: Staff + Driver URGENT
 * - 1 day: Staff + Driver CRITICAL
 * - 0 days (expired): Staff + Driver EXPIRED
 */
export async function runComplianceNotifications(): Promise<{
  checked: number;
  notificationsSent: number;
  errors: number;
}> {
  const stats = {
    checked: 0,
    notificationsSent: 0,
    errors: 0,
  };

  try {
    const compliance = await checkAllCompliance();
    stats.checked = compliance.all.length;

    // Filter to only items that should be notified today (at specific thresholds)
    const itemsToNotify = compliance.all.filter(item => shouldNotifyToday(item.daysUntilExpiry));

    if (itemsToNotify.length === 0) {
      logger.info('No compliance notifications to send today', { totalItems: compliance.all.length });
      return stats;
    }

    // Group by severity for staff notifications
    const expiredItems = itemsToNotify.filter(i => i.severity === 'expired');
    const criticalItems = itemsToNotify.filter(i => i.severity === 'critical');
    const urgentItems = itemsToNotify.filter(i => i.severity === 'urgent');
    const warningItems = itemsToNotify.filter(i => i.severity === 'warning');

    // Send expired alerts (staff + drivers)
    if (expiredItems.length > 0) {
      const staffSent = await sendComplianceAlertToStaff(expiredItems, 'expired');
      if (staffSent) stats.notificationsSent++;
      else stats.errors++;

      for (const item of expiredItems.filter(i => i.type === 'driver')) {
        const sent = await sendComplianceWarningToDriver(item);
        if (sent) stats.notificationsSent++;
        else stats.errors++;
      }
    }

    // Send critical alerts - 1 day (staff + drivers)
    if (criticalItems.length > 0) {
      const staffSent = await sendComplianceAlertToStaff(criticalItems, 'critical');
      if (staffSent) stats.notificationsSent++;
      else stats.errors++;

      for (const item of criticalItems.filter(i => i.type === 'driver')) {
        const sent = await sendComplianceWarningToDriver(item);
        if (sent) stats.notificationsSent++;
        else stats.errors++;
      }
    }

    // Send urgent alerts - 5 days (staff + drivers)
    if (urgentItems.length > 0) {
      const staffSent = await sendComplianceAlertToStaff(urgentItems, 'urgent');
      if (staffSent) stats.notificationsSent++;
      else stats.errors++;

      for (const item of urgentItems.filter(i => i.type === 'driver')) {
        const sent = await sendComplianceWarningToDriver(item);
        if (sent) stats.notificationsSent++;
        else stats.errors++;
      }
    }

    // Send warning alerts - 10, 20, 40 days (staff + drivers at these thresholds)
    if (warningItems.length > 0) {
      const staffSent = await sendComplianceAlertToStaff(warningItems, 'warning');
      if (staffSent) stats.notificationsSent++;
      else stats.errors++;

      // Also notify drivers at warning thresholds (40, 20, 10 days)
      for (const item of warningItems.filter(i => i.type === 'driver')) {
        const sent = await sendComplianceWarningToDriver(item);
        if (sent) stats.notificationsSent++;
        else stats.errors++;
      }
    }

    logger.info('Compliance notification run completed', {
      ...stats,
      breakdown: {
        expired: expiredItems.length,
        critical: criticalItems.length,
        urgent: urgentItems.length,
        warning: warningItems.length,
      }
    });
  } catch (error) {
    logger.error('Error running compliance notifications', { error });
    stats.errors++;
  }

  return stats;
}

/**
 * Get compliance summary for dashboard
 */
export async function getComplianceSummary(): Promise<ComplianceCheckResult> {
  return checkAllCompliance();
}
