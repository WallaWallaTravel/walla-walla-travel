/**
 * Email Supplier Adapter
 *
 * @module lib/services/supplier-adapters/email-adapter
 * @description Sends lunch orders to suppliers via email using the Resend API.
 * Formats order data as a clear HTML email with guest details and totals.
 */

import { sendEmail } from '@/lib/email';
import type {
  ProposalLunchOrder,
  LunchSupplier,
  GuestOrder,
} from '@/lib/types/lunch-supplier';

export interface SupplierAdapter {
  sendOrder(
    order: ProposalLunchOrder,
    supplier: LunchSupplier,
    proposalNumber: string
  ): Promise<{ success: boolean; reference?: string }>;
}

export class EmailSupplierAdapter implements SupplierAdapter {
  async sendOrder(
    order: ProposalLunchOrder,
    supplier: LunchSupplier,
    proposalNumber: string
  ): Promise<{ success: boolean; reference?: string }> {
    if (!supplier.contact_email) {
      return { success: false };
    }

    const tourDate = order.day?.date
      ? new Date(order.day.date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'Date TBD';

    const guestOrders: GuestOrder[] = Array.isArray(order.guest_orders)
      ? order.guest_orders
      : [];

    const guestCount = guestOrders.length;
    const subject = `Lunch Order - ${proposalNumber} - ${tourDate} (${guestCount} guests)`;

    const guestRows = guestOrders
      .map(
        (guest) => `
        <tr>
          <td colspan="3" style="padding: 12px 8px 4px; font-weight: 600; color: #111827; border-top: 1px solid #e5e7eb;">
            ${escapeHtml(guest.guest_name)}
            ${guest.notes ? `<span style="font-weight: 400; color: #6b7280; font-size: 13px;"> - ${escapeHtml(guest.notes)}</span>` : ''}
          </td>
        </tr>
        ${guest.items
          .map(
            (item) => `
          <tr>
            <td style="padding: 4px 8px 4px 24px; color: #374151;">${escapeHtml(item.name)}</td>
            <td style="padding: 4px 8px; color: #374151; text-align: center;">x${item.qty}</td>
            <td style="padding: 4px 8px; color: #374151; text-align: right;">$${((item.price ?? 0) * item.qty).toFixed(2)}</td>
          </tr>
        `
          )
          .join('')}
      `
      )
      .join('');

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #111827; margin-bottom: 4px;">Lunch Order</h2>
        <p style="color: #6b7280; margin-top: 0;">
          <strong>Proposal:</strong> ${escapeHtml(proposalNumber)}<br/>
          <strong>Tour Date:</strong> ${escapeHtml(tourDate)}<br/>
          <strong>Party Size:</strong> ${guestCount} guests
        </p>

        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="padding: 8px; text-align: left; color: #374151; font-size: 13px; border-bottom: 2px solid #e5e7eb;">Item</th>
              <th style="padding: 8px; text-align: center; color: #374151; font-size: 13px; border-bottom: 2px solid #e5e7eb;">Qty</th>
              <th style="padding: 8px; text-align: right; color: #374151; font-size: 13px; border-bottom: 2px solid #e5e7eb;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${guestRows}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 12px 8px 4px; font-weight: 600; color: #111827; border-top: 2px solid #e5e7eb; text-align: right;">Subtotal</td>
              <td style="padding: 12px 8px 4px; font-weight: 600; color: #111827; border-top: 2px solid #e5e7eb; text-align: right;">$${order.subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding: 4px 8px; color: #6b7280; text-align: right;">Tax</td>
              <td style="padding: 4px 8px; color: #6b7280; text-align: right;">$${order.tax.toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding: 4px 8px; font-weight: 700; color: #111827; text-align: right; font-size: 16px;">Total</td>
              <td style="padding: 4px 8px; font-weight: 700; color: #111827; text-align: right; font-size: 16px;">$${order.total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        ${
          order.special_requests
            ? `
          <div style="margin: 16px 0; padding: 12px; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px;">
            <strong style="color: #92400e;">Special Requests:</strong>
            <p style="color: #78350f; margin: 4px 0 0;">${escapeHtml(order.special_requests)}</p>
          </div>
        `
            : ''
        }

        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
          This order was placed through Walla Walla Travel.
          Please confirm by replying to this email.
        </p>
      </div>
    `;

    const plainText = [
      `Lunch Order - ${proposalNumber}`,
      `Tour Date: ${tourDate}`,
      `Party Size: ${guestCount} guests`,
      '',
      ...guestOrders.flatMap((guest) => [
        `${guest.guest_name}${guest.notes ? ` - ${guest.notes}` : ''}`,
        ...guest.items.map(
          (item) =>
            `  ${item.name} x${item.qty} - $${((item.price ?? 0) * item.qty).toFixed(2)}`
        ),
        '',
      ]),
      `Subtotal: $${order.subtotal.toFixed(2)}`,
      `Tax: $${order.tax.toFixed(2)}`,
      `Total: $${order.total.toFixed(2)}`,
      order.special_requests ? `\nSpecial Requests: ${order.special_requests}` : '',
    ].join('\n');

    const sent = await sendEmail({
      to: supplier.contact_email,
      subject,
      html,
      text: plainText,
      replyTo: 'info@wallawalla.travel',
    });

    return { success: sent };
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
