/**
 * POST /api/driver/expenses/upload-receipt
 *
 * Upload a receipt photo and create an expense record
 * Only accessible by authenticated drivers
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandling,
  BadRequestError,
  ForbiddenError,
} from '@/lib/api/middleware/error-handler';
import { requireAuth, requireDriver } from '@/lib/api/middleware/auth';
import { tipService } from '@/lib/services/tip.service';
import { uploadFile, ALLOWED_IMAGE_TYPES } from '@/lib/storage/supabase-storage';

export const POST = withErrorHandling(async (request: NextRequest) => {
  // Authenticate and authorize
  const session = await requireAuth(request);
  await requireDriver(session);

  // Parse multipart form data
  const formData = await request.formData();

  // Get form fields
  const bookingIdStr = formData.get('booking_id');
  const expenseType = formData.get('expense_type') as string;
  const amountStr = formData.get('amount');
  const description = formData.get('description') as string | null;
  const receiptFile = formData.get('receipt') as File | null;

  // Validate required fields
  if (!bookingIdStr || !expenseType || !amountStr) {
    throw new BadRequestError('Missing required fields: booking_id, expense_type, amount');
  }

  const bookingId = parseInt(bookingIdStr.toString());
  const amount = parseFloat(amountStr.toString());

  if (isNaN(bookingId) || bookingId <= 0) {
    throw new BadRequestError('Invalid booking ID');
  }

  if (isNaN(amount) || amount <= 0) {
    throw new BadRequestError('Invalid amount');
  }

  if (amount > 1000) {
    throw new BadRequestError('Amount seems too high (max $1000)');
  }

  const validExpenseTypes = ['lunch', 'parking', 'toll', 'fuel', 'other'];
  if (!validExpenseTypes.includes(expenseType)) {
    throw new BadRequestError(`Invalid expense type. Must be one of: ${validExpenseTypes.join(', ')}`);
  }

  // Check if driver is assigned to this tour
  const isAssigned = await tipService.isDriverAssignedToBooking(session.user.id, bookingId);
  if (!isAssigned) {
    throw new ForbiddenError('You are not assigned to this tour');
  }

  // Handle receipt upload if provided
  let receiptUrl: string | undefined;
  let receiptStoragePath: string | undefined;

  if (receiptFile) {
    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(receiptFile.type)) {
      throw new BadRequestError('Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed');
    }

    // Validate file size (5MB max for receipts)
    const maxSize = 5 * 1024 * 1024;
    if (receiptFile.size > maxSize) {
      throw new BadRequestError('File too large. Maximum size is 5MB');
    }

    // Upload to Supabase Storage
    const uploadResult = await uploadFile(receiptFile, receiptFile.type, {
      category: 'receipts',
      subcategory: `booking-${bookingId}`,
      fileName: receiptFile.name,
    });

    receiptUrl = uploadResult.publicUrl;
    receiptStoragePath = uploadResult.path;
  }

  // Create expense record
  const expense = await tipService.createExpense({
    booking_id: bookingId,
    driver_id: session.user.id,
    expense_type: expenseType,
    amount,
    description: description || undefined,
    receipt_url: receiptUrl,
    receipt_storage_path: receiptStoragePath,
  });

  return NextResponse.json(
    {
      success: true,
      message: 'Expense recorded successfully',
      expense,
      timestamp: new Date().toISOString(),
    },
    { status: 201 }
  );
});
