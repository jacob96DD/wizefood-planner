-- Opret discover_recipes tabel til klassiske retter
CREATE TABLE public.discover_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  tags TEXT[],
  key_ingredients TEXT[],
  category TEXT DEFAULT 'danish',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discover_recipes ENABLE ROW LEVEL SECURITY;

-- Anyone can view discover recipes
CREATE POLICY "Anyone can view discover_recipes" 
ON public.discover_recipes FOR SELECT USING (true);

-- Tilføj rating kolonne til swipes
ALTER TABLE public.swipes 
ADD COLUMN IF NOT EXISTS rating TEXT CHECK (rating IN ('love', 'like', 'dislike', 'hate'));

-- Tilføj discover_recipe_id til swipes (for discover swipes)
ALTER TABLE public.swipes 
ALTER COLUMN recipe_id DROP NOT NULL;

ALTER TABLE public.swipes 
ADD COLUMN IF NOT EXISTS discover_recipe_id UUID REFERENCES public.discover_recipes(id);

-- Migrer eksisterende direction til rating
UPDATE public.swipes SET rating = CASE 
  WHEN direction = 'up' THEN 'love'
  WHEN direction = 'right' THEN 'like'
  WHEN direction = 'left' THEN 'dislike'
  WHEN direction = 'down' THEN 'hate'
  ELSE 'like'
END WHERE rating IS NULL;

-- Indsæt 35+ klassiske polariserende retter
INSERT INTO public.discover_recipes (title, description, key_ingredients, tags, category) VALUES
-- Danske klassikere
('Lasagne', 'Klassisk italiensk med kødsovs, bechamel og smeltet ost', ARRAY['oksekød', 'pasta', 'ost', 'tomat', 'bechamel'], ARRAY['italiensk', 'ovnret'], 'international'),
('Leverpostej', 'Hjemmelavet dansk leverpostej med bacon og champignon', ARRAY['lever', 'svinekød', 'løg', 'bacon'], ARRAY['dansk', 'pålæg'], 'danish'),
('Sylte', 'Traditionel dansk sylte med eddike', ARRAY['svinekød', 'gele', 'eddike'], ARRAY['dansk', 'kold'], 'danish'),
('Blodpølse', 'Klassisk dansk blodpølse med sirup', ARRAY['blod', 'gryn', 'svinefedt'], ARRAY['dansk', 'traditionel'], 'danish'),
('Medisterpølse', 'Krydret dansk pølse med stuvede kartofler', ARRAY['svinekød', 'løg', 'krydderier'], ARRAY['dansk', 'comfort'], 'danish'),
('Frikadeller', 'Danske frikadeller med kartofler og sovs', ARRAY['oksekød', 'svinekød', 'løg', 'æg'], ARRAY['dansk', 'klassiker'], 'danish'),
('Stegt flæsk', 'Stegt flæsk med persillesovs', ARRAY['flæsk', 'persille', 'kartofler'], ARRAY['dansk', 'klassiker'], 'danish'),
('Æbleflæsk', 'Sprød flæsk med karamelliserede æbler', ARRAY['flæsk', 'æbler', 'løg'], ARRAY['dansk', 'sød-salt'], 'danish'),
('Boller i karry', 'Kødboller i mild karrysovs', ARRAY['svinekød', 'karry', 'fløde', 'ris'], ARRAY['dansk', 'sovs'], 'danish'),
('Brændende kærlighed', 'Kartoffelmos med bacon og løg', ARRAY['kartofler', 'bacon', 'løg', 'smør'], ARRAY['dansk', 'comfort'], 'danish'),

-- Fisk og skaldyr
('Sushi', 'Japansk sushi med rå fisk og ris', ARRAY['ris', 'rå fisk', 'tang', 'wasabi'], ARRAY['japansk', 'rå'], 'international'),
('Tatar', 'Rå oksekød med kapers og rå æggeblomme', ARRAY['rå oksekød', 'æg', 'kapers', 'løg'], ARRAY['fransk', 'rå'], 'international'),
('Muslinger i hvidvin', 'Dampede blåmuslinger i hvidvinssovs', ARRAY['muslinger', 'hvidvin', 'fløde', 'hvidløg'], ARRAY['skaldyr', 'fransk'], 'seafood'),
('Østers', 'Friske rå østers med citron', ARRAY['østers', 'citron'], ARRAY['skaldyr', 'rå', 'luksus'], 'seafood'),
('Rejer med cocktailsovs', 'Klassiske rejer med dild og cocktailsovs', ARRAY['rejer', 'mayonnaise', 'dild'], ARRAY['skaldyr', 'kold'], 'seafood'),
('Røget ål', 'Traditionel røget ål med røræg', ARRAY['ål', 'æg', 'smør'], ARRAY['dansk', 'fisk'], 'seafood'),
('Stegt sild', 'Paneret stegt sild med sennepssovs', ARRAY['sild', 'sennep', 'rugbrød'], ARRAY['dansk', 'fisk'], 'seafood'),
('Laks med teriyaki', 'Glaseret laks i sød teriyakisovs', ARRAY['laks', 'soja', 'ingefær', 'honning'], ARRAY['japansk', 'fisk'], 'seafood'),

-- Stærk/krydret mad
('Vindaloo', 'Meget stærk indisk karry', ARRAY['kød', 'chili', 'krydderier', 'tomat'], ARRAY['indisk', 'stærk'], 'spicy'),
('Thai grøn karry', 'Stærk thai karry med kokosmælk', ARRAY['kylling', 'kokosmælk', 'chili', 'lime'], ARRAY['thai', 'stærk'], 'spicy'),
('Jalapeño poppers', 'Friturestegt jalapeño med ost', ARRAY['jalapeño', 'ost', 'bacon'], ARRAY['mexicansk', 'stærk'], 'spicy'),
('Kimchi', 'Fermenteret koreansk kål', ARRAY['kål', 'chili', 'hvidløg', 'ingefær'], ARRAY['koreansk', 'fermenteret'], 'spicy'),

-- Grøntsager (polariserende)
('Rosenkål med bacon', 'Ovnbagte rosenkål med sprød bacon', ARRAY['rosenkål', 'bacon', 'smør'], ARRAY['grønt', 'ovnbagt'], 'vegetable'),
('Grønkålssalat', 'Masseret grønkål med citron og parmesan', ARRAY['grønkål', 'citron', 'parmesan'], ARRAY['grønt', 'salat'], 'vegetable'),
('Blomkålsris', 'Revet blomkål som ris-erstatning', ARRAY['blomkål'], ARRAY['lowcarb', 'grønt'], 'vegetable'),
('Aubergine parmigiana', 'Italiensk aubergine gratin', ARRAY['aubergine', 'tomat', 'ost'], ARRAY['italiensk', 'vegetar'], 'vegetable'),
('Bagt selleri', 'Hel bagt selleri med smør', ARRAY['selleri', 'smør', 'timian'], ARRAY['grønt', 'ovnbagt'], 'vegetable'),

-- Ost (polariserende)
('Blåskimmelost salat', 'Salat med kraftig blåskimmelost', ARRAY['blåskimmelost', 'valnødder', 'pære'], ARRAY['salat', 'ost'], 'cheese'),
('Gedeost på salat', 'Varm gedeost på grøn salat', ARRAY['gedeost', 'honning', 'valnødder'], ARRAY['salat', 'ost'], 'cheese'),
('Brie en croûte', 'Bagt brie i butterdej', ARRAY['brie', 'butterdej', 'honning'], ARRAY['fransk', 'ost'], 'cheese'),

-- Specielle ingredienser
('Koriander-lime kylling', 'Grillet kylling med frisk koriander', ARRAY['kylling', 'koriander', 'lime', 'hvidløg'], ARRAY['mexicansk', 'grillet'], 'herbs'),
('Oliven tapenade', 'Pasta med oliven og kapers', ARRAY['oliven', 'kapers', 'ansjoser', 'pasta'], ARRAY['italiensk', 'pasta'], 'mediterranean'),
('Feta og vandmelon salat', 'Frisk sommersalat med feta', ARRAY['feta', 'vandmelon', 'mynte'], ARRAY['græsk', 'salat'], 'mediterranean'),

-- Vegetar/vegansk
('Tofu stir-fry', 'Wokret tofu med grøntsager', ARRAY['tofu', 'soja', 'ingefær', 'grøntsager'], ARRAY['asiatisk', 'vegetar'], 'vegetarian'),
('Kikærte curry', 'Indisk curry med kikærter', ARRAY['kikærter', 'tomat', 'karry', 'kokosmælk'], ARRAY['indisk', 'vegetar'], 'vegetarian'),
('Quinoa bowl', 'Sund bowl med quinoa og grøntsager', ARRAY['quinoa', 'avocado', 'edamame'], ARRAY['sund', 'bowl'], 'vegetarian'),

-- Vildt og alternativt kød
('Hjortefilet', 'Stegt hjortefilet med vildtsovs', ARRAY['hjort', 'rødvin', 'svampe'], ARRAY['vildt', 'luksus'], 'game'),
('Andebryst', 'Sprødstegt andebryst med appelsinsovs', ARRAY['and', 'appelsin', 'timian'], ARRAY['fransk', 'vildt'], 'game'),
('Kanin i sennep', 'Langtidsstegt kanin i sennepssovs', ARRAY['kanin', 'sennep', 'fløde'], ARRAY['fransk', 'vildt'], 'game');