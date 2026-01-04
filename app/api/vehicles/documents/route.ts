import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { vehicleService, VehicleDocument } from '@/lib/services/vehicle.service';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Get user from session
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('user');
    
    if (!userCookie) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = JSON.parse(userCookie.value);
    const searchParams = request.nextUrl.searchParams;
    const vehicleId = searchParams.get('vehicleId');
    
    if (!vehicleId || isNaN(parseInt(vehicleId))) {
      return NextResponse.json(
        { error: 'Invalid vehicle ID' },
        { status: 400 }
      );
    }

    logger.info('Fetching vehicle documents', {
      userId: user.id,
      vehicleId: parseInt(vehicleId)
    });

    // Get vehicle documents
    const documents = await vehicleService.getDocuments(parseInt(vehicleId));
    
    // Format documents for frontend
    const formattedDocs = documents.map((doc: VehicleDocument) => ({
      id: doc.id,
      type: doc.document_type,
      name: doc.document_name,
      url: doc.document_url,
      expiryDate: doc.expiry_date,
      isExpired: doc.expiry_date ? new Date(doc.expiry_date) < new Date() : false,
      expiresInDays: doc.expiry_date
        ? Math.floor((new Date(doc.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null
    }));

    // Group by type for easier rendering
    type FormattedDoc = typeof formattedDocs[number];
    const groupedDocs = {
      registration: formattedDocs.find((d: FormattedDoc) => d.type === 'registration'),
      insurance: formattedDocs.find((d: FormattedDoc) => d.type === 'insurance'),
      inspection: formattedDocs.find((d: FormattedDoc) => d.type === 'inspection'),
      maintenance: formattedDocs.find((d: FormattedDoc) => d.type === 'maintenance'),
      other: formattedDocs.filter((d: FormattedDoc) => !['registration', 'insurance', 'inspection', 'maintenance'].includes(d.type))
    };

    return NextResponse.json({
      success: true,
      documents: formattedDocs,
      grouped: groupedDocs
    });
  } catch (error) {
    logger.error('Failed to fetch vehicle documents', { error });
    return NextResponse.json(
      { error: 'Failed to fetch vehicle documents' },
      { status: 500 }
    );
  }
}