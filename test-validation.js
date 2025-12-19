// Test script for ingredient validation logic
// Run with: node test-validation.js

// Simulate the validation logic from generate-meal-plan/index.ts
function validateAndCorrectIngredientAmounts(recipe) {
  const errors = [];
  const servings = recipe.servings || 1;

  console.log(`\n🔍 ========== VALIDATING: "${recipe.title}" ==========`);
  console.log(`   Servings: ${servings}`);
  console.log(`   Ingredients count: ${(recipe.ingredients || []).length}`);

  const minAmountsPerPerson = {
    'protein': 100,
    'carbs': 70,
    'potatoes': 150,
    'legumes': 50,
    'cheese': 25,
    'vegetables': 80,
  };

  const proteinKeywords = ['kød', 'kylling', 'laks', 'bacon', 'flæsk', 'okse', 'svin', 'fisk', 'rejer', 'bøf'];
  const carbKeywords = ['pasta', 'spaghetti', 'ris', 'nudler', 'penne', 'fusilli', 'bulgur', 'couscous'];
  const potatoKeywords = ['kartof', 'kartofler', 'kartoffelmos'];
  const legumeKeywords = ['linse', 'linser', 'bønner', 'kikærter', 'kidney'];

  // Calculate total weight
  let totalGrams = 0;
  const ingredients = recipe.ingredients || [];

  for (const ing of ingredients) {
    let amount = parseFloat(ing.amount) || 0;
    const unit = (ing.unit || '').toLowerCase();

    if (unit === 'g' || unit === 'gram') {
      totalGrams += amount;
    } else if (unit === 'kg') {
      totalGrams += amount * 1000;
    }
  }

  const weightPerPortion = totalGrams / servings;
  console.log(`📊 Total weight: ${totalGrams}g, per portion: ${Math.round(weightPerPortion)}g`);

  const MIN_WEIGHT_PER_PORTION = 300;

  // CATCH-ALL: If per-portion < 300g, multiply everything
  if (weightPerPortion < MIN_WEIGHT_PER_PORTION && servings > 1) {
    console.log(`⚠️ KRITISK: Kun ${Math.round(weightPerPortion)}g per portion! (minimum ${MIN_WEIGHT_PER_PORTION}g)`);
    console.log(`🔧 AUTO-KORREKTION: Ganger ALLE mængder med ${servings}`);

    errors.push(`CATCH-ALL: ${Math.round(weightPerPortion)}g/portion < ${MIN_WEIGHT_PER_PORTION}g`);

    const correctedIngredients = ingredients.map((ing) => {
      const amount = parseFloat(ing.amount) || 0;
      const unit = (ing.unit || '').toLowerCase();

      if (unit === 'g' || unit === 'gram' || unit === 'kg' || unit === 'ml' || unit === 'dl' || unit === 'l') {
        const newAmount = Math.round(amount * servings);
        console.log(`   📦 ${ing.name}: ${amount}${unit} → ${newAmount}${unit}`);
        return { ...ing, amount: String(newAmount), _corrected: true };
      }
      return ing;
    });

    const newTotalGrams = correctedIngredients.reduce((sum, ing) => {
      const amount = parseFloat(ing.amount) || 0;
      const unit = (ing.unit || '').toLowerCase();
      if (unit === 'g' || unit === 'gram') return sum + amount;
      if (unit === 'kg') return sum + amount * 1000;
      return sum;
    }, 0);

    console.log(`✅ Korrigeret total vægt: ${newTotalGrams}g (${Math.round(newTotalGrams / servings)}g per portion)`);

    return { valid: false, errors, correctedIngredients, totalWeightPerPortion: newTotalGrams / servings };
  }

  // Individual ingredient validation
  console.log(`\n📋 Checking individual ingredients:`);
  const correctedIngredients = ingredients.map((ing) => {
    const name = (ing.name || '').toLowerCase();
    let amount = parseFloat(ing.amount) || 0;
    const unit = (ing.unit || '').toLowerCase();

    if (unit !== 'g' && unit !== 'gram' && unit !== 'kg') return ing;

    let amountInGrams = amount;
    if (unit === 'kg') amountInGrams = amount * 1000;

    const perPerson = amountInGrams / servings;

    // Check proteins
    const isProtein = proteinKeywords.some(k => name.includes(k));
    if (isProtein && perPerson < minAmountsPerPerson.protein) {
      const correctedAmount = minAmountsPerPerson.protein * servings;
      errors.push(`🥩 ${ing.name}: ${amountInGrams}g → ${correctedAmount}g`);
      console.log(`   🥩 ${ing.name}: ${amountInGrams}g (${Math.round(perPerson)}g/pp) → ${correctedAmount}g`);
      return { ...ing, amount: String(correctedAmount), unit: 'g', _corrected: true };
    }

    // Check potatoes
    const isPotato = potatoKeywords.some(k => name.includes(k));
    if (isPotato && perPerson < minAmountsPerPerson.potatoes) {
      const correctedAmount = minAmountsPerPerson.potatoes * servings;
      errors.push(`🥔 ${ing.name}: ${amountInGrams}g → ${correctedAmount}g`);
      console.log(`   🥔 ${ing.name}: ${amountInGrams}g (${Math.round(perPerson)}g/pp) → ${correctedAmount}g`);
      return { ...ing, amount: String(correctedAmount), unit: 'g', _corrected: true };
    }

    // Check legumes
    const isLegume = legumeKeywords.some(k => name.includes(k));
    if (isLegume && perPerson < minAmountsPerPerson.legumes) {
      const correctedAmount = minAmountsPerPerson.legumes * servings;
      errors.push(`🫘 ${ing.name}: ${amountInGrams}g → ${correctedAmount}g`);
      console.log(`   🫘 ${ing.name}: ${amountInGrams}g (${Math.round(perPerson)}g/pp) → ${correctedAmount}g`);
      return { ...ing, amount: String(correctedAmount), unit: 'g', _corrected: true };
    }

    // Check carbs
    const isCarb = carbKeywords.some(k => name.includes(k));
    if (isCarb && perPerson < minAmountsPerPerson.carbs) {
      const correctedAmount = minAmountsPerPerson.carbs * servings;
      errors.push(`🍝 ${ing.name}: ${amountInGrams}g → ${correctedAmount}g`);
      console.log(`   🍝 ${ing.name}: ${amountInGrams}g (${Math.round(perPerson)}g/pp) → ${correctedAmount}g`);
      return { ...ing, amount: String(correctedAmount), unit: 'g', _corrected: true };
    }

    return ing;
  });

  console.log(`\n✅ Validation complete. Errors: ${errors.length}`);
  return { valid: errors.length === 0, errors, correctedIngredients, totalWeightPerPortion: weightPerPortion };
}

// ============ TEST CASES ============

console.log('\n' + '='.repeat(60));
console.log('TEST 1: Bacon med for lille mængde (50g til 7 portioner)');
console.log('='.repeat(60));

const test1 = {
  title: "Pasta Carbonara",
  servings: 7,
  ingredients: [
    { name: "spaghetti", amount: "80", unit: "g" },
    { name: "bacon", amount: "50", unit: "g" },
    { name: "æg", amount: "2", unit: "stk" },
    { name: "parmesan", amount: "30", unit: "g" },
  ]
};

const result1 = validateAndCorrectIngredientAmounts(test1);
console.log('\nForventet: Catch-all aktiveres (total ~160g / 7 = ~23g per portion)');
console.log('Bacon skal blive: 50 * 7 = 350g');
console.log('Spaghetti skal blive: 80 * 7 = 560g');

console.log('\n' + '='.repeat(60));
console.log('TEST 2: Linser med for lille mængde (50g til 7 portioner)');
console.log('='.repeat(60));

const test2 = {
  title: "Linsesuppe",
  servings: 7,
  ingredients: [
    { name: "røde linser", amount: "50", unit: "g" },
    { name: "gulerødder", amount: "200", unit: "g" },
    { name: "løg", amount: "100", unit: "g" },
    { name: "bouillon", amount: "1", unit: "l" },
  ]
};

const result2 = validateAndCorrectIngredientAmounts(test2);
console.log('\nForventet: Catch-all aktiveres (total ~350g / 7 = ~50g per portion)');
console.log('Linser skal blive: 50 * 7 = 350g');

console.log('\n' + '='.repeat(60));
console.log('TEST 3: Kartofler med for lille mængde (150g til 7 portioner)');
console.log('='.repeat(60));

const test3 = {
  title: "Bagt kartoffel med fyld",
  servings: 7,
  ingredients: [
    { name: "kartofler", amount: "150", unit: "g" },
    { name: "bacon", amount: "100", unit: "g" },
    { name: "creme fraiche", amount: "100", unit: "g" },
  ]
};

const result3 = validateAndCorrectIngredientAmounts(test3);
console.log('\nForventet: Catch-all aktiveres (total ~350g / 7 = ~50g per portion)');
console.log('Kartofler skal blive: 150 * 7 = 1050g');

console.log('\n' + '='.repeat(60));
console.log('TEST 4: Korrekte mængder (allerede ganget med portioner)');
console.log('='.repeat(60));

const test4 = {
  title: "Kylling med ris",
  servings: 4,
  ingredients: [
    { name: "kyllingebryst", amount: "600", unit: "g" },  // 150g per person
    { name: "jasminris", amount: "320", unit: "g" },      // 80g per person
    { name: "broccoli", amount: "400", unit: "g" },       // 100g per person
    { name: "sojasauce", amount: "60", unit: "ml" },
  ]
};

const result4 = validateAndCorrectIngredientAmounts(test4);
console.log('\nForventet: Ingen korrektion (1320g / 4 = 330g per portion > 300g grænse)');
console.log('Alle mængder skulle forblive uændrede');

console.log('\n' + '='.repeat(60));
console.log('RESULTAT OVERSIGT');
console.log('='.repeat(60));
console.log(`Test 1 (Carbonara): ${result1.valid ? '✅ VALID' : '❌ KORRIGERET'} - ${result1.errors.length} korrektioner`);
console.log(`Test 2 (Linsesuppe): ${result2.valid ? '✅ VALID' : '❌ KORRIGERET'} - ${result2.errors.length} korrektioner`);
console.log(`Test 3 (Kartofler): ${result3.valid ? '✅ VALID' : '❌ KORRIGERET'} - ${result3.errors.length} korrektioner`);
console.log(`Test 4 (Kylling/ris): ${result4.valid ? '✅ VALID' : '❌ KORRIGERET'} - ${result4.errors.length} korrektioner`);
