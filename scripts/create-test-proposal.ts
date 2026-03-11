import { prisma } from '../lib/prisma';

async function createTestProposal() {
  const proposalNumber = `PRO-NWT-TEST${Date.now().toString().slice(-4)}`;

  const serviceItems = JSON.stringify([{
    description: 'Full Day Wine Tour',
    quantity: 1,
    unit_price: 850,
    total: 850
  }]);
  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const rows = await prisma.$queryRaw<Array<{ id: number; proposal_number: string; uuid: string }>>`
    INSERT INTO proposals (
      proposal_number,
      brand_id,
      client_name,
      client_email,
      client_phone,
      proposal_title,
      service_items,
      subtotal,
      total,
      valid_until,
      status,
      include_gratuity_request,
      suggested_gratuity_percentage,
      gratuity_optional,
      introduction,
      cancellation_policy,
      terms_and_conditions
    ) VALUES (
      ${proposalNumber}, ${3}, ${'Test Customer'}, ${'test@example.com'}, ${'(555) 123-4567'},
      ${'Wine Country Experience - Test'}, ${serviceItems}::jsonb, ${850}, ${850},
      ${validUntil}::timestamptz, ${'sent'}, ${true}, ${18}, ${true},
      ${'Thank you for your interest in NW Touring & Concierge.'},
      ${'Standard cancellation policy applies.'},
      ${'Standard terms and conditions apply.'}
    ) RETURNING id, proposal_number, uuid
  `;

  console.log('Created proposal:', rows[0]);
  console.log(`View at: http://localhost:3002/proposals/${rows[0].uuid}`);

  await prisma.$disconnect();
}

createTestProposal().catch(console.error);
