import { pool } from '../src/config/db';
import { OfferAcceptanceRepository } from '../src/modules/offer-acceptance/offer-acceptance.repository';

async function fixAndTest() {
  try {
    const token = '0bca5342854b407e153ca06a3a8b5c53f278975d6169543a';
    await pool.query(
      "UPDATE employees SET offer_token = $1, offer_token_expires_at = NOW() + INTERVAL '7 days' WHERE id = 'EMP013'",
      [token]
    );

    const repo = new OfferAcceptanceRepository();
    const found = await repo.findByToken(token);
    console.log('Successfully found EMP013 with token:', found?.name, found?.position, found?.offer_token);

  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

fixAndTest();
