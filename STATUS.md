# Wizefood Meal Planner - Status

**Dato:** 28. januar 2026
**Projekt:** Wizefood - AI-drevet madplanlægger

---

## Hvad er Wizefood?

Wizefood er en dansk madplanlægger-app der bruger AI til at generere personlige madplaner baseret på brugerens:

- **Kalorie- og proteinmål** - Tilpasset vægt, højde, alder og aktivitetsniveau
- **Budget** - Ugentligt madbudget i DKK
- **Præferencer** - Allergener, yndlingsretter, og madtyper man ikke kan lide
- **Tilbud** - Integrerer aktuelle supermarkedstilbud for at spare penge

### Hovedfunktioner

| Funktion | Beskrivelse |
|----------|-------------|
| **AI Madplan** | Genererer 5 unikke retter til en uge med korrekte makroer |
| **Meal Prep** | Designet til at lave 2-3 retter der genbruges hele ugen |
| **Indkøbsliste** | Automatisk genereret liste med alle ingredienser |
| **Sæson-tilpasset** | Foreslår ingredienser der er i sæson |
| **Tilbuds-integration** | Bruger aktuelle tilbud til at spare penge |
| **Opskrift-swipe** | Tinder-stil interface til at vælge opskrifter |

### Teknologi

- **Frontend:** React + TypeScript + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **AI:** Claude Sonnet 4 (Anthropic API)
- **Hosting:** Supabase Cloud

### Målgruppe

- Travle danskere der vil spare tid på madplanlægning
- Folk der vil holde styr på kalorier og protein
- Familier der vil spare penge på mad
- Fitness-entusiaster med specifikke makro-mål

---

## Seneste opdatering (28. jan 2026)

### Hvad vi har fikset

### 1. Makro-validering (KRITISK FIX)

**Problem:** AI'en løj om makroer og priser
- Påstod 66 kcal når beregnet var 620 kcal
- Accepterede 7350g hytteost per portion
- Priser var tilfældige tal

**Løsning:** Streng REJECT-validering i `generate-meal-plan` v77

```typescript
// Afvis hvis AI's påstand afviger >50% fra beregnet
if (kcalDev > 0.5) {
  reasons.push(`REJECT: kcal deviation ${Math.round(kcalDev * 100)}%`);
}

// Afvis urealistiske ingrediensmængder
if (perPortion > 500) {
  reasons.push(`REJECT: ${ing.name} ${perPortion}g per portion is unrealistic`);
}

// Max 200g mejeri per portion
if (perPortion > 200 && name.includes('hytteost')) {
  reasons.push(`REJECT: max 200g for dairy`);
}
```

**Resultat:**

| Metric | FØR | EFTER |
|--------|-----|-------|
| avg_calories | 66 kcal (løgn) | **634 kcal** (beregnet) |
| avg_protein | 5g (løgn) | **46g** (beregnet) |
| avg_price | tilfældig | **18 kr** (beregnet) |
| Test success | ~30% | **100%** |

---

### 2. MACRO_DB - Ingrediens-database

Tilføjet priser til alle ingredienser (60+ ingredienser):

```typescript
const MACRO_DB = {
  'kyllingebryst': { kcal: 165, p: 31, c: 0, f: 3.6, price: 8 },
  'pasta': { kcal: 360, p: 13, c: 75, f: 1.5, price: 1.5 },
  'hytteost': { kcal: 98, p: 11, c: 3, f: 4, price: 3 },
  'laks': { kcal: 200, p: 20, c: 0, f: 13, price: 12 },
  // ... osv
};
```

---

### 3. Dansk tegn-normalisering

```typescript
function normalize(str: string): string {
  const code = c.charCodeAt(0);
  if (code === 230) return 'ae';  // æ
  if (code === 248) return 'o';   // ø
  if (code === 229) return 'a';   // å
}
```

---

### 4. Test-framework

- **meal_plan_test_personas** - 5 test-personas
- **meal_plan_test_runs** - Logger alle test-kørsler
- **recipe_validation_log** - Logger problematiske opskrifter
- **run-meal-plan-test** v10 - Edge function til automatiseret test

---

## Deployed versioner

| Funktion | Version | Status |
|----------|---------|--------|
| generate-meal-plan | v77 | AKTIV |
| run-meal-plan-test | v10 | AKTIV |
| verify-meal-plan | v5 | AKTIV |

**Supabase projekt:** `iuswbdcuyhtothikmrab`

---

## Git status

**Seneste commit:** `bae426a`
```
fix: Streng validering af makroer og priser i madplan-generering
```

**Ændrede filer:**
- `src/components/WeekOverview.tsx`
- `src/components/RecipeDetailDialog.tsx`
- `src/components/RecipeCard.tsx`
- `src/hooks/useMealPlans.ts`
- `supabase/functions/generate-meal-plan/index.ts`

**GitHub:** https://github.com/jacob96DD/wizefood-planner

---

## Test-resultater

### Alle personas (28. jan 2026)

```
Fitness Pro:   PASSED (717 kcal, 54g protein, 16kr)
Familie 4:     PASSED (620 kcal, 46g protein, 18kr)
Vegetar:       PASSED (652 kcal, 48g protein, 19kr)
Vægttab:       PASSED (662 kcal, 53g protein, 17kr)
Budget Single: PASSED (623 kcal, 45g protein, 17kr)
```

### Stabilitetstest (10 kørsler)
```
Passed: 9/10 (1 warning - stadig valid)
```

---

## Næste skridt

### Prioritet 1: Synkronisering
- [ ] Opdater lokal `generate-meal-plan/index.ts` med deployed kode
- [ ] Push til GitHub så kode matcher produktion

### Prioritet 2: Udvidelser
- [ ] Tilføj flere ingredienser til MACRO_DB
- [ ] Implementer tilbuds-integration (brug current_offers i prisberegning)
- [ ] Shopping list pris-beregning baseret på MACRO_DB

### Prioritet 3: Test & kvalitet
- [ ] Automatiseret daglig test af alle personas
- [ ] Dashboard til at se validation_log
- [ ] Alerts ved høj rejection rate

---

## Teknisk arkitektur

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │────>│  Supabase Edge   │────>│  Claude API     │
│   (React)       │     │  Functions       │     │  (Sonnet 4)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               v
                        ┌──────────────────┐
                        │   MACRO_DB       │
                        │   (validering)   │
                        └──────────────────┘
                               │
                               v
                        ┌──────────────────┐
                        │   Supabase DB    │
                        │   (PostgreSQL)   │
                        └──────────────────┘
```

---

## Validerings-flow

1. AI genererer opskrifter med påståede makroer
2. Backend beregner RIGTIGE makroer fra ingredienser via MACRO_DB
3. Sammenlign: hvis afvigelse > 50% → REJECT
4. Tjek ingrediensmængder: hvis > 500g per portion → REJECT
5. Tjek mejeri: hvis > 200g per portion → REJECT
6. Accepterede opskrifter får BEREGNEDE værdier (ikke AI's påstande)

---

## Kontakt

**Udvikler:** Jacob
**Email:** jacob110396@outlook.com
