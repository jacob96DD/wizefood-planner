-- Slet tilbud uden produktnavn
DELETE FROM offers WHERE product_name IS NULL;

-- Tilføj test-tilbud for Lidl
INSERT INTO offers (chain_id, product_name, brand, category, offer_price_dkk, original_price_dkk, valid_from, valid_until, is_active)
VALUES 
  ('21d5e85b-0c31-40a6-ab4e-277cec515647', 'Hakket oksekød 500g', 'Lidl', 'Kød', 29.95, 45.00, '2025-12-14', '2025-12-21', true),
  ('21d5e85b-0c31-40a6-ab4e-277cec515647', 'Spaghetti 500g', 'Combino', 'Pasta', 8.00, 12.00, '2025-12-14', '2025-12-21', true),
  ('21d5e85b-0c31-40a6-ab4e-277cec515647', 'Hakkede tomater 400g', 'Italiamo', 'Konserves', 5.00, 8.00, '2025-12-14', '2025-12-21', true),
  ('21d5e85b-0c31-40a6-ab4e-277cec515647', 'Æg 10 stk', 'Lidl', 'Mejeri', 22.00, 28.00, '2025-12-14', '2025-12-21', true);

-- Tilføj test-tilbud for Bilka
INSERT INTO offers (chain_id, product_name, brand, category, offer_price_dkk, original_price_dkk, valid_from, valid_until, is_active)
VALUES 
  ('9e5cc194-8d4b-4a82-b1f6-708e76f8a680', 'Kyllingebryst 900g', 'Danpo', 'Kød', 49.95, 69.00, '2025-12-14', '2025-12-21', true),
  ('9e5cc194-8d4b-4a82-b1f6-708e76f8a680', 'Basmati ris 1kg', 'Tilda', 'Ris', 25.00, 35.00, '2025-12-14', '2025-12-21', true),
  ('9e5cc194-8d4b-4a82-b1f6-708e76f8a680', 'Broccoli 500g', 'Bilka', 'Grøntsager', 12.00, 18.00, '2025-12-14', '2025-12-21', true),
  ('9e5cc194-8d4b-4a82-b1f6-708e76f8a680', 'Løg 1kg', 'Bilka', 'Grøntsager', 8.00, 12.00, '2025-12-14', '2025-12-21', true);