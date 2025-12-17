-- Opret tabel med alle standard basislager-varer
CREATE TABLE pantry_staples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text DEFAULT 'krydderier',
  icon text,
  created_at timestamptz DEFAULT now()
);

-- Indsæt komplet basislager liste
INSERT INTO pantry_staples (name, category, icon) VALUES
-- Krydderier
('Salt', 'krydderier', '🧂'),
('Peber', 'krydderier', '🌶️'),
('Paprika', 'krydderier', '🌶️'),
('Kanel', 'krydderier', '🪵'),
('Karry', 'krydderier', '💛'),
('Spidskommen', 'krydderier', '🌿'),
('Oregano', 'krydderier', '🌿'),
('Timian', 'krydderier', '🌿'),
('Rosmarin', 'krydderier', '🌿'),
('Basilikum', 'krydderier', '🌿'),
('Hvidløgspulver', 'krydderier', '🧄'),
('Løgpulver', 'krydderier', '🧅'),
('Chiliflager', 'krydderier', '🌶️'),
('Muskatnød', 'krydderier', '🥜'),
('Laurbærblade', 'krydderier', '🍃'),
('Bouillon høns', 'krydderier', '🍗'),
('Bouillon okse', 'krydderier', '🥩'),
('Bouillon grøntsag', 'krydderier', '🥕'),
('Ingefær', 'krydderier', '🫚'),
('Gurkemeje', 'krydderier', '💛'),

-- Olie & Fedt
('Olivenolie', 'olie_fedt', '🫒'),
('Rapsolie', 'olie_fedt', '🛢️'),
('Smør', 'olie_fedt', '🧈'),
('Kokosolie', 'olie_fedt', '🥥'),
('Solsikkeolie', 'olie_fedt', '🌻'),

-- Bagning & Grundvarer
('Mel', 'bagning', '🌾'),
('Sukker', 'bagning', '🍬'),
('Flormelis', 'bagning', '✨'),
('Bagepulver', 'bagning', '🎂'),
('Natron', 'bagning', '📦'),
('Gær', 'bagning', '🍞'),
('Vaniljesukker', 'bagning', '✨'),
('Kakao', 'bagning', '🍫'),
('Maizena', 'bagning', '🌽'),

-- Konserves & Sauce
('Tomatpuré', 'konserves', '🍅'),
('Hakkede tomater', 'konserves', '🥫'),
('Sojasauce', 'konserves', '🍶'),
('Eddike', 'konserves', '🫙'),
('Honning', 'konserves', '🍯'),
('Sennep', 'konserves', '🌭'),
('Ketchup', 'konserves', '🍅'),
('Mayonnaise', 'konserves', '🥚'),
('Worcestershire sauce', 'konserves', '🍶'),
('Balsamico', 'konserves', '🍇'),

-- Andet
('Ris', 'andet', '🍚'),
('Pasta', 'andet', '🍝'),
('Havregryn', 'andet', '🥣'),
('Kokosmælk', 'andet', '🥥'),
('Hvidløg', 'andet', '🧄'),
('Løg', 'andet', '🧅');

-- Tillad alle at læse basislager
ALTER TABLE pantry_staples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view pantry_staples" ON pantry_staples FOR SELECT USING (true);