-- Create trigger function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert Danish example recipes
INSERT INTO public.recipes (title, description, image_url, prep_time, cook_time, servings, calories, protein, carbs, fat, ingredients, instructions, tags) VALUES
(
  'Frikadeller med kartofler',
  'Klassiske danske frikadeller med cremede kartofler og brun sovs',
  'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800',
  20, 30, 4, 650, 35, 45, 28,
  '[{"name": "hakket svinekød", "amount": "500", "unit": "g"}, {"name": "løg", "amount": "1", "unit": "stk"}, {"name": "æg", "amount": "1", "unit": "stk"}, {"name": "mel", "amount": "3", "unit": "spsk"}, {"name": "mælk", "amount": "1", "unit": "dl"}, {"name": "salt", "amount": "1", "unit": "tsk"}, {"name": "peber", "amount": "0.5", "unit": "tsk"}, {"name": "kartofler", "amount": "800", "unit": "g"}]',
  '["Bland hakket kød med finthakket løg, æg, mel og mælk", "Krydr med salt og peber", "Form til frikadeller og steg i smør på panden", "Kog kartoflerne og server med brun sovs"]',
  ARRAY['dansk', 'klassisk', 'aftensmad']
),
(
  'Æggekage med bacon',
  'Luftig dansk æggekage med sprød bacon og frisk purløg',
  'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800',
  10, 15, 2, 420, 28, 5, 32,
  '[{"name": "æg", "amount": "6", "unit": "stk"}, {"name": "mælk", "amount": "1", "unit": "dl"}, {"name": "bacon", "amount": "150", "unit": "g"}, {"name": "smør", "amount": "25", "unit": "g"}, {"name": "purløg", "amount": "2", "unit": "spsk"}, {"name": "salt", "amount": "0.5", "unit": "tsk"}]',
  '["Steg bacon sprødt og sæt til side", "Pisk æg med mælk og salt", "Smelt smør på panden og hæld æggemassen på", "Rør forsigtigt og tilføj bacon når ægget begynder at stivne", "Drys med purløg og server"]',
  ARRAY['dansk', 'morgenmad', 'hurtig']
),
(
  'Stegt flæsk med persillesovs',
  'Danmarks nationalret - sprødt flæsk med cremet persillesovs og kartofler',
  'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=800',
  15, 25, 4, 780, 32, 35, 55,
  '[{"name": "flæsk i skiver", "amount": "600", "unit": "g"}, {"name": "kartofler", "amount": "1", "unit": "kg"}, {"name": "smør", "amount": "50", "unit": "g"}, {"name": "mel", "amount": "3", "unit": "spsk"}, {"name": "mælk", "amount": "5", "unit": "dl"}, {"name": "frisk persille", "amount": "1", "unit": "bundt"}, {"name": "salt", "amount": "1", "unit": "tsk"}]',
  '["Steg flæsk sprødt på panden uden fedt", "Kog kartoflerne", "Smelt smør og rør mel i til en jævning", "Tilsæt mælk gradvist under omrøring", "Hak persille og rør i sovsen", "Server flæsk med kartofler og sovs"]',
  ARRAY['dansk', 'klassisk', 'nationalret']
),
(
  'Kyllingestrimler i karry',
  'Hurtig hverdagsret med møre kyllingestrimler i cremet karrysovs',
  'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800',
  15, 20, 4, 520, 42, 28, 22,
  '[{"name": "kyllingebryst", "amount": "600", "unit": "g"}, {"name": "løg", "amount": "1", "unit": "stk"}, {"name": "karry", "amount": "2", "unit": "spsk"}, {"name": "kokosmælk", "amount": "400", "unit": "ml"}, {"name": "ris", "amount": "300", "unit": "g"}, {"name": "olie", "amount": "2", "unit": "spsk"}, {"name": "salt", "amount": "1", "unit": "tsk"}]',
  '["Skær kylling i strimler og steg i olie", "Tilføj hakket løg og karry", "Hæld kokosmælk ved og lad simre i 10 min", "Kog ris efter anvisning", "Server karrykylling over ris"]',
  ARRAY['hurtig', 'kylling', 'aftensmad']
),
(
  'Boller i karry',
  'Bløde kødboller i mild karrysovs - en dansk klassiker',
  'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800',
  25, 30, 4, 580, 34, 42, 26,
  '[{"name": "hakket svinekød", "amount": "500", "unit": "g"}, {"name": "løg", "amount": "1", "unit": "stk"}, {"name": "æg", "amount": "1", "unit": "stk"}, {"name": "rasp", "amount": "50", "unit": "g"}, {"name": "mælk", "amount": "1", "unit": "dl"}, {"name": "karry", "amount": "2", "unit": "spsk"}, {"name": "fløde", "amount": "2", "unit": "dl"}, {"name": "ris", "amount": "300", "unit": "g"}]',
  '["Bland kød med løg, æg, rasp og mælk til fars", "Form til små boller", "Steg bollerne i smør", "Lav karrysovs med karry og fløde", "Læg bollerne i sovsen og lad simre", "Server med kogte ris"]',
  ARRAY['dansk', 'klassisk', 'aftensmad']
),
(
  'Rugbrødsmadder med pålæg',
  'Klassisk dansk frokost med varieret pålæg',
  'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=800',
  15, 0, 2, 450, 22, 38, 24,
  '[{"name": "rugbrød", "amount": "4", "unit": "skiver"}, {"name": "smør", "amount": "30", "unit": "g"}, {"name": "leverpostej", "amount": "100", "unit": "g"}, {"name": "rullepølse", "amount": "100", "unit": "g"}, {"name": "ost", "amount": "80", "unit": "g"}, {"name": "agurkesalat", "amount": "50", "unit": "g"}]',
  '["Smør rugbrødssnitter", "Læg leverpostej på den ene med agurkesalat", "Læg rullepølse på den anden", "Pynt med ost og grønt efter ønske"]',
  ARRAY['dansk', 'frokost', 'hurtig']
),
(
  'Koldskål med kammerjunker',
  'Forfriskende sommerklassiker med hjemmelavede kammerjunker',
  'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800',
  10, 0, 4, 320, 12, 48, 8,
  '[{"name": "kærnemælk", "amount": "1", "unit": "l"}, {"name": "æggeblommer", "amount": "3", "unit": "stk"}, {"name": "sukker", "amount": "75", "unit": "g"}, {"name": "vaniljesukker", "amount": "1", "unit": "tsk"}, {"name": "citronsaft", "amount": "2", "unit": "spsk"}, {"name": "kammerjunker", "amount": "200", "unit": "g"}]',
  '["Pisk æggeblommer med sukker til det er luftigt", "Tilsæt vaniljesukker og citronsaft", "Rør kærnemælken i gradvist", "Server koldt med kammerjunker"]',
  ARRAY['dansk', 'dessert', 'sommer']
),
(
  'Rødgrød med fløde',
  'Dansk bærklassiker med blød fløde - det ultimative sommerdessert',
  'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800',
  20, 15, 6, 280, 4, 45, 10,
  '[{"name": "jordbær", "amount": "300", "unit": "g"}, {"name": "hindbær", "amount": "200", "unit": "g"}, {"name": "ribs", "amount": "200", "unit": "g"}, {"name": "sukker", "amount": "150", "unit": "g"}, {"name": "kartoffelmel", "amount": "3", "unit": "spsk"}, {"name": "piskefløde", "amount": "2", "unit": "dl"}]',
  '["Kog bær med sukker og vand i 10 min", "Rør kartoffelmel ud i lidt koldt vand", "Tilsæt til grøden under omrøring", "Lad køle af og server med kold fløde"]',
  ARRAY['dansk', 'dessert', 'sommer', 'klassisk']
),
(
  'Hakkebøf med bløde løg',
  'Saftig hakkebøf med gyldne, bløde løg og kartoffelmos',
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
  15, 25, 4, 620, 38, 32, 38,
  '[{"name": "hakket oksekød", "amount": "600", "unit": "g"}, {"name": "løg", "amount": "3", "unit": "stk"}, {"name": "smør", "amount": "50", "unit": "g"}, {"name": "kartofler", "amount": "800", "unit": "g"}, {"name": "mælk", "amount": "1", "unit": "dl"}, {"name": "salt", "amount": "1", "unit": "tsk"}, {"name": "peber", "amount": "0.5", "unit": "tsk"}]',
  '["Form hakket kød til bøffer og krydr med salt og peber", "Steg bøfferne på panden i smør", "Skær løg i ringe og steg bløde i smør", "Kog kartofler og mos med mælk og smør", "Server bøffer med løg og kartoffelmos"]',
  ARRAY['dansk', 'aftensmad', 'klassisk']
),
(
  'Dansk hønsesalat',
  'Cremet hønsesalat med asparges - perfekt på rugbrød',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
  20, 0, 4, 380, 28, 12, 26,
  '[{"name": "kogt kylling", "amount": "400", "unit": "g"}, {"name": "asparges", "amount": "200", "unit": "g"}, {"name": "mayonnaise", "amount": "150", "unit": "g"}, {"name": "creme fraiche", "amount": "100", "unit": "g"}, {"name": "citron", "amount": "0.5", "unit": "stk"}, {"name": "salt", "amount": "0.5", "unit": "tsk"}, {"name": "hvid peber", "amount": "0.25", "unit": "tsk"}]',
  '["Pil og skær kyllingen i tern", "Skær asparges i mindre stykker", "Bland mayonnaise med creme fraiche og citronsaft", "Vend kylling og asparges i dressingen", "Krydr med salt og peber"]',
  ARRAY['dansk', 'frokost', 'pålæg']
),
(
  'Tarteletter med høns i asparges',
  'Elegante tarteletter med cremet hønsefyld - perfekt til fest',
  'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=800',
  30, 25, 4, 520, 32, 35, 28,
  '[{"name": "tarteletskaller", "amount": "8", "unit": "stk"}, {"name": "kogt kylling", "amount": "400", "unit": "g"}, {"name": "hvide asparges", "amount": "200", "unit": "g"}, {"name": "smør", "amount": "40", "unit": "g"}, {"name": "mel", "amount": "40", "unit": "g"}, {"name": "hønsebouillon", "amount": "4", "unit": "dl"}, {"name": "fløde", "amount": "1", "unit": "dl"}]',
  '["Varm tarteletskaller i ovnen", "Lav hvid sovs af smør, mel og bouillon", "Tilsæt fløde og lad simre", "Skær kylling i tern og asparges i stykker", "Vend i sovsen og fyld tarteletterne"]',
  ARRAY['dansk', 'festmad', 'klassisk']
),
(
  'Biksemad',
  'Restemad deluxe - sprød biksemad med stegte æg',
  'https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=800',
  15, 20, 4, 580, 28, 42, 32,
  '[{"name": "kogte kartofler", "amount": "600", "unit": "g"}, {"name": "oksekød rester", "amount": "300", "unit": "g"}, {"name": "løg", "amount": "2", "unit": "stk"}, {"name": "smør", "amount": "50", "unit": "g"}, {"name": "æg", "amount": "4", "unit": "stk"}, {"name": "HP sovs", "amount": "2", "unit": "spsk"}, {"name": "salt", "amount": "1", "unit": "tsk"}]',
  '["Skær kartofler og kød i tern", "Hak løg og steg i smør til de er gyldne", "Tilføj kartofler og kød, steg til sprødt", "Krydr med salt og peber", "Steg æg og server ovenpå med HP sovs"]',
  ARRAY['dansk', 'resteret', 'aftensmad']
);