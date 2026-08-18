-- Sample activity for the one seeded cardholder. Safe to re-run: it replaces the card,
-- and deleting a card cascades to its authorizations and transactions.
DELETE FROM cards WHERE stripe_id = 'ic_demo';

INSERT INTO cards (stripe_id, cardholder_id, last4, brand, status, currency)
SELECT 'ic_demo', id, '4242', 'Visa', 'active', 'usd' FROM cardholders LIMIT 1;

INSERT INTO authorizations (stripe_id, card_id, cardholder_id, amount, currency, status,
  merchant_name, merchant_mcc, merchant_category, category, occurred_at, last_event_at, raw)
SELECT v.id, c.id, c.cardholder_id, v.amount, 'usd', 'pending', v.name, v.mcc, 'stripe_label',
       v.cat::"SpendCategory", now() - v.ago, now() - v.ago, '{}'::jsonb
FROM cards c, (VALUES
  ('iauth_demo_1', 4200, 'BLUE BOTTLE COFFEE', '5812', 'food_drink', interval '2 hours'),
  ('iauth_demo_2', 3150, 'CITY TRANSIT',       '4111', 'transport',  interval '1 day')
) AS v(id, amount, name, mcc, cat, ago)
WHERE c.stripe_id = 'ic_demo';

INSERT INTO transactions (stripe_id, authorization_id, card_id, cardholder_id, amount, currency,
  type, merchant_name, merchant_mcc, merchant_category, category, occurred_at, last_event_at, raw)
SELECT v.id, NULL, c.id, c.cardholder_id, v.amount, 'usd', v.type::"TransactionType", v.name,
       v.mcc, 'stripe_label', v.cat::"SpendCategory", now() - v.ago, now() - v.ago, '{}'::jsonb
FROM cards c, (VALUES
  ('itxn_demo_1',  5400, 'capture', 'BLUE BOTTLE',    '5812', 'food_drink',    interval '3 days'),
  ('itxn_demo_2',  2300, 'capture', 'CORNER MARKET',  '5411', 'groceries',     interval '4 days'),
  ('itxn_demo_3',  8900, 'capture', 'AIRLINE',        '4511', 'travel',        interval '6 days'),
  ('itxn_demo_4',  1750, 'capture', 'CINEMA',         '7832', 'entertainment', interval '8 days'),
  ('itxn_demo_5', -2500, 'refund',  'RETURNED GOODS', '5651', 'shopping',      interval '5 days'),
  ('itxn_demo_6', 12000, 'capture', 'POWER CO',       '4900', 'utilities',     interval '40 days')
) AS v(id, amount, type, name, mcc, cat, ago)
WHERE c.stripe_id = 'ic_demo';
