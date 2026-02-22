import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============ MAKRO-DATABASE (per 100g rå vægt) ============
const MACRO_DB: Record<string, { kcal: number; p: number; c: number; f: number }> = {
  // Kulhydrater
  'pasta': { kcal: 360, p: 13, c: 75, f: 1.5 },
  'spaghetti': { kcal: 360, p: 13, c: 75, f: 1.5 },
  'penne': { kcal: 360, p: 13, c: 75, f: 1.5 },
  'fettuccine': { kcal: 360, p: 13, c: 75, f: 1.5 },
  'fusilli': { kcal: 360, p: 13, c: 75, f: 1.5 },
  'tagliatelle': { kcal: 360, p: 13, c: 75, f: 1.5 },
  'ris': { kcal: 350, p: 7, c: 78, f: 0.5 },
  'jasminris': { kcal: 350, p: 7, c: 78, f: 0.5 },
  'basmatiris': { kcal: 350, p: 7, c: 78, f: 0.5 },
  'kartofler': { kcal: 77, p: 2, c: 17, f: 0.1 },
  'kartoffel': { kcal: 77, p: 2, c: 17, f: 0.1 },
  'brød': { kcal: 250, p: 9, c: 49, f: 2 },
  'bulgur': { kcal: 340, p: 12, c: 69, f: 1.5 },
  'couscous': { kcal: 360, p: 13, c: 73, f: 1.5 },
  'nudler': { kcal: 360, p: 12, c: 72, f: 2 },
  'farfalle': { kcal: 360, p: 13, c: 75, f: 1.5 },
  'rigatoni': { kcal: 360, p: 13, c: 75, f: 1.5 },
  'makaroni': { kcal: 360, p: 13, c: 75, f: 1.5 },
  'lasagneplader': { kcal: 360, p: 13, c: 75, f: 1.5 },
  'brune ris': { kcal: 360, p: 8, c: 74, f: 3 },
  'søde kartofler': { kcal: 86, p: 1.6, c: 20, f: 0.1 },
  'rugbrød': { kcal: 220, p: 7, c: 42, f: 2 },
  'toastbrød': { kcal: 265, p: 9, c: 49, f: 3 },
  'ægnudler': { kcal: 380, p: 14, c: 71, f: 4 },
  'risnudler': { kcal: 360, p: 3, c: 84, f: 0.5 },
  'glasnudler': { kcal: 330, p: 0, c: 82, f: 0 },
  'havregryn': { kcal: 370, p: 13, c: 60, f: 7 },
  'quinoa': { kcal: 370, p: 14, c: 64, f: 6 },
  'tortilla': { kcal: 310, p: 8, c: 50, f: 8 },
  'wraps': { kcal: 310, p: 8, c: 50, f: 8 },
  'pitabrød': { kcal: 275, p: 9, c: 55, f: 1.2 },
  'fuldkornsmel': { kcal: 340, p: 13, c: 62, f: 2.5 },

  // Kød
  'kyllingebryst': { kcal: 165, p: 31, c: 0, f: 3.6 },
  'kylling': { kcal: 165, p: 31, c: 0, f: 3.6 },
  'kyllingelår': { kcal: 210, p: 26, c: 0, f: 12 },
  'hakket oksekød': { kcal: 220, p: 26, c: 0, f: 14 },
  'hakket okse': { kcal: 220, p: 26, c: 0, f: 14 },
  'oksekød': { kcal: 220, p: 26, c: 0, f: 14 },
  'hakket svinekød': { kcal: 260, p: 24, c: 0, f: 18 },
  'svinekød': { kcal: 250, p: 20, c: 0, f: 19 },
  'flæskesteg': { kcal: 250, p: 20, c: 0, f: 19 },
  'flæsk': { kcal: 250, p: 20, c: 0, f: 19 },
  'bacon': { kcal: 540, p: 37, c: 1, f: 42 },
  'medister': { kcal: 280, p: 14, c: 3, f: 24 },
  'bøf': { kcal: 220, p: 26, c: 0, f: 14 },
  'kalvekød': { kcal: 150, p: 21, c: 0, f: 8 },
  'lam': { kcal: 280, p: 25, c: 0, f: 20 },
  'kyllingefilet': { kcal: 165, p: 31, c: 0, f: 3.6 },
  'kyllingevinge': { kcal: 222, p: 18, c: 0, f: 16 },
  'hel kylling': { kcal: 190, p: 27, c: 0, f: 9 },
  'kalkun': { kcal: 135, p: 30, c: 0, f: 1 },
  'kalkunbryst': { kcal: 135, p: 30, c: 0, f: 1 },
  'kalkunfilet': { kcal: 135, p: 30, c: 0, f: 1 },
  'and': { kcal: 340, p: 19, c: 0, f: 28 },
  'andebryst': { kcal: 200, p: 23, c: 0, f: 11 },
  'oksemørbrad': { kcal: 180, p: 28, c: 0, f: 8 },
  'entrecote': { kcal: 250, p: 25, c: 0, f: 17 },
  'culotte': { kcal: 200, p: 27, c: 0, f: 10 },
  'svinemørbrad': { kcal: 143, p: 26, c: 0, f: 3.5 },
  'svinekotelet': { kcal: 200, p: 25, c: 0, f: 11 },
  'nakkefilet': { kcal: 220, p: 22, c: 0, f: 15 },
  'medisterpølse': { kcal: 280, p: 14, c: 3, f: 24 },
  'lammekølle': { kcal: 280, p: 25, c: 0, f: 20 },
  'frikadelle': { kcal: 240, p: 18, c: 8, f: 15 },
  'frikadeller': { kcal: 240, p: 18, c: 8, f: 15 },
  'hakkekød': { kcal: 240, p: 25, c: 0, f: 16 },
  'hakket kylling': { kcal: 170, p: 20, c: 0, f: 10 },
  'skinke': { kcal: 110, p: 18, c: 1, f: 4 },
  'pølser': { kcal: 300, p: 12, c: 2, f: 27 },
  'spegepølse': { kcal: 400, p: 20, c: 2, f: 35 },
  'salami': { kcal: 430, p: 21, c: 1, f: 38 },
  'leverpostej': { kcal: 200, p: 10, c: 4, f: 16 },

  // Fisk og skaldyr
  'laks': { kcal: 200, p: 20, c: 0, f: 13 },
  'torsk': { kcal: 82, p: 18, c: 0, f: 0.7 },
  'rejer': { kcal: 100, p: 24, c: 0, f: 0.5 },
  'tun': { kcal: 130, p: 29, c: 0, f: 1 },
  'sej': { kcal: 80, p: 17, c: 0, f: 1 },
  'makrel': { kcal: 260, p: 24, c: 0, f: 18 },
  'rødspætte': { kcal: 90, p: 18, c: 0, f: 1.5 },
  'laksfilet': { kcal: 200, p: 20, c: 0, f: 13 },
  'røget laks': { kcal: 160, p: 25, c: 0, f: 7 },
  'torskefilet': { kcal: 82, p: 18, c: 0, f: 0.7 },
  'tunfisk': { kcal: 130, p: 29, c: 0, f: 1 },
  'tun på dåse': { kcal: 110, p: 26, c: 0, f: 0.8 },
  'makrel i tomat': { kcal: 180, p: 14, c: 4, f: 12 },
  'hellefisk': { kcal: 90, p: 19, c: 0, f: 1.2 },
  'kuller': { kcal: 90, p: 20, c: 0, f: 0.8 },
  'blåmuslinger': { kcal: 86, p: 12, c: 4, f: 2 },
  'kammuslinger': { kcal: 80, p: 15, c: 3, f: 0.5 },
  'fiskefrikadelle': { kcal: 180, p: 14, c: 10, f: 9 },
  'fiskefrikadeller': { kcal: 180, p: 14, c: 10, f: 9 },
  'surimi': { kcal: 95, p: 8, c: 13, f: 0.5 },

  // Mejeriprodukter
  'æg': { kcal: 150, p: 12, c: 1, f: 11 },
  'parmesan': { kcal: 430, p: 38, c: 4, f: 29 },
  'ost': { kcal: 350, p: 25, c: 1, f: 28 },
  'mozzarella': { kcal: 280, p: 22, c: 2, f: 22 },
  'feta': { kcal: 260, p: 14, c: 4, f: 21 },
  'flødeost': { kcal: 340, p: 6, c: 4, f: 33 },
  'creme fraiche': { kcal: 190, p: 3, c: 4, f: 18 },
  'fløde': { kcal: 340, p: 2, c: 3, f: 36 },
  'mælk': { kcal: 64, p: 3, c: 5, f: 4 },
  'yoghurt': { kcal: 60, p: 4, c: 6, f: 2 },
  'smør': { kcal: 740, p: 0.5, c: 0, f: 82 },
  'cheddar': { kcal: 400, p: 25, c: 1, f: 33 },
  'gouda': { kcal: 350, p: 25, c: 2, f: 27 },
  'brie': { kcal: 330, p: 21, c: 0.5, f: 27 },
  'hytteost': { kcal: 98, p: 11, c: 3, f: 4.3 },
  'ricotta': { kcal: 170, p: 11, c: 3, f: 13 },
  'cream cheese': { kcal: 340, p: 6, c: 4, f: 33 },
  'cremefraiche': { kcal: 190, p: 3, c: 4, f: 18 },
  'piskefløde': { kcal: 340, p: 2, c: 3, f: 36 },
  'letfløde': { kcal: 170, p: 3, c: 4, f: 15 },
  'letmælk': { kcal: 46, p: 3, c: 5, f: 1.5 },
  'minimælk': { kcal: 39, p: 3, c: 5, f: 0.5 },
  'sødmælk': { kcal: 64, p: 3, c: 5, f: 4 },
  'græsk yoghurt': { kcal: 97, p: 9, c: 4, f: 5 },
  'skyr': { kcal: 63, p: 11, c: 4, f: 0.2 },
  'margarine': { kcal: 720, p: 0.1, c: 0.5, f: 80 },

  // Fedt
  'olie': { kcal: 900, p: 0, c: 0, f: 100 },
  'olivenolie': { kcal: 900, p: 0, c: 0, f: 100 },
  'rapsolie': { kcal: 900, p: 0, c: 0, f: 100 },
  'kokosolie': { kcal: 900, p: 0, c: 0, f: 100 },
  'sesamolie': { kcal: 900, p: 0, c: 0, f: 100 },
  'solsikkeolie': { kcal: 900, p: 0, c: 0, f: 100 },

  // Grøntsager
  'løg': { kcal: 40, p: 1, c: 9, f: 0.1 },
  'hvidløg': { kcal: 150, p: 6, c: 33, f: 0.5 },
  'gulerødder': { kcal: 41, p: 1, c: 10, f: 0.2 },
  'gulerod': { kcal: 41, p: 1, c: 10, f: 0.2 },
  'broccoli': { kcal: 34, p: 3, c: 7, f: 0.4 },
  'spinat': { kcal: 23, p: 3, c: 4, f: 0.4 },
  'tomat': { kcal: 18, p: 1, c: 4, f: 0.2 },
  'tomater': { kcal: 18, p: 1, c: 4, f: 0.2 },
  'flåede tomater': { kcal: 20, p: 1, c: 4, f: 0.1 },
  'peberfrugt': { kcal: 30, p: 1, c: 6, f: 0.3 },
  'squash': { kcal: 17, p: 1, c: 3, f: 0.3 },
  'aubergine': { kcal: 25, p: 1, c: 6, f: 0.2 },
  'champignon': { kcal: 22, p: 3, c: 3, f: 0.3 },
  'svampe': { kcal: 22, p: 3, c: 3, f: 0.3 },
  'salat': { kcal: 15, p: 1, c: 3, f: 0.2 },
  'kål': { kcal: 25, p: 1, c: 6, f: 0.1 },
  'bønner': { kcal: 30, p: 2, c: 5, f: 0.2 },
  'ærter': { kcal: 80, p: 5, c: 14, f: 0.4 },
  'majs': { kcal: 86, p: 3, c: 19, f: 1.2 },
  'avocado': { kcal: 160, p: 2, c: 9, f: 15 },
  'rødløg': { kcal: 42, p: 1, c: 10, f: 0.1 },
  'forårsløg': { kcal: 32, p: 2, c: 7, f: 0.2 },
  'hvidløgsfed': { kcal: 150, p: 6, c: 33, f: 0.5 },
  'blomkål': { kcal: 25, p: 2, c: 5, f: 0.3 },
  'grønkål': { kcal: 50, p: 4, c: 9, f: 0.9 },
  'cherrytomater': { kcal: 18, p: 1, c: 4, f: 0.2 },
  'hakkede tomater': { kcal: 20, p: 1, c: 4, f: 0.1 },
  'rød peberfrugt': { kcal: 30, p: 1, c: 6, f: 0.3 },
  'zucchini': { kcal: 17, p: 1, c: 3, f: 0.3 },
  'shiitake': { kcal: 34, p: 2, c: 7, f: 0.5 },
  'porrer': { kcal: 61, p: 1.5, c: 14, f: 0.3 },
  'porre': { kcal: 61, p: 1.5, c: 14, f: 0.3 },
  'iceberg': { kcal: 15, p: 1, c: 3, f: 0.1 },
  'rucola': { kcal: 25, p: 3, c: 4, f: 0.7 },
  'hvidkål': { kcal: 25, p: 1, c: 6, f: 0.1 },
  'rødkål': { kcal: 31, p: 1, c: 7, f: 0.2 },
  'spidskål': { kcal: 25, p: 1, c: 6, f: 0.1 },
  'grønne bønner': { kcal: 31, p: 2, c: 7, f: 0.1 },
  'edamame': { kcal: 120, p: 12, c: 9, f: 5 },
  'agurk': { kcal: 12, p: 0.7, c: 2, f: 0.1 },
  'selleri': { kcal: 16, p: 0.7, c: 3, f: 0.2 },
  'rødbede': { kcal: 43, p: 2, c: 10, f: 0.1 },
  'rødbeder': { kcal: 43, p: 2, c: 10, f: 0.1 },
  'pastinak': { kcal: 75, p: 1, c: 18, f: 0.3 },
  'persillerod': { kcal: 55, p: 1, c: 12, f: 0.5 },
  'radiser': { kcal: 16, p: 0.7, c: 3, f: 0.1 },
  'asparges': { kcal: 20, p: 2, c: 4, f: 0.1 },
  'artiskok': { kcal: 47, p: 3, c: 11, f: 0.2 },
  'græskar': { kcal: 26, p: 1, c: 7, f: 0.1 },
  'hokkaido': { kcal: 45, p: 1, c: 10, f: 0.1 },
  'butternut squash': { kcal: 45, p: 1, c: 12, f: 0.1 },
  'ingefær': { kcal: 80, p: 2, c: 18, f: 0.8 },
  'jalapeño': { kcal: 29, p: 1, c: 6, f: 0.4 },
  'chili': { kcal: 40, p: 2, c: 9, f: 0.4 },

  // Bælgfrugter
  'linser': { kcal: 115, p: 9, c: 20, f: 0.4 },
  'kikærter': { kcal: 120, p: 8, c: 18, f: 2 },
  'kidneybønner': { kcal: 110, p: 7, c: 18, f: 0.5 },
  'sorte bønner': { kcal: 130, p: 9, c: 22, f: 0.5 },
  'røde linser': { kcal: 115, p: 9, c: 20, f: 0.4 },
  'grønne linser': { kcal: 115, p: 9, c: 20, f: 0.4 },
  'hvide bønner': { kcal: 115, p: 8, c: 20, f: 0.5 },
  'cannellinibønner': { kcal: 115, p: 8, c: 20, f: 0.5 },
  'tofu': { kcal: 76, p: 8, c: 2, f: 4 },
  'tempeh': { kcal: 190, p: 20, c: 8, f: 11 },

  // Nødder og frø
  'mandler': { kcal: 580, p: 21, c: 22, f: 50 },
  'valnødder': { kcal: 650, p: 15, c: 14, f: 65 },
  'cashewnødder': { kcal: 550, p: 18, c: 30, f: 44 },
  'peanuts': { kcal: 570, p: 26, c: 16, f: 49 },
  'jordnødder': { kcal: 570, p: 26, c: 16, f: 49 },
  'pinjekerner': { kcal: 670, p: 14, c: 13, f: 68 },
  'solsikkefrø': { kcal: 580, p: 21, c: 20, f: 51 },
  'sesamfrø': { kcal: 570, p: 18, c: 23, f: 50 },
  'chiafrø': { kcal: 490, p: 17, c: 42, f: 31 },
  'hørfrø': { kcal: 530, p: 18, c: 29, f: 42 },
  'peanutbutter': { kcal: 590, p: 25, c: 20, f: 50 },
  'tahini': { kcal: 600, p: 17, c: 22, f: 54 },

  // Frugt
  'æble': { kcal: 52, p: 0.3, c: 14, f: 0.2 },
  'æbler': { kcal: 52, p: 0.3, c: 14, f: 0.2 },
  'banan': { kcal: 90, p: 1, c: 23, f: 0.3 },
  'bananer': { kcal: 90, p: 1, c: 23, f: 0.3 },
  'appelsin': { kcal: 47, p: 1, c: 12, f: 0.1 },
  'appelsiner': { kcal: 47, p: 1, c: 12, f: 0.1 },
  'citron': { kcal: 29, p: 1, c: 9, f: 0.3 },
  'lime': { kcal: 30, p: 0.7, c: 11, f: 0.2 },
  'jordbær': { kcal: 32, p: 0.7, c: 8, f: 0.3 },
  'blåbær': { kcal: 57, p: 0.7, c: 14, f: 0.3 },
  'hindbær': { kcal: 52, p: 1, c: 12, f: 0.7 },
  'mango': { kcal: 60, p: 0.8, c: 15, f: 0.4 },
  'ananas': { kcal: 50, p: 0.5, c: 13, f: 0.1 },
  'fersken': { kcal: 39, p: 1, c: 10, f: 0.3 },
  'pære': { kcal: 57, p: 0.4, c: 15, f: 0.1 },
  'vindruer': { kcal: 69, p: 0.7, c: 18, f: 0.2 },
  'rosiner': { kcal: 300, p: 3, c: 79, f: 0.5 },
  'tørrede abrikoser': { kcal: 240, p: 3, c: 63, f: 0.5 },
  'dadler': { kcal: 280, p: 2, c: 75, f: 0.2 },
  'kokosflag': { kcal: 670, p: 6, c: 24, f: 62 },

  // Saucer og dressinger
  'kokosmælk': { kcal: 200, p: 2, c: 4, f: 21 },
  'kokosmælk let': { kcal: 100, p: 1, c: 3, f: 10 },
  'pesto': { kcal: 470, p: 5, c: 4, f: 48 },
  'tomatpuré': { kcal: 80, p: 4, c: 17, f: 0.5 },
  'tomatpassata': { kcal: 25, p: 1, c: 5, f: 0.1 },
  'sojasauce': { kcal: 60, p: 6, c: 6, f: 0 },
  'fiskesauce': { kcal: 35, p: 5, c: 4, f: 0 },
  'oystersauce': { kcal: 50, p: 1, c: 11, f: 0 },
  'sriracha': { kcal: 90, p: 2, c: 19, f: 1 },
  'sweet chili': { kcal: 220, p: 0.5, c: 54, f: 0.3 },
  'mayonnaise': { kcal: 680, p: 1, c: 1, f: 75 },
  'ketchup': { kcal: 100, p: 1, c: 26, f: 0.1 },
  'sennep': { kcal: 60, p: 4, c: 6, f: 3 },
  'honning': { kcal: 310, p: 0.3, c: 82, f: 0 },
  'ahornsirup': { kcal: 260, p: 0, c: 67, f: 0 },
  'hummus': { kcal: 170, p: 8, c: 14, f: 10 },
  'tzatziki': { kcal: 90, p: 3, c: 4, f: 7 },
  'curry paste': { kcal: 100, p: 2, c: 12, f: 5 },
  'rød karry paste': { kcal: 100, p: 2, c: 12, f: 5 },
  'grøn karry paste': { kcal: 100, p: 2, c: 12, f: 5 },
  'harissa': { kcal: 80, p: 3, c: 10, f: 4 },
  'balsamico': { kcal: 90, p: 0.5, c: 17, f: 0 },
  'eddike': { kcal: 18, p: 0, c: 0.6, f: 0 },
  'bouillon': { kcal: 10, p: 1, c: 0.5, f: 0.5 },
  'hønsebouillon': { kcal: 10, p: 1, c: 0.5, f: 0.5 },
  'oksebouillon': { kcal: 10, p: 1, c: 0.5, f: 0.5 },

  // Krydderier (per 100g)
  'paprika': { kcal: 280, p: 14, c: 54, f: 13 },
  'spidskommen': { kcal: 375, p: 18, c: 44, f: 22 },
  'kanel': { kcal: 250, p: 4, c: 80, f: 1 },
  'gurkemeje': { kcal: 310, p: 8, c: 67, f: 3 },
  'karry': { kcal: 325, p: 14, c: 58, f: 14 },
  'oregano': { kcal: 270, p: 9, c: 69, f: 4 },
  'timian': { kcal: 275, p: 9, c: 64, f: 7 },
  'rosmarin': { kcal: 130, p: 3, c: 21, f: 6 },
  'basilikum': { kcal: 22, p: 3, c: 3, f: 0.6 },
  'persille': { kcal: 36, p: 3, c: 6, f: 0.8 },
  'dild': { kcal: 43, p: 4, c: 7, f: 1 },
  'koriander': { kcal: 23, p: 2, c: 4, f: 0.5 },
  'mynte': { kcal: 44, p: 3, c: 8, f: 0.7 },

  // Diverse
  'sukker': { kcal: 400, p: 0, c: 100, f: 0 },
  'salt': { kcal: 0, p: 0, c: 0, f: 0 },
  'peber': { kcal: 250, p: 10, c: 64, f: 3 },
  'kakao': { kcal: 230, p: 20, c: 58, f: 14 },
  'mørk chokolade': { kcal: 540, p: 5, c: 60, f: 31 },
  'panko': { kcal: 360, p: 11, c: 75, f: 2 },
  'rasp': { kcal: 360, p: 11, c: 75, f: 2 },
  'majsstivelse': { kcal: 360, p: 0.3, c: 88, f: 0 },
};

// ============ PRIS-DATABASE (danske 2025-priser) ============
const PRICE_DB: Record<string, { price: number; unit: 'kg' | 'l' | 'stk' | 'pk' }> = {
  // Kød
  'kyllingebryst': { price: 90, unit: 'kg' },
  'kylling': { price: 80, unit: 'kg' },
  'kyllingelår': { price: 60, unit: 'kg' },
  'kyllingefilet': { price: 90, unit: 'kg' },
  'hel kylling': { price: 50, unit: 'kg' },
  'kalkun': { price: 100, unit: 'kg' },
  'kalkunbryst': { price: 110, unit: 'kg' },
  'hakket oksekød': { price: 100, unit: 'kg' },
  'hakket okse': { price: 100, unit: 'kg' },
  'oksekød': { price: 130, unit: 'kg' },
  'oksemørbrad': { price: 250, unit: 'kg' },
  'entrecote': { price: 200, unit: 'kg' },
  'culotte': { price: 170, unit: 'kg' },
  'bøf': { price: 160, unit: 'kg' },
  'hakket svinekød': { price: 60, unit: 'kg' },
  'svinekød': { price: 70, unit: 'kg' },
  'svinemørbrad': { price: 90, unit: 'kg' },
  'svinekotelet': { price: 80, unit: 'kg' },
  'nakkefilet': { price: 80, unit: 'kg' },
  'flæskesteg': { price: 50, unit: 'kg' },
  'bacon': { price: 120, unit: 'kg' },
  'medister': { price: 50, unit: 'kg' },
  'medisterpølse': { price: 50, unit: 'kg' },
  'lam': { price: 140, unit: 'kg' },
  'frikadeller': { price: 80, unit: 'kg' },
  'frikadelle': { price: 80, unit: 'kg' },
  'hakkekød': { price: 80, unit: 'kg' },
  'skinke': { price: 100, unit: 'kg' },
  'pølser': { price: 60, unit: 'kg' },
  'leverpostej': { price: 30, unit: 'kg' },

  // Fisk
  'laks': { price: 180, unit: 'kg' },
  'laksfilet': { price: 180, unit: 'kg' },
  'røget laks': { price: 250, unit: 'kg' },
  'torsk': { price: 140, unit: 'kg' },
  'torskefilet': { price: 140, unit: 'kg' },
  'rejer': { price: 200, unit: 'kg' },
  'tun': { price: 80, unit: 'pk' },
  'tun på dåse': { price: 15, unit: 'stk' },
  'sej': { price: 100, unit: 'kg' },
  'rødspætte': { price: 120, unit: 'kg' },
  'makrel': { price: 80, unit: 'kg' },

  // Mejeri
  'mælk': { price: 12, unit: 'l' },
  'letmælk': { price: 12, unit: 'l' },
  'minimælk': { price: 12, unit: 'l' },
  'sødmælk': { price: 12, unit: 'l' },
  'fløde': { price: 28, unit: 'l' },
  'piskefløde': { price: 28, unit: 'l' },
  'letfløde': { price: 22, unit: 'l' },
  'creme fraiche': { price: 18, unit: 'pk' },
  'cremefraiche': { price: 18, unit: 'pk' },
  'smør': { price: 100, unit: 'kg' },
  'ost': { price: 100, unit: 'kg' },
  'cheddar': { price: 120, unit: 'kg' },
  'parmesan': { price: 200, unit: 'kg' },
  'mozzarella': { price: 80, unit: 'kg' },
  'feta': { price: 90, unit: 'kg' },
  'yoghurt': { price: 20, unit: 'l' },
  'græsk yoghurt': { price: 25, unit: 'l' },
  'skyr': { price: 25, unit: 'l' },
  'hytteost': { price: 20, unit: 'pk' },
  'æg': { price: 3, unit: 'stk' },

  // Grøntsager
  'kartofler': { price: 15, unit: 'kg' },
  'kartoffel': { price: 15, unit: 'kg' },
  'søde kartofler': { price: 30, unit: 'kg' },
  'løg': { price: 15, unit: 'kg' },
  'rødløg': { price: 25, unit: 'kg' },
  'hvidløg': { price: 5, unit: 'stk' },
  'hvidløgsfed': { price: 5, unit: 'stk' },
  'gulerødder': { price: 15, unit: 'kg' },
  'gulerod': { price: 15, unit: 'kg' },
  'tomat': { price: 30, unit: 'kg' },
  'tomater': { price: 30, unit: 'kg' },
  'cherrytomater': { price: 50, unit: 'kg' },
  'agurk': { price: 10, unit: 'stk' },
  'salat': { price: 15, unit: 'stk' },
  'spinat': { price: 40, unit: 'kg' },
  'broccoli': { price: 30, unit: 'kg' },
  'blomkål': { price: 25, unit: 'stk' },
  'peberfrugt': { price: 40, unit: 'kg' },
  'squash': { price: 25, unit: 'kg' },
  'zucchini': { price: 25, unit: 'kg' },
  'aubergine': { price: 30, unit: 'kg' },
  'champignon': { price: 60, unit: 'kg' },
  'porrer': { price: 25, unit: 'kg' },
  'porre': { price: 25, unit: 'kg' },
  'kål': { price: 15, unit: 'kg' },
  'avocado': { price: 15, unit: 'stk' },
  'majs': { price: 10, unit: 'pk' },
  'ærter': { price: 20, unit: 'pk' },
  'bønner': { price: 15, unit: 'pk' },
  'grønne bønner': { price: 40, unit: 'kg' },
  'rødbeder': { price: 20, unit: 'kg' },
  'rødbede': { price: 20, unit: 'kg' },
  'asparges': { price: 60, unit: 'kg' },
  'ingefær': { price: 80, unit: 'kg' },
  'chili': { price: 5, unit: 'stk' },

  // Bælgfrugter
  'linser': { price: 30, unit: 'kg' },
  'røde linser': { price: 30, unit: 'kg' },
  'grønne linser': { price: 30, unit: 'kg' },
  'kikærter': { price: 15, unit: 'pk' },
  'kidneybønner': { price: 15, unit: 'pk' },
  'sorte bønner': { price: 15, unit: 'pk' },
  'hvide bønner': { price: 15, unit: 'pk' },
  'cannellinibønner': { price: 15, unit: 'pk' },
  'tofu': { price: 30, unit: 'pk' },

  // Tørvarer
  'pasta': { price: 20, unit: 'kg' },
  'spaghetti': { price: 20, unit: 'kg' },
  'penne': { price: 20, unit: 'kg' },
  'fusilli': { price: 20, unit: 'kg' },
  'farfalle': { price: 20, unit: 'kg' },
  'rigatoni': { price: 20, unit: 'kg' },
  'makaroni': { price: 20, unit: 'kg' },
  'ris': { price: 25, unit: 'kg' },
  'jasminris': { price: 30, unit: 'kg' },
  'basmatiris': { price: 35, unit: 'kg' },
  'nudler': { price: 15, unit: 'pk' },
  'havregryn': { price: 20, unit: 'kg' },
  'bulgur': { price: 30, unit: 'kg' },
  'couscous': { price: 30, unit: 'kg' },
  'quinoa': { price: 60, unit: 'kg' },
  'mel': { price: 15, unit: 'kg' },
  'tortilla': { price: 25, unit: 'pk' },
  'wraps': { price: 25, unit: 'pk' },
  'brød': { price: 20, unit: 'stk' },
  'rugbrød': { price: 25, unit: 'stk' },
  'pitabrød': { price: 20, unit: 'pk' },

  // Olie og saucer
  'olivenolie': { price: 60, unit: 'l' },
  'rapsolie': { price: 25, unit: 'l' },
  'olie': { price: 30, unit: 'l' },
  'kokosmælk': { price: 15, unit: 'pk' },
  'kokosmælk let': { price: 15, unit: 'pk' },
  'tomatpuré': { price: 15, unit: 'pk' },
  'tomatpassata': { price: 15, unit: 'pk' },
  'hakkede tomater': { price: 10, unit: 'pk' },
  'flåede tomater': { price: 10, unit: 'pk' },
  'sojasauce': { price: 25, unit: 'pk' },
  'pesto': { price: 25, unit: 'pk' },
  'bouillon': { price: 20, unit: 'pk' },
  'hønsebouillon': { price: 20, unit: 'pk' },
  'oksebouillon': { price: 20, unit: 'pk' },
  'honning': { price: 40, unit: 'pk' },
  'balsamico': { price: 30, unit: 'pk' },

  // Krydderurter
  'basilikum': { price: 20, unit: 'pk' },
  'persille': { price: 15, unit: 'pk' },
  'dild': { price: 15, unit: 'pk' },
  'koriander': { price: 15, unit: 'pk' },
  'rosmarin': { price: 15, unit: 'pk' },
  'timian': { price: 15, unit: 'pk' },
  'mynte': { price: 15, unit: 'pk' },

  // Nødder
  'mandler': { price: 120, unit: 'kg' },
  'valnødder': { price: 140, unit: 'kg' },
  'cashewnødder': { price: 120, unit: 'kg' },
  'peanuts': { price: 40, unit: 'kg' },
  'jordnødder': { price: 40, unit: 'kg' },
  'peanutbutter': { price: 50, unit: 'pk' },
};

// ============ MAKRO-ADJUSTERE ============
// Ingredienser der kan tilføjes/fjernes for at justere makroer
// Alle værdier er per 100g fra MACRO_DB

const PROTEIN_BOOSTERS = [
  { name: "kyllingebryst", unit: "g", per100: { kcal: 165, p: 31, c: 0, f: 3.6 }, pricePerKg: 90, diet: ["omnivore", "pescatarian"] },
  { name: "kalkunbryst", unit: "g", per100: { kcal: 135, p: 30, c: 0, f: 1.2 }, pricePerKg: 110, diet: ["omnivore", "pescatarian"] },
  { name: "skyr", unit: "g", per100: { kcal: 63, p: 11, c: 4, f: 0.2 }, pricePerKg: 25, diet: ["omnivore", "vegetarian", "pescatarian"] },
  { name: "hytteost", unit: "g", per100: { kcal: 98, p: 11, c: 3.4, f: 4.3 }, pricePerKg: 40, diet: ["omnivore", "vegetarian", "pescatarian"] },
  { name: "æg", unit: "stk", per100: { kcal: 155, p: 13, c: 1.1, f: 11 }, pricePerKg: 30, diet: ["omnivore", "vegetarian", "pescatarian"], amountPer: 60 },
  { name: "kikærter", unit: "g", per100: { kcal: 164, p: 8.9, c: 27.4, f: 2.6 }, pricePerKg: 25, diet: ["omnivore", "vegetarian", "vegan", "pescatarian"] },
  { name: "tofu", unit: "g", per100: { kcal: 76, p: 8, c: 1.9, f: 4.8 }, pricePerKg: 50, diet: ["omnivore", "vegetarian", "vegan", "pescatarian"] },
  { name: "rejer", unit: "g", per100: { kcal: 99, p: 24, c: 0.2, f: 0.3 }, pricePerKg: 200, diet: ["omnivore", "pescatarian"] },
  { name: "tun på dåse", unit: "g", per100: { kcal: 116, p: 26, c: 0, f: 1 }, pricePerKg: 80, diet: ["omnivore", "pescatarian"] },
  { name: "edamamebønner", unit: "g", per100: { kcal: 122, p: 11, c: 8.9, f: 5 }, pricePerKg: 45, diet: ["omnivore", "vegetarian", "vegan", "pescatarian"] },
];

const CARB_ADJUSTERS = [
  { name: "basmatiris", unit: "g", per100: { kcal: 350, p: 7.1, c: 78, f: 0.6 }, pricePerKg: 35 },
  { name: "kartofler", unit: "g", per100: { kcal: 77, p: 2, c: 17, f: 0.1 }, pricePerKg: 15 },
  { name: "bulgur", unit: "g", per100: { kcal: 342, p: 12, c: 63, f: 1.3 }, pricePerKg: 30 },
  { name: "søde kartofler", unit: "g", per100: { kcal: 86, p: 1.6, c: 20, f: 0.1 }, pricePerKg: 25 },
  { name: "fuldkornspasta", unit: "g", per100: { kcal: 348, p: 13, c: 64, f: 2.5 }, pricePerKg: 25 },
];

const FAT_ADJUSTERS = [
  { name: "olivenolie", unit: "spsk", per100: { kcal: 884, p: 0, c: 0, f: 100 }, pricePerKg: 60, amountPer: 15 },
  { name: "avocado", unit: "g", per100: { kcal: 160, p: 2, c: 8.5, f: 14.7 }, pricePerKg: 40 },
  { name: "mandler", unit: "g", per100: { kcal: 579, p: 21, c: 22, f: 49 }, pricePerKg: 120 },
  { name: "peanutbutter", unit: "g", per100: { kcal: 588, p: 25, c: 20, f: 50 }, pricePerKg: 60 },
];

// ============ AUTO-JUSTÉR MAKROER VED AT TILFØJE/FJERNE INGREDIENSER ============
interface MacroTargets {
  caloriesPerRecipe: number;
  proteinPerRecipe: number;
  carbsPerRecipe: number;
  fatPerRecipe: number;
}

interface AdjustmentResult {
  adjusted: boolean;
  addedIngredients: string[];
  removedIngredients: string[];
  recipe: any;
}

function adjustRecipeMacros(
  recipe: any,
  targets: MacroTargets,
  dietType: string,
  allergens: string[]
): AdjustmentResult {
  const result: AdjustmentResult = {
    adjusted: false,
    addedIngredients: [],
    removedIngredients: [],
    recipe: { ...recipe, ingredients: [...(recipe.ingredients || [])] },
  };

  const servings = recipe.servings || 1;
  const perPortionP = recipe.protein;  // Allerede per-portion efter korrektion
  const perPortionC = recipe.carbs;
  const perPortionF = recipe.fat;
  const perPortionKcal = recipe.calories;

  // Beregn afvigelser
  const proteinGap = targets.proteinPerRecipe - perPortionP;   // Positivt = mangler protein
  const carbsGap = targets.carbsPerRecipe - perPortionC;
  const fatGap = targets.fatPerRecipe - perPortionF;
  const calGap = targets.caloriesPerRecipe - perPortionKcal;

  console.log(`\n🔧 adjustRecipeMacros for "${recipe.title}":`);
  console.log(`   Nuværende: ${perPortionKcal} kcal, ${perPortionP}g P, ${perPortionC}g K, ${perPortionF}g F`);
  console.log(`   Mål:       ${targets.caloriesPerRecipe} kcal, ${targets.proteinPerRecipe}g P, ${targets.carbsPerRecipe}g K, ${targets.fatPerRecipe}g F`);
  console.log(`   Gap:       ${calGap > 0 ? '+' : ''}${Math.round(calGap)} kcal, ${proteinGap > 0 ? '+' : ''}${Math.round(proteinGap)}g P, ${carbsGap > 0 ? '+' : ''}${Math.round(carbsGap)}g K, ${fatGap > 0 ? '+' : ''}${Math.round(fatGap)}g F`);

  // === PROTEIN FIX (vigtigst) ===
  // Kun juster hvis protein er >20% under mål
  if (proteinGap > targets.proteinPerRecipe * 0.20) {
    const booster = PROTEIN_BOOSTERS.find(b =>
      b.diet.includes(dietType) &&
      !allergens.some(a => b.name.toLowerCase().includes(a.toLowerCase())) &&
      // Undgå at tilføje noget der allerede er i opskriften
      !result.recipe.ingredients.some((ing: any) =>
        ing.name.toLowerCase().includes(b.name.toLowerCase()) ||
        b.name.toLowerCase().includes(ing.name.toLowerCase())
      )
    );

    if (booster) {
      // Beregn hvor mange gram vi skal tilføje for at lukke gap'et
      const gramsNeeded = Math.round((proteinGap / booster.per100.p) * 100);
      // Begræns til realistisk mængde (50-150g per person)
      const gramsToAdd = Math.min(150, Math.max(50, gramsNeeded));
      // Skalér til total (gange med servings)
      const totalGrams = gramsToAdd * servings;

      const unit = booster.unit === "stk" ? "stk" : "g";
      const amount = booster.unit === "stk"
        ? String(Math.ceil((gramsToAdd / (booster.amountPer || 60)) * servings))
        : String(totalGrams);

      result.recipe.ingredients.push({
        name: booster.name,
        amount: amount,
        unit: unit,
        _added_by_system: true,
        _reason: `+${Math.round(gramsToAdd * booster.per100.p / 100)}g protein`,
      });

      // Opdater makroer
      const factor = gramsToAdd / 100;
      result.recipe.protein = Math.round(perPortionP + booster.per100.p * factor);
      result.recipe.carbs = Math.round(perPortionC + booster.per100.c * factor);
      result.recipe.fat = Math.round(perPortionF + booster.per100.f * factor);
      result.recipe.calories = Math.round(perPortionKcal + booster.per100.kcal * factor);

      result.adjusted = true;
      result.addedIngredients.push(`${gramsToAdd}g ${booster.name} (+${Math.round(gramsToAdd * booster.per100.p / 100)}g protein)`);
      console.log(`   ✅ Tilføjet ${gramsToAdd}g ${booster.name} per portion (${totalGrams}g total)`);
    }
  }

  // === KULHYDRAT FIX ===
  // Kun juster hvis kulhydrater er >30% under mål OG kalorier er >20% under
  const currentCals = result.recipe.calories || perPortionKcal;
  const currentCarbs = result.recipe.carbs || perPortionC;
  const carbsStillNeeded = targets.carbsPerRecipe - currentCarbs;
  const calsStillNeeded = targets.caloriesPerRecipe - currentCals;

  if (carbsStillNeeded > targets.carbsPerRecipe * 0.30 && calsStillNeeded > targets.caloriesPerRecipe * 0.20) {
    const adjuster = CARB_ADJUSTERS.find(a =>
      !result.recipe.ingredients.some((ing: any) =>
        ing.name.toLowerCase().includes(a.name.toLowerCase()) ||
        a.name.toLowerCase().includes(ing.name.toLowerCase())
      )
    );

    if (adjuster) {
      const gramsNeeded = Math.round((carbsStillNeeded / adjuster.per100.c) * 100);
      const gramsToAdd = Math.min(120, Math.max(40, gramsNeeded));
      const totalGrams = gramsToAdd * servings;

      result.recipe.ingredients.push({
        name: adjuster.name,
        amount: String(totalGrams),
        unit: "g",
        _added_by_system: true,
        _reason: `+${Math.round(gramsToAdd * adjuster.per100.c / 100)}g kulhydrater`,
      });

      const factor = gramsToAdd / 100;
      result.recipe.protein = Math.round((result.recipe.protein || perPortionP) + adjuster.per100.p * factor);
      result.recipe.carbs = Math.round(currentCarbs + adjuster.per100.c * factor);
      result.recipe.fat = Math.round((result.recipe.fat || perPortionF) + adjuster.per100.f * factor);
      result.recipe.calories = Math.round(currentCals + adjuster.per100.kcal * factor);

      result.adjusted = true;
      result.addedIngredients.push(`${gramsToAdd}g ${adjuster.name} (+${Math.round(gramsToAdd * adjuster.per100.c / 100)}g kulh.)`);
      console.log(`   ✅ Tilføjet ${gramsToAdd}g ${adjuster.name} per portion`);
    }
  }

  // === FEDT FIX ===
  // Kun juster hvis fedt er >30% under mål OG kalorier stadig er >15% under
  const currentFat = result.recipe.fat || perPortionF;
  const fatStillNeeded = targets.fatPerRecipe - currentFat;
  const calsNow = result.recipe.calories || currentCals;

  if (fatStillNeeded > targets.fatPerRecipe * 0.30 && (targets.caloriesPerRecipe - calsNow) > targets.caloriesPerRecipe * 0.15) {
    const adjuster = FAT_ADJUSTERS.find(a =>
      !result.recipe.ingredients.some((ing: any) =>
        ing.name.toLowerCase().includes(a.name.toLowerCase())
      )
    );

    if (adjuster) {
      const gramsNeeded = Math.round((fatStillNeeded / adjuster.per100.f) * 100);
      const gramsToAdd = Math.min(40, Math.max(10, gramsNeeded));  // Fedt i små mængder
      const totalGrams = gramsToAdd * servings;

      const unit = adjuster.unit === "spsk" ? "spsk" : "g";
      const amount = adjuster.unit === "spsk"
        ? String(Math.ceil((gramsToAdd / (adjuster.amountPer || 15)) * servings))
        : String(totalGrams);

      result.recipe.ingredients.push({
        name: adjuster.name,
        amount: amount,
        unit: unit,
        _added_by_system: true,
        _reason: `+${Math.round(gramsToAdd * adjuster.per100.f / 100)}g fedt`,
      });

      const factor = gramsToAdd / 100;
      result.recipe.protein = Math.round((result.recipe.protein || perPortionP) + adjuster.per100.p * factor);
      result.recipe.carbs = Math.round((result.recipe.carbs || perPortionC) + adjuster.per100.c * factor);
      result.recipe.fat = Math.round(currentFat + adjuster.per100.f * factor);
      result.recipe.calories = Math.round(calsNow + adjuster.per100.kcal * factor);

      result.adjusted = true;
      result.addedIngredients.push(`${gramsToAdd}g ${adjuster.name} (+${Math.round(gramsToAdd * adjuster.per100.f / 100)}g fedt)`);
      console.log(`   ✅ Tilføjet ${gramsToAdd}g ${adjuster.name} per portion`);
    }
  }

  // === KALORIER FOR HØJE? Reducer portionsstørrelse af kulhydrat-kilde ===
  const finalCals = result.recipe.calories;
  if (finalCals > targets.caloriesPerRecipe * 1.25) {
    const excessCals = finalCals - targets.caloriesPerRecipe;
    // Find den største kulhydrat-ingrediens og reducer den
    const carbIngredients = result.recipe.ingredients.filter((ing: any) => {
      const name = (ing.name || '').toLowerCase();
      return name.includes('ris') || name.includes('pasta') || name.includes('kartof') ||
             name.includes('nudl') || name.includes('brød') || name.includes('bulgur');
    });

    if (carbIngredients.length > 0) {
      const biggestCarb = carbIngredients[0];
      const currentAmount = parseFloat(biggestCarb.amount) || 0;
      // Reducer med 20-30%
      const reductionFactor = Math.max(0.7, 1 - (excessCals / (targets.caloriesPerRecipe * 2)));
      const newAmount = Math.round(currentAmount * reductionFactor);

      if (newAmount >= currentAmount * 0.5) { // Reducer aldrig med mere end 50%
        console.log(`   📉 Reduceret ${biggestCarb.name}: ${currentAmount}→${newAmount} (for mange kalorier)`);
        biggestCarb.amount = String(newAmount);
        biggestCarb._reduced_by_system = true;

        // Genberegn makroer approksimativt
        const reduction = (currentAmount - newAmount) / servings; // Per portion reduktion
        result.recipe.calories = Math.round(finalCals - reduction * 3.5); // ~3.5 kcal/g for kulhydratkilder
        result.recipe.carbs = Math.round((result.recipe.carbs || 0) - reduction * 0.7); // ~70% kulhydrat
        result.adjusted = true;
        result.removedIngredients.push(`Reduceret ${biggestCarb.name} med ${Math.round((1 - reductionFactor) * 100)}%`);
      }
    }
  }

  // Opdater makro-sum konsistens
  if (result.adjusted) {
    const macroKcal = (result.recipe.protein * 4) + (result.recipe.carbs * 4) + (result.recipe.fat * 9);
    result.recipe.calories = macroKcal; // Sørg for konsistens
  }

  if (result.adjusted) {
    console.log(`   📊 Justeret: ${result.recipe.calories} kcal, ${result.recipe.protein}g P, ${result.recipe.carbs}g K, ${result.recipe.fat}g F`);
  } else {
    console.log(`   ✅ Ingen justering nødvendig`);
  }

  return result;
}

// ============ PRISBEREGNING ============
function calculateRecipePrice(ingredients: any[], servings: number): { totalPrice: number; pricePerPortion: number; matchedCount: number } {
  let totalPrice = 0;
  let matchedCount = 0;
  const categoryFallbacks: Record<string, number> = {
    'meat': 80, 'fish': 140, 'dairy': 50, 'vegetable': 25, 'fruit': 30, 'grain': 20, 'spice': 200, 'sauce': 30, 'other': 40,
  };
  const meatWords = ['kød', 'kylling', 'okse', 'svin', 'lam', 'bacon', 'bøf', 'filet', 'bryst', 'lår', 'kotelet', 'mørbrad', 'steg', 'frikadelle', 'medister', 'pølse', 'skinke', 'kalkun'];
  const fishWords = ['laks', 'torsk', 'rejer', 'fisk', 'tun', 'sej', 'makrel', 'rødspætte'];
  const dairyWords = ['mælk', 'fløde', 'ost', 'smør', 'yoghurt', 'skyr', 'æg', 'creme'];

  for (const ing of ingredients || []) {
    const name = (ing.name || '').toLowerCase().trim();
    let amount = parseFloat(ing.amount) || 0;
    const unit = (ing.unit || '').toLowerCase();
    let priceInfo: { price: number; unit: string } | null = null;
    if (PRICE_DB[name]) { priceInfo = PRICE_DB[name]; }
    else { for (const [key, value] of Object.entries(PRICE_DB)) { if (name.includes(key) || key.includes(name)) { priceInfo = value; break; } } }
    if (priceInfo) {
      matchedCount++;
      let p = 0;
      if (priceInfo.unit === 'kg') {
        if (unit === 'g' || unit === 'gram') p = (amount / 1000) * priceInfo.price;
        else if (unit === 'kg') p = amount * priceInfo.price;
        else p = (amount / 1000) * priceInfo.price;
      } else if (priceInfo.unit === 'l') {
        if (unit === 'ml') p = (amount / 1000) * priceInfo.price;
        else if (unit === 'dl') p = (amount / 10) * priceInfo.price;
        else if (unit === 'l' || unit === 'liter') p = amount * priceInfo.price;
        else if (unit === 'spsk' || unit === 'tbsp') p = (amount * 15 / 1000) * priceInfo.price;
        else if (unit === 'tsk' || unit === 'tsp') p = (amount * 5 / 1000) * priceInfo.price;
        else p = (amount / 1000) * priceInfo.price;
      } else if (priceInfo.unit === 'stk') {
        if (unit === 'stk' || unit === 'stk.' || unit === '') p = amount * priceInfo.price;
        else p = priceInfo.price;
      } else if (priceInfo.unit === 'pk') { p = priceInfo.price; }
      totalPrice += p;
    } else {
      let fallback = categoryFallbacks.other;
      if (meatWords.some(w => name.includes(w))) fallback = categoryFallbacks.meat;
      else if (fishWords.some(w => name.includes(w))) fallback = categoryFallbacks.fish;
      else if (dairyWords.some(w => name.includes(w))) fallback = categoryFallbacks.dairy;
      let kg = 0;
      if (unit === 'g' || unit === 'gram') kg = amount / 1000;
      else if (unit === 'kg') kg = amount;
      else if (unit === 'spsk' || unit === 'tsk') kg = 0;
      else kg = amount / 1000;
      totalPrice += kg * fallback;
    }
  }
  return { totalPrice: Math.round(totalPrice), pricePerPortion: servings > 0 ? Math.round(totalPrice / servings) : 0, matchedCount };
}

// ============ MAKRO-BEREGNING FRA INGREDIENSER ============
interface CalculatedMacros {
  totalKcal: number;
  totalP: number;
  totalC: number;
  totalF: number;
  perPortionKcal: number;
  perPortionP: number;
  perPortionC: number;
  perPortionF: number;
  matchedIngredients: number;
  totalIngredients: number;
}

function calculateMacrosFromIngredients(ingredients: any[], servings: number): CalculatedMacros {
  let total = { kcal: 0, p: 0, c: 0, f: 0 };
  let matchedCount = 0;
  
  for (const ing of ingredients || []) {
    const name = (ing.name || '').toLowerCase().trim();
    let amount = parseFloat(ing.amount) || 0;
    const unit = (ing.unit || '').toLowerCase();
    
    // Konverter til gram
    if (unit === 'kg') amount *= 1000;
    if (unit === 'dl') amount *= 100;
    if (unit === 'l' || unit === 'liter') amount *= 1000;
    if (unit === 'spsk' || unit === 'tbsp') amount *= 15;
    if (unit === 'tsk' || unit === 'tsp') amount *= 5;
    
    // Håndter æg (stk)
    if ((unit === 'stk' || unit === '') && (name.includes('æg') || name === 'æg')) {
      amount *= 60; // 1 æg ≈ 60g
    }
    
    // Find matching ingredient i database
    let match: { kcal: number; p: number; c: number; f: number } | null = null;
    
    // Prøv eksakt match først
    if (MACRO_DB[name]) {
      match = MACRO_DB[name];
    } else {
      // Prøv delvis match
      for (const [key, value] of Object.entries(MACRO_DB)) {
        if (name.includes(key) || key.includes(name)) {
          match = value;
          break;
        }
      }
    }
    
    if (match && (unit === 'g' || unit === 'gram' || unit === 'kg' || unit === 'ml' || unit === 'dl' || 
        unit === 'l' || unit === 'stk' || unit === '' || unit === 'spsk' || unit === 'tsk')) {
      const factor = amount / 100;
      total.kcal += match.kcal * factor;
      total.p += match.p * factor;
      total.c += match.c * factor;
      total.f += match.f * factor;
      matchedCount++;
    }
  }
  
  return {
    totalKcal: Math.round(total.kcal),
    totalP: Math.round(total.p),
    totalC: Math.round(total.c),
    totalF: Math.round(total.f),
    perPortionKcal: Math.round(total.kcal / servings),
    perPortionP: Math.round(total.p / servings),
    perPortionC: Math.round(total.c / servings),
    perPortionF: Math.round(total.f / servings),
    matchedIngredients: matchedCount,
    totalIngredients: (ingredients || []).length,
  };
}

// ============ STRENG VALIDERING + AUTO-KORREKTION ============
interface ValidationResult {
  valid: boolean;
  corrected: boolean;
  errors: string[];
  calculated: CalculatedMacros;
  correctedRecipe: any;
}

function strictValidateAndCorrectRecipe(recipe: any): ValidationResult {
  const errors: string[] = [];
  const servings = recipe.servings || 1;

  // Beregn makroer fra ingredienser
  const calculated = calculateMacrosFromIngredients(recipe.ingredients, servings);

  // Tjek om vi matchede nok ingredienser
  const matchRatio = calculated.totalIngredients > 0
    ? calculated.matchedIngredients / calculated.totalIngredients
    : 0;

  if (matchRatio < 0.5) {
    console.warn(`Recipe "${recipe.title}": Only matched ${calculated.matchedIngredients}/${calculated.totalIngredients} ingredients`);
  }

  // 1. Tjek kalorier afvigelse (kun til logging)
  const kcalDiff = Math.abs(calculated.perPortionKcal - recipe.calories);
  const kcalDeviation = recipe.calories > 0 ? kcalDiff / recipe.calories : 1;

  if (kcalDeviation > 0.15 && calculated.matchedIngredients >= 2) {
    errors.push(`Kalorier: beregnet ${calculated.perPortionKcal} vs påstået ${recipe.calories} (${Math.round(kcalDeviation * 100)}% afvigelse)`);
  }

  // 2. Tjek protein afvigelse (kun til logging)
  const proteinDiff = Math.abs(calculated.perPortionP - recipe.protein);
  const proteinDeviation = recipe.protein > 0 ? proteinDiff / recipe.protein : 1;

  if (proteinDeviation > 0.15 && calculated.matchedIngredients >= 2) {
    errors.push(`Protein: beregnet ${calculated.perPortionP}g vs påstået ${recipe.protein}g (${Math.round(proteinDeviation * 100)}% afvigelse)`);
  }

  // 3. Tjek makro-sum konsistens
  const macroKcal = (recipe.protein * 4) + (recipe.carbs * 4) + (recipe.fat * 9);
  if (Math.abs(macroKcal - recipe.calories) > 100) {
    errors.push(`Makro-sum: ${macroKcal} ≠ ${recipe.calories} kcal`);
  }

  // 🔴 ALTID brug beregnede makroer når vi har mindst 2 matchede ingredienser
  // Dette sikrer at påståede værdier ALTID matcher de faktiske ingredienser
  const shouldCorrect = calculated.matchedIngredients >= 2 && calculated.perPortionKcal > 0;

  let correctedRecipe = { ...recipe };

  if (shouldCorrect) {
    // Log kun hvis der er signifikant afvigelse
    if (errors.length > 0) {
      console.log(`🔧 MACRO CORRECTION for "${recipe.title}":`);
      console.log(`   AI claimed: ${recipe.calories} kcal, ${recipe.protein}g P, ${recipe.carbs}g C, ${recipe.fat}g F`);
      console.log(`   Calculated: ${calculated.perPortionKcal} kcal, ${calculated.perPortionP}g P, ${calculated.perPortionC}g C, ${calculated.perPortionF}g F`);
      console.log(`   Matched: ${calculated.matchedIngredients}/${calculated.totalIngredients} ingredients (${Math.round(matchRatio * 100)}%)`);
    }

    correctedRecipe = {
      ...recipe,
      calories: calculated.perPortionKcal,
      protein: calculated.perPortionP,
      carbs: calculated.perPortionC,
      fat: calculated.perPortionF,
      _corrected: errors.length > 0,
      _original: {
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
      },
      _calculated: calculated,
    };
  }

  return {
    valid: errors.length === 0,
    corrected: shouldCorrect,
    errors,
    calculated,
    correctedRecipe,
  };
}

// ============ INGREDIENS-MÆNGDE VALIDERING + AUTO-KORREKTION ============
interface IngredientValidation {
  valid: boolean;
  errors: string[];
  correctedIngredients: any[];
  totalWeightPerPortion: number;
}

function validateAndCorrectIngredientAmounts(recipe: any): IngredientValidation {
  const errors: string[] = [];
  const servings = recipe.servings || 1;

  console.log(`\n🔍 ========== VALIDATING: "${recipe.title}" ==========`);
  console.log(`   Servings: ${servings}`);
  console.log(`   Ingredients count: ${(recipe.ingredients || []).length}`);

  // REALISTISKE minimum mængder per person
  const minAmountsPerPerson: Record<string, number> = {
    'protein': 100,    // Kød, fisk - MINDST 100g per person rå vægt
    'carbs': 70,       // Pasta, ris tør vægt
    'potatoes': 150,   // Kartofler
    'legumes': 50,     // Linser, bønner (tør vægt)
    'cheese': 25,      // Ost i ret
    'vegetables': 80,  // Grøntsager
  };

  // 🔴 NY: MAKSIMUM mængder per person for at undgå urealistiske værdier
  const maxAmountsPerPerson: Record<string, number> = {
    'protein': 250,    // Max 250g kød/fisk per person
    'carbs': 150,      // Max 150g pasta/ris tør vægt
    'potatoes': 400,   // Max 400g kartofler
    'legumes': 150,    // Max 150g linser/bønner
    'cheese': 100,     // Max 100g ost per person
    'dairy': 200,      // Max 200g mejeri (hytteost, yoghurt etc.)
    'vegetables': 300, // Max 300g grøntsager
    'eggs': 4,         // Max 4 æg per person
    'bread': 4,        // Max 4 skiver brød
    'avocado': 1,      // Max 1 avocado per person
  };

  const proteinKeywords = ['kød', 'kylling', 'laks', 'bacon', 'flæsk', 'okse', 'svin', 'fisk', 'rejer', 'bøf', 'medister', 'torsk', 'filet', 'bryst', 'lår', 'kotelet', 'schnitzel', 'frikadelle', 'kalkun', 'and', 'tun', 'sej', 'rødspætte', 'hakkekød', 'mørbrad', 'entrecote', 'culotte', 'steg'];
  const carbKeywords = ['pasta', 'spaghetti', 'ris', 'nudler', 'penne', 'fusilli', 'bulgur', 'couscous', 'tagliatelle', 'fettuccine', 'makaroni', 'lasagneplader', 'farfalle', 'rigatoni'];
  const potatoKeywords = ['kartof', 'kartofler', 'kartoffelmos', 'pommes', 'fritter'];
  const legumeKeywords = ['linse', 'linser', 'bønner', 'kikærter', 'kidney', 'sorte bønner', 'hvide bønner'];
  const cheeseKeywords = ['ost', 'parmesan', 'mozzarella', 'feta', 'cheddar', 'gouda', 'emmentaler', 'brie', 'camembert'];
  const dairyKeywords = ['hytteost', 'yoghurt', 'skyr', 'creme fraiche', 'cremefraiche', 'flødeost', 'ricotta'];

  // ============ TRIN 1: BEREGN TOTAL VÆGT ============
  let totalGrams = 0;
  const ingredients = recipe.ingredients || [];

  for (const ing of ingredients) {
    let amount = parseFloat(ing.amount) || 0;
    const unit = (ing.unit || '').toLowerCase();

    if (unit === 'g' || unit === 'gram') {
      totalGrams += amount;
    } else if (unit === 'kg') {
      totalGrams += amount * 1000;
    } else if (unit === 'ml' || unit === 'dl' || unit === 'l') {
      // Væsker tæller også
      if (unit === 'dl') totalGrams += amount * 100;
      else if (unit === 'l') totalGrams += amount * 1000;
      else totalGrams += amount;
    }
  }

  const weightPerPortion = totalGrams / servings;
  console.log(`📊 Total weight: ${totalGrams}g, per portion: ${Math.round(weightPerPortion)}g`);

  // ============ TRIN 2: CATCH-ALL VALIDERING ============
  // Hvis samlet vægt per portion er < 300g, har AI'en sandsynligvis givet per-portions-mængder
  const MIN_WEIGHT_PER_PORTION = 300; // Minimum 300g mad per portion

  if (weightPerPortion < MIN_WEIGHT_PER_PORTION && servings > 1) {
    console.warn(`⚠️ KRITISK: Kun ${Math.round(weightPerPortion)}g per portion! AI har sandsynligvis givet per-portions-mængder.`);
    console.warn(`🔧 AUTO-KORREKTION: Ganger ALLE mængder med ${servings}`);

    errors.push(`KRITISK: Total vægt ${totalGrams}g / ${servings} portioner = ${Math.round(weightPerPortion)}g per portion (minimum ${MIN_WEIGHT_PER_PORTION}g). Alle mængder ganges med ${servings}.`);

    // Gang ALLE gram-baserede ingredienser med antallet af portioner
    const correctedIngredients = ingredients.map((ing: any) => {
      const amount = parseFloat(ing.amount) || 0;
      const unit = (ing.unit || '').toLowerCase();

      if (unit === 'g' || unit === 'gram' || unit === 'kg' || unit === 'ml' || unit === 'dl' || unit === 'l') {
        const newAmount = Math.round(amount * servings);
        console.log(`   📦 ${ing.name}: ${amount}${unit} → ${newAmount}${unit}`);
        return { ...ing, amount: String(newAmount), _corrected: true, _original: amount };
      }

      // STK-baserede ingredienser skal også tjekkes
      if (unit === 'stk' || unit === 'stk.' || unit === '') {
        // Tjek om mængden ser ud som per-portion (typisk 1-2 stk)
        if (amount <= 2 && servings > 2) {
          const newAmount = Math.ceil(amount * servings);
          console.log(`   📦 ${ing.name}: ${amount}stk → ${newAmount}stk`);
          return { ...ing, amount: String(newAmount), unit: 'stk', _corrected: true };
        }
      }

      return ing;
    });

    const newTotalGrams = correctedIngredients.reduce((sum: number, ing: any) => {
      const amount = parseFloat(ing.amount) || 0;
      const unit = (ing.unit || '').toLowerCase();
      if (unit === 'g' || unit === 'gram') return sum + amount;
      if (unit === 'kg') return sum + amount * 1000;
      return sum;
    }, 0);

    console.log(`✅ Korrigeret total vægt: ${newTotalGrams}g (${Math.round(newTotalGrams / servings)}g per portion)`);

    return {
      valid: false,
      errors,
      correctedIngredients,
      totalWeightPerPortion: newTotalGrams / servings,
    };
  }

  // ============ TRIN 3: INDIVIDUEL INGREDIENS-VALIDERING ============
  // Kør ALTID denne validering, uanset catch-all resultatet
  console.log(`\n📋 Checking individual ingredients:`);

  const correctedIngredients = ingredients.map((ing: any) => {
    const name = (ing.name || '').toLowerCase();
    let amount = parseFloat(ing.amount) || 0;
    const unit = (ing.unit || '').toLowerCase();

    console.log(`   - ${ing.name}: ${amount} ${unit}`);

    if (unit !== 'g' && unit !== 'gram' && unit !== 'kg') {
      return ing;
    }

    let amountInGrams = amount;
    if (unit === 'kg') amountInGrams = amount * 1000;

    const perPerson = amountInGrams / servings;

    // Tjek protein-kilder
    const isProtein = proteinKeywords.some(k => name.includes(k));
    if (isProtein) {
      console.log(`     → Protein detected! ${perPerson}g/person (min: ${minAmountsPerPerson.protein})`);
      if (perPerson < minAmountsPerPerson.protein) {
        const correctedAmount = minAmountsPerPerson.protein * servings;
        errors.push(`🥩 ${ing.name}: ${amountInGrams}g (${Math.round(perPerson)}g/pp) → ${correctedAmount}g`);
        console.log(`     🔧 CORRECTING: ${amountInGrams}g → ${correctedAmount}g`);
        return { ...ing, amount: String(Math.round(correctedAmount)), unit: 'g', _corrected: true };
      }
    }

    // Tjek kartofler
    const isPotato = potatoKeywords.some(k => name.includes(k));
    if (isPotato) {
      console.log(`     → Potato detected! ${perPerson}g/person (min: ${minAmountsPerPerson.potatoes})`);
      if (perPerson < minAmountsPerPerson.potatoes) {
        const correctedAmount = minAmountsPerPerson.potatoes * servings;
        errors.push(`🥔 ${ing.name}: ${amountInGrams}g → ${correctedAmount}g`);
        console.log(`     🔧 CORRECTING: ${amountInGrams}g → ${correctedAmount}g`);
        return { ...ing, amount: String(Math.round(correctedAmount)), unit: 'g', _corrected: true };
      }
    }

    // Tjek linser/bælgfrugter
    const isLegume = legumeKeywords.some(k => name.includes(k));
    if (isLegume) {
      console.log(`     → Legume detected! ${perPerson}g/person (min: ${minAmountsPerPerson.legumes})`);
      if (perPerson < minAmountsPerPerson.legumes) {
        const correctedAmount = minAmountsPerPerson.legumes * servings;
        errors.push(`🫘 ${ing.name}: ${amountInGrams}g → ${correctedAmount}g`);
        console.log(`     🔧 CORRECTING: ${amountInGrams}g → ${correctedAmount}g`);
        return { ...ing, amount: String(Math.round(correctedAmount)), unit: 'g', _corrected: true };
      }
    }

    // Tjek kulhydrater (pasta, ris)
    const isCarb = carbKeywords.some(k => name.includes(k));
    if (isCarb) {
      console.log(`     → Carb detected! ${perPerson}g/person (min: ${minAmountsPerPerson.carbs})`);
      if (perPerson < minAmountsPerPerson.carbs) {
        const correctedAmount = minAmountsPerPerson.carbs * servings;
        errors.push(`🍝 ${ing.name}: ${amountInGrams}g → ${correctedAmount}g`);
        console.log(`     🔧 CORRECTING: ${amountInGrams}g → ${correctedAmount}g`);
        return { ...ing, amount: String(Math.round(correctedAmount)), unit: 'g', _corrected: true };
      }
    }

    // Tjek ost - MIN validering
    const isCheese = cheeseKeywords.some(k => name.includes(k));
    if (isCheese && perPerson < minAmountsPerPerson.cheese) {
      const correctedAmount = minAmountsPerPerson.cheese * servings;
      errors.push(`🧀 ${ing.name}: ${amountInGrams}g → ${correctedAmount}g`);
      return { ...ing, amount: String(Math.round(correctedAmount)), unit: 'g', _corrected: true };
    }

    // 🔴 NY: MAX-VALIDERING for at undgå urealistiske mængder

    // Tjek mejeriprodukter (hytteost, yoghurt etc.) - MAX validering
    const isDairy = dairyKeywords.some(k => name.includes(k));
    if (isDairy && perPerson > maxAmountsPerPerson.dairy) {
      const correctedAmount = maxAmountsPerPerson.dairy * servings;
      console.log(`     ⚠️ OVER MAX! ${ing.name}: ${Math.round(perPerson)}g/person > ${maxAmountsPerPerson.dairy}g max`);
      errors.push(`🥛 ${ing.name}: ${amountInGrams}g → ${correctedAmount}g (MAX overskredet)`);
      return { ...ing, amount: String(Math.round(correctedAmount)), unit: 'g', _corrected: true, _reason: 'max_exceeded' };
    }

    // Tjek ost - MAX validering
    if (isCheese && perPerson > maxAmountsPerPerson.cheese) {
      const correctedAmount = maxAmountsPerPerson.cheese * servings;
      console.log(`     ⚠️ OVER MAX! ${ing.name}: ${Math.round(perPerson)}g/person > ${maxAmountsPerPerson.cheese}g max`);
      errors.push(`🧀 ${ing.name}: ${amountInGrams}g → ${correctedAmount}g (MAX overskredet)`);
      return { ...ing, amount: String(Math.round(correctedAmount)), unit: 'g', _corrected: true, _reason: 'max_exceeded' };
    }

    // Tjek protein - MAX validering
    if (isProtein && perPerson > maxAmountsPerPerson.protein) {
      const correctedAmount = maxAmountsPerPerson.protein * servings;
      console.log(`     ⚠️ OVER MAX! ${ing.name}: ${Math.round(perPerson)}g/person > ${maxAmountsPerPerson.protein}g max`);
      errors.push(`🥩 ${ing.name}: ${amountInGrams}g → ${correctedAmount}g (MAX overskredet)`);
      return { ...ing, amount: String(Math.round(correctedAmount)), unit: 'g', _corrected: true, _reason: 'max_exceeded' };
    }

    // Tjek kulhydrater - MAX validering
    if (isCarb && perPerson > maxAmountsPerPerson.carbs) {
      const correctedAmount = maxAmountsPerPerson.carbs * servings;
      console.log(`     ⚠️ OVER MAX! ${ing.name}: ${Math.round(perPerson)}g/person > ${maxAmountsPerPerson.carbs}g max`);
      errors.push(`🍝 ${ing.name}: ${amountInGrams}g → ${correctedAmount}g (MAX overskredet)`);
      return { ...ing, amount: String(Math.round(correctedAmount)), unit: 'g', _corrected: true, _reason: 'max_exceeded' };
    }

    // Tjek kartofler - MAX validering
    if (isPotato && perPerson > maxAmountsPerPerson.potatoes) {
      const correctedAmount = maxAmountsPerPerson.potatoes * servings;
      console.log(`     ⚠️ OVER MAX! ${ing.name}: ${Math.round(perPerson)}g/person > ${maxAmountsPerPerson.potatoes}g max`);
      errors.push(`🥔 ${ing.name}: ${amountInGrams}g → ${correctedAmount}g (MAX overskredet)`);
      return { ...ing, amount: String(Math.round(correctedAmount)), unit: 'g', _corrected: true, _reason: 'max_exceeded' };
    }

    // Tjek bælgfrugter - MAX validering
    if (isLegume && perPerson > maxAmountsPerPerson.legumes) {
      const correctedAmount = maxAmountsPerPerson.legumes * servings;
      console.log(`     ⚠️ OVER MAX! ${ing.name}: ${Math.round(perPerson)}g/person > ${maxAmountsPerPerson.legumes}g max`);
      errors.push(`🫘 ${ing.name}: ${amountInGrams}g → ${correctedAmount}g (MAX overskredet)`);
      return { ...ing, amount: String(Math.round(correctedAmount)), unit: 'g', _corrected: true, _reason: 'max_exceeded' };
    }

    // Tjek æg (stk-baseret) - MAX validering
    if ((name.includes('æg') || name === 'æg') && (unit === 'stk' || unit === '')) {
      if (amount / servings > maxAmountsPerPerson.eggs) {
        const correctedAmount = maxAmountsPerPerson.eggs * servings;
        console.log(`     ⚠️ OVER MAX! ${ing.name}: ${amount/servings} stk/person > ${maxAmountsPerPerson.eggs} max`);
        errors.push(`🥚 ${ing.name}: ${amount}stk → ${correctedAmount}stk (MAX overskredet)`);
        return { ...ing, amount: String(Math.round(correctedAmount)), unit: 'stk', _corrected: true, _reason: 'max_exceeded' };
      }
    }

    // Tjek avocado (stk-baseret) - MAX validering
    if (name.includes('avocado') && (unit === 'stk' || unit === '')) {
      if (amount / servings > maxAmountsPerPerson.avocado) {
        const correctedAmount = maxAmountsPerPerson.avocado * servings;
        console.log(`     ⚠️ OVER MAX! ${ing.name}: ${amount/servings} stk/person > ${maxAmountsPerPerson.avocado} max`);
        errors.push(`🥑 ${ing.name}: ${amount}stk → ${correctedAmount}stk (MAX overskredet)`);
        return { ...ing, amount: String(Math.round(correctedAmount)), unit: 'stk', _corrected: true, _reason: 'max_exceeded' };
      }
    }

    return ing;
  });

  console.log(`\n✅ Validation complete. Errors: ${errors.length}`);
  if (errors.length > 0) {
    console.log(`   Corrections made: ${errors.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    correctedIngredients,
    totalWeightPerPortion: weightPerPortion,
  };
}

interface SelectedFoodwaste {
  product_description: string;
  brand: string;
  store_name: string;
  original_price: number;
  new_price: number;
  percent_discount: number;
  stock: number;
  stock_unit: string;
}

interface MealPlanRequest {
  duration_days: number;
  start_date: string;
  custom_request?: string;
  selected_foodwaste?: SelectedFoodwaste[];
}

interface FixedMeal {
  day: string;
  meal: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealException {
  day: string;
  meal: string;
  type: string;
  description?: string;
}

interface ExtraCalories {
  description: string;
  calories_per_week: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealPlanPreferences {
  cooking_style: string;
  skip_breakfast: boolean;
  skip_lunch: boolean;
  skip_dinner: boolean;
  fixed_meals: FixedMeal[];
  exceptions: MealException[];
  extra_calories: ExtraCalories[];
  weekday_max_cook_time: number;
  weekend_max_cook_time: number;
  generate_alternatives: number;
  max_weekly_budget?: number;
}

function getCurrentSeason(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'forår';
  if (month >= 5 && month <= 7) return 'sommer';
  if (month >= 8 && month <= 10) return 'efterår';
  return 'vinter';
}

function getSeasonalIngredients(season: string): string[] {
  const seasonal: Record<string, string[]> = {
    forår: ['asparges', 'radiser', 'spinat', 'ramsløg', 'jordbær', 'rabarber'],
    sommer: ['tomater', 'agurk', 'squash', 'bønner', 'bær', 'majs', 'salat'],
    efterår: ['græskar', 'svampe', 'æbler', 'pærer', 'kål', 'rødbeder'],
    vinter: ['rodfrugter', 'grønkål', 'porrer', 'selleri', 'gulerødder', 'kartofler', 'løg'],
  };
  return seasonal[season] || seasonal.vinter;
}

// ============ VARIATION: RANDOM FLAVORS & PROTEINS ============
interface RecipeVariation {
  flavor: string;
  protein: string;
  cookingMethod: string;
  mealType: string;
  cuisine: string;
}

function getRandomVariation(): RecipeVariation {
  const flavors = [
    'cremet og rig', 'let og frisk', 'krydret og aromatisk',
    'rustik og hjemmelavet', 'elegant og moderne', 'comfort food',
    'sprød og saftig', 'varmende og fyldig'
  ];

  const proteins = [
    'kyllingebryst', 'kyllingelår', 'hakket oksekød', 'svinekotelet',
    'laksfilet', 'torsk', 'rejer', 'æg', 'kikærter/linser',
    'flæskesteg', 'medisterpølse', 'kalkunbryst'
  ];

  const methods = [
    'ovnbagt', 'stegt på pande', 'langtidsstegt i gryde',
    'wok-stegt', 'grillet', 'dampet', 'braiseret', 'gratineret',
    'slow cooker', 'one-pot'
  ];

  const mealTypes = [
    'one-pot ret', 'bowl med base', 'wrap/tortilla',
    'suppe med brød', 'klassisk gryderet', 'wok med nudler/ris',
    'ovnret med tilbehør', 'pasta med sauce', 'salat med protein'
  ];

  const cuisines = [
    'dansk/nordisk', 'italiensk', 'asiatisk/thai', 'mexicansk/tex-mex',
    'mellemøstlig/libanesisk', 'græsk/middelhav', 'indisk', 'fransk bistro',
    'amerikansk comfort', 'japansk/koreansk'
  ];

  return {
    flavor: flavors[Math.floor(Math.random() * flavors.length)],
    protein: proteins[Math.floor(Math.random() * proteins.length)],
    cookingMethod: methods[Math.floor(Math.random() * methods.length)],
    mealType: mealTypes[Math.floor(Math.random() * mealTypes.length)],
    cuisine: cuisines[Math.floor(Math.random() * cuisines.length)],
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { duration_days = 7, start_date, custom_request, selected_foodwaste } = await req.json() as MealPlanRequest;
    const startDate = start_date ? new Date(start_date) : new Date();

    // ============ FETCH ALL DATA IN PARALLEL ============
    const [
      profileResult,
      preferencesResult,
      allergensResult,
      preferredChainsResult,
      inventoryResult,
      ingredientPrefsResult,
      swipesResult,
      recentMealsResult,
      discoverSwipesResult,
      mealPlanSwipesResult,
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('meal_plan_preferences').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_allergens').select('allergen_id, allergens(name)').eq('user_id', user.id),
      supabase.from('user_preferred_chains').select('chain_id, store_chains(name)').eq('user_id', user.id),
      supabase.from('household_inventory').select('ingredient_name, quantity, unit, category, expires_at').eq('user_id', user.id).eq('is_depleted', false),
      supabase.from('ingredient_preferences').select('ingredient_name, preference').eq('user_id', user.id),
      supabase.from('swipes').select('recipe_id, direction, rating, recipes(title, ingredients)').eq('user_id', user.id).not('recipe_id', 'is', null).order('created_at', { ascending: false }).limit(100),
      supabase.from('meal_plans').select('meals, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(2),
      // Hent discover swipes med ratings
      supabase.from('swipes').select('discover_recipe_id, direction, rating, discover_recipes(title, key_ingredients)').eq('user_id', user.id).not('discover_recipe_id', 'is', null),
      // Hent meal plan swipes (AI-genererede retter)
      supabase.from('swipes').select('rating, meal_plan_recipe_title, meal_plan_key_ingredients').eq('user_id', user.id).not('meal_plan_recipe_title', 'is', null),
      // NOTE: Foodwaste hentes KUN når bruger eksplicit vælger dem (sendes med i request)
    ]);

    const profile = profileResult.data;
    const prefs: MealPlanPreferences = preferencesResult.data || {
      cooking_style: 'daily',
      skip_breakfast: false,
      skip_lunch: false,
      skip_dinner: false,
      fixed_meals: [],
      exceptions: [],
      extra_calories: [],
      weekday_max_cook_time: 30,
      weekend_max_cook_time: 60,
      generate_alternatives: 0,
    };

    // ============ PRIORITY 1: CRITICAL ============

    // 1.1 Allergens (NEVER use these)
    const allergenNames = (allergensResult.data || [])
      .map((ua: any) => ua.allergens?.name)
      .filter(Boolean);

    // 1.2 Process discover ratings for preferences
    const discoverSwipes = discoverSwipesResult.data || [];
    
    // LIVRETTER (love) - ingredienser brugeren ELSKER
    const lovedDishes = discoverSwipes.filter((s: any) => s.rating === 'love');
    const lovedIngredients = [...new Set(lovedDishes.flatMap((s: any) => s.discover_recipes?.key_ingredients || []))];
    const lovedDishNames = lovedDishes.map((s: any) => s.discover_recipes?.title).filter(Boolean);
    
    // Gode retter (like) - brugeren kan lide disse
    const likedDishes = discoverSwipes.filter((s: any) => s.rating === 'like');
    const likedIngredients = [...new Set(likedDishes.flatMap((s: any) => s.discover_recipes?.key_ingredients || []))];
    
    // Ikke fan (dislike) - undgå helst disse
    const dislikedDishes = discoverSwipes.filter((s: any) => s.rating === 'dislike');
    const dislikedIngredients = [...new Set(dislikedDishes.flatMap((s: any) => s.discover_recipes?.key_ingredients || []))];
    
    // HADER (hate) - ALDRIG brug disse ingredienser
    const hatedDishes = discoverSwipes.filter((s: any) => s.rating === 'hate');
    const hatedIngredients = [...new Set(hatedDishes.flatMap((s: any) => s.discover_recipes?.key_ingredients || []))];
    const hatedDishNames = hatedDishes.map((s: any) => s.discover_recipes?.title).filter(Boolean);

    // 1.3 Process meal plan swipes (AI-genererede retter fra tidligere)
    const mealPlanSwipes = mealPlanSwipesResult.data || [];
    const mpLovedIngredients = mealPlanSwipes
      .filter((s: any) => s.rating === 'love')
      .flatMap((s: any) => s.meal_plan_key_ingredients || []);
    const mpLikedIngredients = mealPlanSwipes
      .filter((s: any) => s.rating === 'like')
      .flatMap((s: any) => s.meal_plan_key_ingredients || []);
    const mpHatedIngredients = mealPlanSwipes
      .filter((s: any) => s.rating === 'hate')
      .flatMap((s: any) => s.meal_plan_key_ingredients || []);
    const mpDislikedIngredients = mealPlanSwipes
      .filter((s: any) => s.rating === 'dislike')
      .flatMap((s: any) => s.meal_plan_key_ingredients || []);

    // 1.4 Hard dislikes (from ingredient_preferences + "never" swipes + hated discover dishes + meal plan hates)
    const hardDislikes = (ingredientPrefsResult.data || [])
      .filter((p: any) => p.preference === 'dislike' || p.preference === 'never')
      .map((p: any) => p.ingredient_name);

    const neverSwipes = (swipesResult.data || [])
      .filter((s: any) => s.direction === 'down' || s.rating === 'hate')
      .flatMap((s: any) => {
        const ingredients = s.recipes?.ingredients;
        if (Array.isArray(ingredients)) {
          return ingredients.map((i: any) => typeof i === 'string' ? i : i.name).filter(Boolean);
        }
        return [];
      });
    
    // Kombiner alle hårde dislikes
    const allDislikes = [...new Set([...hardDislikes, ...neverSwipes, ...hatedIngredients, ...mpHatedIngredients])];
    
    // Kombiner alle likes
    const allLovedIngredients = [...new Set([...lovedIngredients, ...mpLovedIngredients])];
    const allLikedIngredients = [...new Set([...likedIngredients, ...mpLikedIngredients])];

    // 1.5 Calculate adjusted macros
    const baseCalories = profile?.daily_calories || 2000;
    const baseProtein = profile?.daily_protein_target || 75;
    const baseCarbs = profile?.daily_carbs_target || 250;
    const baseFat = profile?.daily_fat_target || 65;

    const extraCaloriesPerDay = (prefs.extra_calories || []).reduce(
      (sum: number, item: ExtraCalories) => sum + (item.calories_per_week / 7), 0
    );
    const extraProteinPerDay = (prefs.extra_calories || []).reduce(
      (sum: number, item: ExtraCalories) => sum + (item.protein / 7), 0
    );

    const fixedCaloriesPerDay = (prefs.fixed_meals || []).reduce((sum: number, meal: FixedMeal) => {
      if (meal.day === 'all') return sum + meal.calories;
      return sum + (meal.calories / 7);
    }, 0);
    const fixedProteinPerDay = (prefs.fixed_meals || []).reduce((sum: number, meal: FixedMeal) => {
      if (meal.day === 'all') return sum + meal.protein;
      return sum + (meal.protein / 7);
    }, 0);

    const availableCalories = Math.round(baseCalories - extraCaloriesPerDay - fixedCaloriesPerDay);
    const availableProtein = Math.round(baseProtein - extraProteinPerDay - fixedProteinPerDay);

    // 1.6 Meal structure - only for calorie calculation
    const mealsToInclude: string[] = [];
    if (!prefs.skip_breakfast) mealsToInclude.push('breakfast');
    if (!prefs.skip_lunch) mealsToInclude.push('lunch');
    if (!prefs.skip_dinner) mealsToInclude.push('dinner');
    const mealsPerDay = mealsToInclude.length || 3;

    // ============ CALCULATE TOTAL RECIPES TO GENERATE ============
    // NY LOGIK: Generer (needed + 3) retter TOTAL i én samlet liste
    const getRecipesToGenerate = (): { needed: number; total: number } => {
      switch (prefs.cooking_style) {
        case 'meal_prep_2': return { needed: 2, total: 5 };  // 2 + 3
        case 'meal_prep_3': return { needed: 3, total: 6 };  // 3 + 3
        case 'meal_prep_4': return { needed: 4, total: 7 };  // 4 + 3
        case 'daily':
        default:
          return { needed: duration_days, total: duration_days + 3 }; // 7 + 3 = 10
      }
    };
    const { needed: recipesNeeded, total: recipesToGenerate } = getRecipesToGenerate();
    
    // Custom request sektion
    const customRequestSection = custom_request && custom_request.trim() 
      ? `
🎯 BRUGERENS SPECIFIKKE ØNSKE (HØJESTE PRIORITET):
"${custom_request}"
⚠️ UFRAVIGELIGT: Dette ønske har ABSOLUT HØJESTE prioritet og SKAL respekteres!`
      : '';

    // ============ PRIORITY 2: IMPORTANT ============

    const chainIds = (preferredChainsResult.data || []).map((pc: any) => pc.chain_id);
    const chainNames = (preferredChainsResult.data || []).map((pc: any) => pc.store_chains?.name).filter(Boolean);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + duration_days);

    // Hvis brugeren ikke har nogen foretrukne butikker, hent ingen tilbud
    let offers: any[] = [];

    if (chainIds.length > 0) {
      const { data: offersData } = await supabase
        .from('offers')
        .select('id, product_name, offer_text, offer_price_dkk, original_price_dkk, valid_from, valid_until, chain_id, store_chains(name)')
        .eq('is_active', true)
        .in('chain_id', chainIds)
        .lte('valid_from', endDate.toISOString().split('T')[0])
        .gte('valid_until', startDate.toISOString().split('T')[0])
        .order('offer_price_dkk', { ascending: true })
        .limit(50);

      offers = offersData || [];
    }

    // 🔴 KATEGORISER PROTEIN-TILBUD FØRST (for tilbuds-baseret opskriftsgenerering)
    // Protein keywords - KUN rigtige proteinkilder
    const proteinKeywords = ['kylling', 'okse', 'svine', 'laks', 'torsk', 'hakket', 'bøf', 'filet', 'rejer', 'flæsk', 'bacon', 'medister', 'fisk', 'oksekød', 'svinekød', 'kalkun', 'and', 'lam', 'skinke', 'pølse', 'frikadelle', 'karbonade', 'schnitzel', 'mørbrad', 'tun', 'makrel'];
    // Ekskluder grøntsager der fejlagtigt matcher (f.eks. "grønkål" matcher "kål" men er ikke protein)
    const excludeKeywords = ['kål', 'rosenkål', 'grønkål', 'hvidkål', 'rødkål', 'blomkål', 'spidskål', 'savoykål', 'grøntsag', 'frugt', 'vand', 'sodavand', 'juice', 'øl', 'vin', 'snack', 'chips', 'kiks', 'brød', 'mel', 'sukker', 'slik', 'chokolade', 'is', 'yoghurt', 'mælk', 'ost'];

    const proteinOffers = (offers || []).filter((o: any) => {
      const text = ((o.offer_text || '') + ' ' + (o.product_name || '')).toLowerCase();
      // Tjek at det matcher protein OG IKKE matcher exclude-list
      const hasProtein = proteinKeywords.some(kw => text.includes(kw));
      const isExcluded = excludeKeywords.some(kw => text.includes(kw));
      return hasProtein && !isExcluded;
    });

    // 📊 TABEL-FORMAT for protein-tilbud (mere kompakt og læsbart)
    const proteinOffersSection = proteinOffers.length > 0 ? `
🥩 PROTEIN PÅ TILBUD (byg opskrifter rundt om disse!):
┌─────────────────────────────────────────────────────────────┐
${proteinOffers.slice(0, 6).map((o: any) => {
  const name = (o.offer_text || o.product_name || '').substring(0, 35).padEnd(35);
  const price = `${o.offer_price_dkk} kr`.padStart(8);
  const savings = o.original_price_dkk && o.offer_price_dkk
    ? `-${(o.original_price_dkk - o.offer_price_dkk).toFixed(0)}kr`.padStart(6)
    : ''.padStart(6);
  const store = (o.store_chains?.name || '').substring(0, 12);
  return `│ ${name} │${price}${savings} │ ${store}`;
}).join('\n')}
└─────────────────────────────────────────────────────────────┘
` : '';

    // 📊 KOMPAKT TILBUDS-FORMAT (kategoriseret)
    const categorizeOffer = (text: string): string => {
      const t = text.toLowerCase();
      if (proteinKeywords.some(kw => t.includes(kw)) && !excludeKeywords.some(kw => t.includes(kw))) return 'protein';
      if (['pasta', 'ris', 'nudler', 'kartof', 'brød', 'mel'].some(kw => t.includes(kw))) return 'kulhydrat';
      if (['tomat', 'gulerod', 'løg', 'peber', 'squash', 'salat', 'agurk', 'spinat', 'broccoli'].some(kw => t.includes(kw))) return 'grøntsag';
      if (['æble', 'banan', 'appelsin', 'bær', 'frugt'].some(kw => t.includes(kw))) return 'frugt';
      if (['mælk', 'ost', 'yoghurt', 'smør', 'fløde'].some(kw => t.includes(kw))) return 'mejeri';
      return 'andet';
    };

    // Filtrer tilbud til kun mad-relevante (ekskluder sodavand, snacks, non-food)
    const foodOffers = (offers || []).filter((o: any) => {
      const text = ((o.offer_text || '') + ' ' + (o.product_name || '')).toLowerCase();
      const nonFoodKeywords = ['sodavand', 'cola', 'øl', 'vin', 'spiritus', 'vand', 'juice', 'kaffe', 'te', 'slik', 'chips', 'snack', 'kiks', 'is', 'vanter', 'handsker', 'strømper', 'tøj', 'rengøring', 'shampoo', 'sæbe', 'papir', 'batteri', 'pære', 'stearinlys'];
      return !nonFoodKeywords.some(kw => text.includes(kw));
    });

    // Gruppér tilbud efter kategori
    const offersByCategory: Record<string, any[]> = {};
    foodOffers.slice(0, 25).forEach((o: any) => {
      const cat = categorizeOffer((o.offer_text || '') + ' ' + (o.product_name || ''));
      if (!offersByCategory[cat]) offersByCategory[cat] = [];
      if (offersByCategory[cat].length < 5) offersByCategory[cat].push(o);
    });

    const categoryEmojis: Record<string, string> = { protein: '🥩', kulhydrat: '🍝', grøntsag: '🥬', frugt: '🍎', mejeri: '🧀', andet: '📦' };
    const categoryNames: Record<string, string> = { protein: 'Protein', kulhydrat: 'Kulhydrater', grøntsag: 'Grøntsager', frugt: 'Frugt', mejeri: 'Mejeri', andet: 'Andet' };

    const formattedOffers = Object.entries(offersByCategory)
      .filter(([_, items]) => items.length > 0)
      .map(([cat, items]) => {
        const emoji = categoryEmojis[cat] || '📦';
        const name = categoryNames[cat] || 'Andet';
        const itemsList = items.map((o: any) => {
          const shortName = (o.offer_text || o.product_name || '').substring(0, 40);
          const price = o.offer_price_dkk;
          const store = (o.store_chains?.name || '').substring(0, 10);
          return `  • ${shortName}: ${price}kr @${store}`;
        }).join('\n');
        return `${emoji} ${name}:\n${itemsList}`;
      }).join('\n\n');

    const weeklyBudget = prefs.max_weekly_budget || profile?.budget_per_week || 800;

    const likes = (ingredientPrefsResult.data || [])
      .filter((p: any) => p.preference === 'like')
      .map((p: any) => p.ingredient_name);

    const positiveSwipes = (swipesResult.data || [])
      .filter((s: any) => s.direction === 'right' || s.direction === 'up')
      .flatMap((s: any) => {
        const ingredients = s.recipes?.ingredients;
        if (Array.isArray(ingredients)) {
          return ingredients.map((i: any) => typeof i === 'string' ? i : i.name).filter(Boolean);
        }
        return [];
      });
    const allLikes = [...new Set([...likes, ...positiveSwipes, ...allLovedIngredients, ...allLikedIngredients])].slice(0, 20);

    const season = getCurrentSeason();
    const seasonalIngredients = getSeasonalIngredients(season);

    // ============ PRIORITY 3: NICE-TO-HAVE ============
    const weekdayMaxTime = prefs.weekday_max_cook_time || 30;
    const weekendMaxTime = prefs.weekend_max_cook_time || 60;

    const inventory = inventoryResult.data || [];

    // 📦 KOMPAKT LAGER-FORMAT (grupperet efter kategori)
    const inventoryByCategory: Record<string, any[]> = {};
    const categoryOrder = ['protein', 'kulhydrat', 'grøntsag', 'mejeri', 'krydderi', 'basis', 'andet'];

    inventory.forEach((item: any) => {
      const cat = item.category?.toLowerCase() || 'andet';
      // Map til simplere kategorier
      let mappedCat = 'andet';
      if (['kød', 'fisk', 'protein'].some(k => cat.includes(k))) mappedCat = 'protein';
      else if (['kulhydrat', 'pasta', 'ris', 'brød'].some(k => cat.includes(k))) mappedCat = 'kulhydrat';
      else if (['grøntsag', 'frugt'].some(k => cat.includes(k))) mappedCat = 'grøntsag';
      else if (['mejeri', 'mælk', 'ost'].some(k => cat.includes(k))) mappedCat = 'mejeri';
      else if (['krydderi', 'krydder'].some(k => cat.includes(k))) mappedCat = 'krydderi';
      else if (['basis', 'olie', 'sauce', 'konserves'].some(k => cat.includes(k))) mappedCat = 'basis';

      if (!inventoryByCategory[mappedCat]) inventoryByCategory[mappedCat] = [];
      inventoryByCategory[mappedCat].push(item);
    });

    const inventoryCategoryNames: Record<string, string> = {
      protein: '🥩 Protein', kulhydrat: '🍝 Kulhydrater', grøntsag: '🥬 Grøntsager',
      mejeri: '🧀 Mejeri', krydderi: '🧂 Krydderier', basis: '🫒 Basis', andet: '📦 Andet'
    };

    // Kompakt format: vis kun ingrediensnavne (ikke mængder på krydderier/basis)
    const inventoryItems = categoryOrder
      .filter(cat => inventoryByCategory[cat]?.length > 0)
      .map(cat => {
        const items = inventoryByCategory[cat];
        const catName = inventoryCategoryNames[cat] || cat;
        if (['krydderi', 'basis'].includes(cat)) {
          // Bare navne for krydderier/basis (uden mængder)
          return `${catName}: ${items.map((i: any) => i.ingredient_name).join(', ')}`;
        } else {
          // Med mængder for protein/kulhydrater/grøntsager
          const itemsList = items.slice(0, 5).map((i: any) => {
            const qty = i.quantity ? `${i.quantity}${i.unit || ''}` : '';
            const expiry = i.expires_at ? ` ⚠️${i.expires_at.substring(5, 10)}` : '';
            return qty ? `${i.ingredient_name}(${qty}${expiry})` : i.ingredient_name;
          }).join(', ');
          return `${catName}: ${itemsList}${items.length > 5 ? ` +${items.length - 5} mere` : ''}`;
        }
      }).join('\n');

    // 🔄 DE-DUPLIKÉR nylige retter
    const recentMealTitlesRaw: string[] = [];
    (recentMealsResult.data || []).forEach((plan: any) => {
      if (Array.isArray(plan.meals)) {
        plan.meals.forEach((day: any) => {
          if (day.breakfast?.title) recentMealTitlesRaw.push(day.breakfast.title);
          if (day.lunch?.title) recentMealTitlesRaw.push(day.lunch.title);
          if (day.dinner?.title) recentMealTitlesRaw.push(day.dinner.title);
        });
      }
    });
    // Unikke titler kun
    const recentMealTitles = [...new Set(recentMealTitlesRaw)];

    // ============ PRIORITY 4: CONTEXT ============
    const likedRecipes = (swipesResult.data || [])
      .filter((s: any) => s.direction === 'right' || s.direction === 'up')
      .map((s: any) => s.recipes?.title)
      .filter(Boolean)
      .slice(0, 10);

    const dietaryGoal = profile?.dietary_goal || 'maintain';
    const prioritizeBudget = dietaryGoal === 'maintain' || (weeklyBudget && weeklyBudget < 600);

    // ============ FOOD WASTE PRODUKTER (Salling Group) ============
    // Brug selected_foodwaste fra request hvis det findes, ellers hent fra database
    let foodWasteSection = '';

    if (selected_foodwaste && selected_foodwaste.length > 0) {
      // Bruger har valgt specifikke madspild produkter
      console.log('Using selected foodwaste from request:', selected_foodwaste.length, 'products');

      foodWasteSection = `
🌱 MADSPILD-TILBUD (BRUGER HAR VALGT DISSE - BRUG DEM!):
${selected_foodwaste.map((p) => {
  const savings = (p.original_price - p.new_price).toFixed(0);
  return `- ${p.product_description} @ ${p.store_name || p.brand}
    FØR: ${p.original_price} kr → NU: ${p.new_price} kr (SPAR ${savings} kr / -${Math.round(p.percent_discount)}%)
    Lager: ${p.stock || '?'} ${p.stock_unit || 'stk'}`;
}).join('\n')}

⚡ MADSPILD-REGLER (UFRAVIGELIGE - BRUGEREN HAR SPECIFIKT VALGT DISSE!):
1. BRUG ALLE disse madspild-varer i opskrifterne! Brugeren har selv valgt dem!
2. Disse har HØJESTE prioritet - lav opskrifter der bruger disse ingredienser
3. Beregn besparelsen i "uses_offers" feltet med "store": "Salling (madspild)"
`;
    } else {
      // Ingen madspild valgt - inkluder IKKE automatisk i prompten
      console.log('No foodwaste selected by user - skipping foodwaste section');
    }

    // ============ BUILD PRIORITIZED AI PROMPT ============
    const fixedMealsDescription = (prefs.fixed_meals || []).length > 0
      ? (prefs.fixed_meals || []).map((m: FixedMeal) => 
          `${m.day === 'all' ? 'Hver dag' : m.day} ${m.meal}: "${m.description}" (${m.calories} kcal)`
        ).join('\n')
      : 'Ingen';

    const exceptionsDescription = (prefs.exceptions || []).length > 0
      ? (prefs.exceptions || []).map((e: MealException) => 
          `${e.day} ${e.meal}: ${e.type}${e.description ? ` (${e.description})` : ''}`
        ).join('\n')
      : 'Ingen';

    const extraCaloriesDescription = (prefs.extra_calories || []).length > 0
      ? (prefs.extra_calories || []).map((e: ExtraCalories) => 
          `${e.description}: ${e.calories_per_week} kcal/uge`
        ).join('\n')
      : 'Ingen';

    const inventorySection = prioritizeBudget && inventory.length > 0
      ? `
🔴 KRITISK - BRUG LAGER-INGREDIENSER FØRST (bruger har dem = GRATIS):
${inventoryItems}
⚠️ UFRAVIGELIGT: Retter der bruger ingredienser fra lageret SKAL prioriteres højest!`
      : `
🟡 Brug fra lager hvis det passer:
${inventoryItems || 'Ingen varer i lageret'}`;

    const focusSection = prioritizeBudget
      ? `
🔴 KRITISK - BUDGET-FOKUS:
- HOLD max ugentligt budget: ${weeklyBudget} kr
- Prioriter BILLIGE ingredienser og tilbud`
      : `
🔴 KRITISK - SUNDHEDS-FOKUS:
- Ernæringsmål: ${dietaryGoal === 'lose' ? 'VÆGTTAB' : dietaryGoal === 'gain' ? 'MUSKELOPBYGNING' : 'vedligehold'}
- Fokuser på NÆRINGSINDHOLD og makrobalance`;

    const discoverPreferencesSection = allLovedIngredients.length > 0 || allDislikes.length > 0 ? `

🔥 BRUGERENS SMAGSPROFIL (fra tidligere swipes):
${lovedDishNames.length > 0 ? `LIVRETTER: ${lovedDishNames.slice(0, 5).join(', ')}` : ''}
${allLovedIngredients.length > 0 ? `Elskede ingredienser (brug OFTE): ${allLovedIngredients.slice(0, 15).join(', ')}` : ''}
${allLikedIngredients.length > 0 ? `Kan godt lide: ${allLikedIngredients.slice(0, 10).join(', ')}` : ''}
${[...dislikedIngredients, ...mpDislikedIngredients].length > 0 ? `Undgå helst: ${[...new Set([...dislikedIngredients, ...mpDislikedIngredients])].slice(0, 10).join(', ')}` : ''}
${hatedDishNames.length > 0 ? `🤮 HADER (ALDRIG lignende!): ${hatedDishNames.slice(0, 5).join(', ')}` : ''}` : '';

    // NY PROMPT: Én samlet liste af retter
    const cookingStyleDescription = prefs.cooking_style === 'daily' 
      ? `DAGLIG MADLAVNING: ${recipesNeeded} forskellige retter (én ny ret hver dag)`
      : `MEAL PREP: ${recipesNeeded} retter der skal genbruges hele ugen (laves i store portioner)`;

    // 🍽️ SIMPEL PROMPT: AI giver ALTID per-portion, backend ganger op
    const simplifiedPrompt = `
INGREDIENS-REGLER (KRITISK):
- Alle mængder er PER PORTION (1 person)
- Backend ganger automatisk op til antal portioner
- Max 10-12 ingredienser per ret

PER-PORTION MÆNGDER (brug disse som guide):
• Kød/fisk: 120-180g
• Pasta/ris (tør): 80-100g
• Kartofler: 200-300g
• Linser/bønner: 60-100g
• Grøntsager: 100-150g
• Ost: 25-50g

EKSEMPEL (korrekt per-portion):
{"name": "kyllingebryst", "amount": "150", "unit": "g"}
{"name": "pasta", "amount": "85", "unit": "g"}
{"name": "fløde", "amount": "0.5", "unit": "dl"}
{"name": "løg", "amount": "1", "unit": "stk"}

MAKROER er også PER PORTION.`;

    // 🧹 BYGG DYNAMISK PROMPT - kun inkluder ikke-tomme sektioner
    const criticalRules: string[] = [];
    if (allergenNames.length > 0) {
      criticalRules.push(`⛔ ALLERGENER (ALDRIG brug): ${allergenNames.join(', ')}`);
    }
    if (allDislikes.length > 0) {
      criticalRules.push(`🚫 HADER (undgå): ${allDislikes.slice(0, 12).join(', ')}`);
    }
    criticalRules.push(`🎯 Kalorie-mål: ~${Math.round(availableCalories / mealsPerDay)} kcal/ret`);
    criticalRules.push(`💪 Protein-mål: ~${Math.round(availableProtein / mealsPerDay)}g/ret`);

    const otherPriorities: string[] = [];
    if (allLikes.length > 0) {
      otherPriorities.push(`❤️ Elsker: ${allLikes.slice(0, 12).join(', ')}`);
    }
    otherPriorities.push(`🌿 Sæson (${season}): ${seasonalIngredients.join(', ')}`);
    otherPriorities.push(`⏱️ Max tid: ${weekdayMaxTime}-${weekendMaxTime} min`);
    if (recentMealTitles.length > 0) {
      otherPriorities.push(`🔄 Undgå nylige: ${recentMealTitles.slice(0, 6).join(', ')}`);
    }

    const systemPrompt = `Du er en erfaren dansk madplanlægger.
${customRequestSection}
${discoverPreferencesSection}

${simplifiedPrompt}

🔴 KRITISKE REGLER:
${criticalRules.join('\n')}

📋 MADLAVNINGSSTIL: ${cookingStyleDescription}
${foodWasteSection}
${proteinOffersSection}
${inventorySection}
${focusSection}
${formattedOffers ? `\n🛒 TILBUD:\n${formattedOffers}` : ''}

🟡 PRIORITETER:
${otherPriorities.join('\n')}

📊 OUTPUT (KUN JSON):
{
  "recipes": [
    {
      "id": "unique-id",
      "title": "Ret navn",
      "description": "Kort beskrivelse",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "prep_time": number,
      "cook_time": number,
      "servings": 1,
      "ingredients": [
        {"name": "kyllingebryst", "amount": "150", "unit": "g"},
        {"name": "pasta", "amount": "85", "unit": "g"},
        {"name": "fløde", "amount": "0.5", "unit": "dl"}
      ],
      "instructions": ["Trin 1...", "Trin 2..."],
      "tags": ["hurtig", "høj-protein"],
      "key_ingredients": ["kylling", "pasta"],
      "uses_offers": [{"offer_text": "string", "store": "string", "savings": number}],
      "estimated_price": number
    }
  ]
}

VIGTIGT: Alle mængder og makroer er PER PORTION. Backend skalerer automatisk.`;

    // Tilføj variation
    const variation = getRandomVariation();

    const userPrompt = `Lav ${recipesToGenerate} UNIKKE og VARIEREDE retter til en ${duration_days}-dages madplan.

🎲 DENNE UGES TEMA (følg dette for variation!):
- Smag/stil: ${variation.flavor}
- Hovedprotein: ${variation.protein}
- Tilberedning: ${variation.cookingMethod}
- Ret-type: ${variation.mealType}
- Køkken: ${variation.cuisine}

📋 VARIATIONS-KRAV (UFRAVIGELIGE):
1. Mindst 2 retter skal følge DENNE UGES TEMA
2. Max 2 retter med SAMME hovedprotein - ALDRIG 3 retter med kylling/laks/etc.
3. Mix af hurtige (15-20 min) og langsomme (45-60 min) retter
4. Mindst 1 vegetar-venlig ret eller ret med bælgfrugter
5. UNDGÅ disse nylige retter: ${recentMealTitles.slice(0, 10).join(', ') || 'Ingen'}
6. ALDRIG to retter med næsten identisk navn eller tilberedningsmåde (fx "Sprød Indisk Kalkunsalat" og "Tandoori Kalkunsalat")
7. Variér køkkener: mix af dansk, asiatisk, italiensk, mexicansk etc. - ALDRIG mere end 3 retter fra samme køkken

Husk (mængder er PER PORTION - backend skalerer automatisk):
- ${recipesNeeded} retter vælges af brugeren
- Giv ${recipesToGenerate - recipesNeeded} ekstra alternativer
- Varier proteiner og tilberedningsmetoder
- ALDRIG lyv om makroer - beregn dem fra ingredienserne!

Lav retterne nu!`;

    console.log('='.repeat(80));
    console.log('GENERATING MEAL PLAN');
    console.log('='.repeat(80));
    console.log('\n📋 CONFIG:', {
      cooking_style: prefs.cooking_style,
      recipesNeeded,
      recipesToGenerate,
      duration_days,
      availableCalories,
      availableProtein,
    });
    console.log('\n📊 DATA:', {
      offers: offers?.length || 0,
      inventory: inventory.length,
      allergens: allergenNames.length,
      dislikes: allDislikes.length,
      lovedIngredients: allLovedIngredients.length,
    });
    console.log('\n🤖 SYSTEM PROMPT (first 2000 chars):');
    console.log(systemPrompt.substring(0, 2000));
    console.log('\n👤 USER PROMPT:');
    console.log(userPrompt);
    console.log('='.repeat(80));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey!,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit nået. Prøv igen om lidt.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.content?.[0]?.text;

    if (!content) {
      throw new Error('No content from AI');
    }

    console.log('AI response received, parsing...');

    let mealPlanData;
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      mealPlanData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse meal plan from AI');
    }

    // ============ SKALÉR ALLE OPSKRIFTER TIL KORREKT ANTAL PORTIONER ============
    // AI giver per-portion mængder, vi ganger op til det antal portioner brugeren har valgt
    const rawRecipes = mealPlanData.recipes || [];
    const targetServings = duration_days; // 7 dage = 7 portioner

    console.log(`\n🔄 Scaling all recipes to ${targetServings} servings...`);

    const scaledRecipes = rawRecipes.map((recipe: any) => {
      const ingredients = recipe.ingredients || [];

      console.log(`\n📦 Scaling: "${recipe.title}"`);

      // Gang ALLE ingredienser med targetServings
      const scaledIngredients = ingredients.map((ing: any) => {
        const amount = parseFloat(ing.amount) || 0;
        const unit = (ing.unit || '').toLowerCase();

        // Numeriske mængder ganges med portioner
        if (['g', 'gram', 'kg', 'ml', 'dl', 'l'].includes(unit)) {
          const newAmount = Math.round(amount * targetServings);
          console.log(`   ${ing.name}: ${amount}${unit} × ${targetServings} = ${newAmount}${unit}`);
          return { ...ing, amount: String(newAmount) };
        }

        // Stk-baserede mængder ganges også
        if (unit === 'stk' || unit === 'stk.' || unit === '') {
          const newAmount = Math.ceil(amount * targetServings);
          console.log(`   ${ing.name}: ${amount} stk × ${targetServings} = ${newAmount} stk`);
          return { ...ing, amount: String(newAmount), unit: 'stk' };
        }

        // Fed, tsk, spsk - gang også op
        if (['fed', 'tsk', 'spsk'].includes(unit)) {
          const newAmount = Math.ceil(amount * targetServings);
          console.log(`   ${ing.name}: ${amount} ${unit} × ${targetServings} = ${newAmount} ${unit}`);
          return { ...ing, amount: String(newAmount) };
        }

        return ing;
      });

      // Returner skaleret opskrift
      return {
        ...recipe,
        servings: targetServings,
        ingredients: scaledIngredients,
      };
    });

    console.log(`\n✅ Scaled ${scaledRecipes.length} recipes to ${targetServings} servings each`);

    // ============ BEREGN MAKRO-MÅL PER RET ============
    const mealsPerDayCount = mealsPerDay || 2;
    const macroTargets = {
      caloriesPerRecipe: Math.round(availableCalories / mealsPerDayCount),
      proteinPerRecipe: Math.round((availableProtein || baseProtein) / mealsPerDayCount),
      carbsPerRecipe: Math.round(baseCarbs / mealsPerDayCount),
      fatPerRecipe: Math.round(baseFat / mealsPerDayCount),
    };
    console.log('🎯 Makro-mål per ret:', macroTargets);

    // ============ VALIDER OG KORRIGER ALLE OPSKRIFTER ============
    console.log('\n🔍 VALIDATING AND CORRECTING ALL RECIPES...');

    const validatedRecipes = scaledRecipes.map((recipe: any) => {
      // 1. Valider ingrediens-mængder
      const ingredientValidation = validateAndCorrectIngredientAmounts(recipe);

      let correctedRecipe = {
        ...recipe,
        ingredients: ingredientValidation.correctedIngredients,
      };

      // 2. Valider og korriger makroer baseret på ingredienser
      const macroValidation = strictValidateAndCorrectRecipe(correctedRecipe);

      if (macroValidation.corrected) {
        console.log(`🔧 MACRO CORRECTION for "${recipe.title}":`);
        console.log(`   Original: ${recipe.calories} kcal, ${recipe.protein}g P`);
        console.log(`   Corrected: ${macroValidation.correctedRecipe.calories} kcal, ${macroValidation.correctedRecipe.protein}g P`);
        correctedRecipe = macroValidation.correctedRecipe;
      }

      // 3. Sanity check: Makroer skal matche kalorier
      const macroKcal = (correctedRecipe.protein * 4) + (correctedRecipe.carbs * 4) + (correctedRecipe.fat * 9);
      if (Math.abs(macroKcal - correctedRecipe.calories) > 100) {
        console.warn(`⚠️ Macro-calorie mismatch for "${recipe.title}": ${macroKcal} vs ${correctedRecipe.calories} kcal`);
        // Juster kalorier til at matche makroer
        correctedRecipe.calories = macroKcal;
      }

      // 4. Auto-justér makroer mod mål (tilføj/fjern ingredienser)
      const dietType = profile?.diet_type || 'omnivore';
      const macroAdjustment = adjustRecipeMacros(correctedRecipe, macroTargets, dietType, allergenNames);
      if (macroAdjustment.adjusted) {
        correctedRecipe = macroAdjustment.recipe;
        correctedRecipe._macro_adjustments = {
          added: macroAdjustment.addedIngredients,
          removed: macroAdjustment.removedIngredients,
        };
        console.log(`🎯 Makro-justering for "${recipe.title}": +${macroAdjustment.addedIngredients.length} ingredienser, ${macroAdjustment.removedIngredients.length} reduceret`);
      }

      // 5. Beregn pris
      const priceCalc = calculateRecipePrice(correctedRecipe.ingredients, correctedRecipe.servings || 1);
      correctedRecipe.estimated_price = priceCalc.pricePerPortion;
      correctedRecipe._price_details = { total: priceCalc.totalPrice, per_portion: priceCalc.pricePerPortion, matched_ingredients: priceCalc.matchedCount, total_ingredients: (correctedRecipe.ingredients || []).length };
      console.log(`💰 Price for "${recipe.title}": ${priceCalc.totalPrice} kr total, ${priceCalc.pricePerPortion} kr/portion`);

      return correctedRecipe;
    });

    console.log(`\n✅ Validated ${validatedRecipes.length} recipes`);

    // ============ BEREGN METRICS TIL LOGGING ============
    const totalCalories = validatedRecipes.reduce((sum: number, r: any) => sum + (r.calories || 0), 0);
    const totalProtein = validatedRecipes.reduce((sum: number, r: any) => sum + (r.protein || 0), 0);
    const totalCarbs = validatedRecipes.reduce((sum: number, r: any) => sum + (r.carbs || 0), 0);
    const totalFat = validatedRecipes.reduce((sum: number, r: any) => sum + (r.fat || 0), 0);
    const avgCaloriesPerRecipe = validatedRecipes.length > 0 ? Math.round(totalCalories / validatedRecipes.length) : 0;
    const avgPrepTime = validatedRecipes.length > 0
      ? Math.round(validatedRecipes.reduce((sum: number, r: any) => sum + (r.prep_time || 0) + (r.cook_time || 0), 0) / validatedRecipes.length)
      : 0;

    // Samle alle ingredienser
    const allIngredients: any[] = [];
    validatedRecipes.forEach((recipe: any) => {
      (recipe.ingredients || []).forEach((ing: any) => {
        allIngredients.push({
          recipe: recipe.title,
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit,
        });
      });
    });

    // Samle alle tilbud der bruges
    const offersUsed: any[] = [];
    validatedRecipes.forEach((recipe: any) => {
      (recipe.uses_offers || []).forEach((offer: any) => {
        offersUsed.push({
          recipe: recipe.title,
          offer_text: offer.offer_text,
          store: offer.store,
          savings: offer.savings,
        });
      });
    });
    const totalSavingsFromOffers = offersUsed.reduce((sum, o) => sum + (o.savings || 0), 0);

    // Estimeret totalpris
    const totalEstimatedPrice = validatedRecipes.reduce((sum: number, r: any) => sum + (r.estimated_price || 0), 0);

    // ============ GEM TIL MEAL_PLAN_LOGS ============
    const logEntry = {
      user_id: user.id,

      // Request - hvad brugeren bad om
      request: {
        duration_days,
        start_date: startDate.toISOString(),
        custom_request: custom_request || null,
        selected_foodwaste_count: selected_foodwaste?.length || 0,
        cooking_style: prefs.cooking_style,
        skip_breakfast: prefs.skip_breakfast,
        skip_lunch: prefs.skip_lunch,
        skip_dinner: prefs.skip_dinner,
      },

      // Targets - hvad vi sigtede efter
      targets: {
        calories_per_day: availableCalories,
        protein_per_day: availableProtein,
        carbs_per_day: baseCarbs,
        fat_per_day: baseFat,
        recipes_needed: recipesNeeded,
        recipes_to_generate: recipesToGenerate,
        max_budget: weeklyBudget,
        weekday_max_time: weekdayMaxTime,
        weekend_max_time: weekendMaxTime,
      },

      // Results - hvad vi faktisk genererede
      results: {
        recipes_generated: validatedRecipes.length,
        total_calories: totalCalories,
        total_protein: totalProtein,
        total_carbs: totalCarbs,
        total_fat: totalFat,
        avg_calories_per_recipe: avgCaloriesPerRecipe,
        avg_prep_time_minutes: avgPrepTime,
        total_ingredients: allIngredients.length,
        unique_ingredients: [...new Set(allIngredients.map(i => i.name.toLowerCase()))].length,
      },

      // Recipes - kompakt array af alle opskrifter
      recipes: validatedRecipes.map((r: any) => ({
        id: r.id,
        title: r.title,
        calories: r.calories,
        protein: r.protein,
        carbs: r.carbs,
        fat: r.fat,
        prep_time: r.prep_time,
        cook_time: r.cook_time,
        servings: r.servings,
        estimated_price: r.estimated_price,
        ingredients_count: (r.ingredients || []).length,
        tags: r.tags || [],
        key_ingredients: r.key_ingredients || [],
        uses_offers_count: (r.uses_offers || []).length,
      })),

      // Prices - prisdetaljer
      prices: {
        total_estimated: totalEstimatedPrice,
        per_portion: recipesNeeded > 0 ? Math.round(totalEstimatedPrice / recipesNeeded) : 0,
        savings_from_offers: totalSavingsFromOffers,
        offers_used: offersUsed,
        budget_target: weeklyBudget,
        within_budget: totalEstimatedPrice <= weeklyBudget,
      },

      // Ingredients - alle ingredienser
      ingredients: allIngredients,

      // Quality metrics
      quality_metrics: {
        calorie_target_per_recipe: Math.round(availableCalories / (mealsPerDay || 1)),
        actual_avg_calories: avgCaloriesPerRecipe,
        calorie_accuracy_pct: avgCaloriesPerRecipe > 0
          ? Math.round((1 - Math.abs(avgCaloriesPerRecipe - (availableCalories / mealsPerDay)) / (availableCalories / mealsPerDay)) * 100)
          : 0,
        protein_target_per_recipe: Math.round(availableProtein / (mealsPerDay || 1)),
        actual_avg_protein: validatedRecipes.length > 0 ? Math.round(totalProtein / validatedRecipes.length) : 0,
        variety_score: [...new Set(validatedRecipes.map((r: any) => r.key_ingredients?.[0]))].length,
        avg_prep_time: avgPrepTime,
        recipes_with_offers: validatedRecipes.filter((r: any) => (r.uses_offers || []).length > 0).length,
      },

      // AI Response metadata
      ai_response: {
        model: 'claude-sonnet-4-20250514',
        raw_recipes_count: rawRecipes.length,
        response_length: content?.length || 0,
        variation_used: variation,
      },

      // Prompts - den fulde prompt der blev sendt til AI
      prompts: {
        system_prompt: systemPrompt,
        user_prompt: userPrompt,
        system_prompt_length: systemPrompt?.length || 0,
        user_prompt_length: userPrompt?.length || 0,
        total_prompt_length: (systemPrompt?.length || 0) + (userPrompt?.length || 0),
      },

      status: 'completed',
    };

    // Gem til database - brug service role hvis tilgængelig, ellers user auth
    try {
      console.log('📊 Logging meal plan...');

      // Forbered log entry med trunkerede prompts
      const logEntryWithoutPrompts = {
        ...logEntry,
        prompts: {
          system_prompt_length: logEntry.prompts.system_prompt_length,
          user_prompt_length: logEntry.prompts.user_prompt_length,
          total_prompt_length: logEntry.prompts.total_prompt_length,
          // Gem kun første 5000 tegn af hver prompt
          system_prompt: logEntry.prompts.system_prompt?.substring(0, 5000) || '',
          user_prompt: logEntry.prompts.user_prompt?.substring(0, 5000) || '',
        }
      };

      // Prøv service role først, fallback til user auth (RLS har "Allow all inserts")
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      const logClient = supabaseServiceKey
        ? createClient(supabaseUrl, supabaseServiceKey)
        : supabase; // Fallback til user-authenticated client

      console.log('📊 Using:', supabaseServiceKey ? 'service role' : 'user auth (fallback)');

      const { data: insertedLog, error: logError } = await logClient
        .from('meal_plan_logs')
        .insert(logEntryWithoutPrompts)
        .select()
        .single();

      if (logError) {
        console.error('❌ Error logging meal plan:', JSON.stringify(logError));
      } else {
        console.log('✅ Meal plan logged! ID:', insertedLog?.id);
      }
    } catch (logError) {
      console.error('❌ Exception logging meal plan:', logError);
      // Fortsæt alligevel - logging fejl skal ikke blokere brugeren
    }

    return new Response(JSON.stringify({
      success: true,
      recipes: validatedRecipes,
      recipes_needed: recipesNeeded,
      macro_targets: {
        calories: availableCalories,
        protein: availableProtein,
        carbs: baseCarbs,
        fat: baseFat,
      },
      total_estimated_savings: mealPlanData.total_estimated_savings || 0,
      _scaling_info: {
        original_servings: 1,
        scaled_to: targetServings,
        recipes_count: scaledRecipes.length,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-meal-plan:', error);

    // Log fejl - tabellen tillader nu NULL på alle JSONB felter
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      // Brug service role hvis tilgængelig, ellers anon key
      const errorSupabase = createClient(
        supabaseUrl,
        supabaseServiceKey || supabaseAnonKey
      );

      await errorSupabase.from('meal_plan_logs').insert({
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
      console.log('📊 Error logged to meal_plan_logs');
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
