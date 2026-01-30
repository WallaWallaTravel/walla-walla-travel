import { pool } from '../lib/db';

async function createTestProposal() {
  const proposalNumber = `PRO-NWT-TEST${Date.now().toString().slice(-4)}`;

  const result = await pool.query(`
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
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
    ) RETURNING id, proposal_number, uuid
  `, [
    proposalNumber,
    3, // NW Touring brand
    'Test Customer',
    'test@example.com',
    '(555) 123-4567',
    'Wine Country Experience - Test',
    JSON.stringify([{
      description: 'Full Day Wine Tour',
      quantity: 1,
      unit_price: 850,
      total: 850
    }]),
    850,
    850,
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    'sent',
    true,
    18,
    true,
    'Thank you for your interest in NW Touring & Concierge.',
    'Standard cancellation policy applies.',
    'Standard terms and conditions apply.'
  ]);

  console.log('Created proposal:', result.rows[0]);
  console.log(`View at: http://localhost:3002/proposals/${result.rows[0].uuid}`);

  await pool.end();
}

createTestProposal().catch(console.error);
