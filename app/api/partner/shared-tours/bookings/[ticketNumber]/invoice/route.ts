/**
 * GET /api/partner/shared-tours/bookings/[ticketNumber]/invoice
 *
 * Generates and returns a PDF invoice for a hotel partner's booking.
 * Only accessible for tickets belonging to the authenticated hotel.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { withErrorHandling, UnauthorizedError, ForbiddenError, NotFoundError } from '@/lib/api/middleware/error-handler';
import { hotelPartnerService } from '@/lib/services/hotel-partner.service';
import { getHotelSessionFromRequest } from '@/lib/auth/hotel-session';
import { query } from '@/lib/db';

interface InvoiceTicket {
  id: string;
  ticket_number: string;
  tour_date: string;
  tour_title: string;
  customer_name: string;
  customer_email: string;
  ticket_count: number;
  price_per_person: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  includes_lunch: boolean;
  payment_status: string;
  paid_at: string | null;
  status: string;
  hotel_partner_id: string;
  created_at: string;
}

export const GET = withErrorHandling(async (
  request: NextRequest,
  context: { params: Promise<{ ticketNumber: string }> }
) => {
  const session = await getHotelSessionFromRequest(request);
  if (!session?.hotelId) {
    throw new UnauthorizedError('Hotel authentication required');
  }

  const hotel = await hotelPartnerService.getHotelById(session.hotelId);
  if (!hotel || !hotel.is_active) {
    throw new ForbiddenError('Hotel account is deactivated');
  }

  const { ticketNumber } = await context.params;

  // Fetch ticket with tour info, verify hotel ownership
  const result = await query<InvoiceTicket>(
    `SELECT t.id, t.ticket_number, t.customer_name, t.customer_email,
            t.ticket_count, t.price_per_person, t.subtotal, t.tax_amount,
            t.total_amount, t.includes_lunch, t.payment_status, t.paid_at,
            t.status, t.hotel_partner_id, t.created_at,
            s.tour_date, s.title as tour_title
     FROM shared_tour_tickets t
     JOIN shared_tour_schedule s ON t.tour_id = s.id
     WHERE t.ticket_number = $1`,
    [ticketNumber]
  );

  const ticket = result.rows[0];
  if (!ticket) {
    throw new NotFoundError('Booking not found');
  }

  if (String(ticket.hotel_partner_id) !== String(session.hotelId)) {
    throw new ForbiddenError('You can only download invoices for your own bookings');
  }

  // Generate PDF
  const pdfBytes = await generateInvoicePDF(ticket, hotel.name);

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${ticket.ticket_number}.pdf"`,
      'Cache-Control': 'private, no-cache',
    },
  });
});

async function generateInvoicePDF(
  ticket: InvoiceTicket,
  hotelName: string
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);
  const darkGray = rgb(0.2, 0.2, 0.2);
  const lineColor = rgb(0.85, 0.85, 0.85);

  const margin = 50;
  const pageWidth = 595 - margin * 2;
  let y = 780;

  // --- Header ---
  page.drawText('INVOICE', { x: margin, y, size: 28, font: fontBold, color: darkGray });
  page.drawText('Walla Walla Travel', { x: 595 - margin - font.widthOfTextAtSize('Walla Walla Travel', 12), y: y + 10, size: 12, font: fontBold, color: darkGray });
  page.drawText('wallawalla.travel', { x: 595 - margin - font.widthOfTextAtSize('wallawalla.travel', 9), y: y - 5, size: 9, font, color: gray });
  y -= 40;

  // Divider
  page.drawLine({ start: { x: margin, y }, end: { x: margin + pageWidth, y }, thickness: 1, color: lineColor });
  y -= 25;

  // --- Invoice details ---
  const drawRow = (label: string, value: string, yPos: number) => {
    page.drawText(label, { x: margin, y: yPos, size: 9, font, color: gray });
    page.drawText(value, { x: margin + 120, y: yPos, size: 9, font: fontBold, color: black });
  };

  drawRow('Invoice #', ticket.ticket_number, y);
  drawRow('Date', formatDate(ticket.created_at), y - 16);
  drawRow('Status', ticket.payment_status === 'paid' ? 'PAID' : ticket.payment_status.toUpperCase(), y - 32);
  if (ticket.paid_at) {
    drawRow('Paid On', formatDate(ticket.paid_at), y - 48);
  }

  // Right column — bill to
  const rightCol = 320;
  page.drawText('BILL TO', { x: rightCol, y, size: 9, font, color: gray });
  page.drawText(ticket.customer_name, { x: rightCol, y: y - 16, size: 10, font: fontBold, color: black });
  page.drawText(ticket.customer_email, { x: rightCol, y: y - 32, size: 9, font, color: gray });
  page.drawText(`Booked by: ${hotelName}`, { x: rightCol, y: y - 48, size: 9, font, color: gray });

  y -= 80;

  // Divider
  page.drawLine({ start: { x: margin, y }, end: { x: margin + pageWidth, y }, thickness: 1, color: lineColor });
  y -= 25;

  // --- Tour Details ---
  page.drawText('TOUR DETAILS', { x: margin, y, size: 10, font: fontBold, color: darkGray });
  y -= 20;
  page.drawText(ticket.tour_title || 'Shared Wine Tour', { x: margin, y, size: 11, font: fontBold, color: black });
  y -= 16;
  page.drawText(`Date: ${formatDate(ticket.tour_date)}`, { x: margin, y, size: 9, font, color: gray });
  y -= 16;
  page.drawText(`Guests: ${ticket.ticket_count}`, { x: margin, y, size: 9, font, color: gray });
  if (ticket.includes_lunch) {
    y -= 16;
    page.drawText('Includes lunch', { x: margin, y, size: 9, font, color: gray });
  }

  y -= 35;

  // --- Line Items Table ---
  // Header
  page.drawRectangle({ x: margin, y: y - 5, width: pageWidth, height: 22, color: rgb(0.95, 0.95, 0.95) });
  page.drawText('Description', { x: margin + 8, y: y, size: 9, font: fontBold, color: darkGray });
  page.drawText('Qty', { x: 340, y: y, size: 9, font: fontBold, color: darkGray });
  page.drawText('Unit Price', { x: 385, y: y, size: 9, font: fontBold, color: darkGray });
  page.drawText('Amount', { x: 470, y: y, size: 9, font: fontBold, color: darkGray });
  y -= 25;

  // Tour tickets line
  page.drawText('Shared Wine Tour Ticket', { x: margin + 8, y, size: 9, font, color: black });
  page.drawText(String(ticket.ticket_count), { x: 340, y, size: 9, font, color: black });
  page.drawText(`$${ticket.price_per_person.toFixed(2)}`, { x: 385, y, size: 9, font, color: black });
  page.drawText(`$${ticket.subtotal.toFixed(2)}`, { x: 470, y, size: 9, font, color: black });
  y -= 18;

  // Divider
  page.drawLine({ start: { x: margin, y }, end: { x: margin + pageWidth, y }, thickness: 0.5, color: lineColor });
  y -= 20;

  // Totals
  const totalsX = 385;
  page.drawText('Subtotal', { x: totalsX, y, size: 9, font, color: gray });
  page.drawText(`$${ticket.subtotal.toFixed(2)}`, { x: 470, y, size: 9, font, color: black });
  y -= 16;

  page.drawText('Tax', { x: totalsX, y, size: 9, font, color: gray });
  page.drawText(`$${ticket.tax_amount.toFixed(2)}`, { x: 470, y, size: 9, font, color: black });
  y -= 20;

  // Total line
  page.drawLine({ start: { x: totalsX, y: y + 5 }, end: { x: margin + pageWidth, y: y + 5 }, thickness: 1, color: lineColor });
  page.drawText('Total', { x: totalsX, y, size: 11, font: fontBold, color: darkGray });
  page.drawText(`$${ticket.total_amount.toFixed(2)}`, { x: 470, y, size: 11, font: fontBold, color: black });

  y -= 50;

  // --- Footer ---
  page.drawLine({ start: { x: margin, y }, end: { x: margin + pageWidth, y }, thickness: 0.5, color: lineColor });
  y -= 18;
  page.drawText('Thank you for booking with Walla Walla Travel.', { x: margin, y, size: 9, font, color: gray });
  y -= 14;
  page.drawText('Questions? Contact us at info@wallawalla.travel', { x: margin, y, size: 9, font, color: gray });

  return doc.save();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
