// FOOD_DATABASE — quick-add items for the Meals view.
// Shape matches what app.js expects: { id, category, name, serving, calories, protein, carbs, fats }
window.FOOD_DATABASE = [
  // ---- breakfast ----
  { id: 1, category: "breakfast", name: "2 Fried Eggs", serving: "2 large eggs", calories: 180, protein: 12, carbs: 1, fats: 14 , diet: "non_veg" },
  { id: 2, category: "breakfast", name: "Oatmeal (plain)", serving: "1 cup cooked", calories: 158, protein: 6, carbs: 27, fats: 3 , diet: "veg" },
  { id: 3, category: "breakfast", name: "Greek Yogurt", serving: "170g cup", calories: 100, protein: 17, carbs: 6, fats: 0.5 , diet: "veg" },
  { id: 4, category: "breakfast", name: "Whole Wheat Toast", serving: "2 slices", calories: 138, protein: 6, carbs: 24, fats: 2 , diet: "veg" },
  { id: 5, category: "breakfast", name: "Banana Pancakes", serving: "3 medium", calories: 260, protein: 7, carbs: 42, fats: 7 , diet: "veg" },
  { id: 6, category: "breakfast", name: "Granola", serving: "1/2 cup", calories: 240, protein: 6, carbs: 32, fats: 10 , diet: "veg" },
  { id: 7, category: "breakfast", name: "Avocado Toast", serving: "1 slice", calories: 190, protein: 5, carbs: 18, fats: 11 , diet: "veg" },

  // ---- protein ----
  { id: 8, category: "protein", name: "Grilled Chicken Breast", serving: "150g", calories: 248, protein: 46, carbs: 0, fats: 5 , diet: "non_veg" },
  { id: 9, category: "protein", name: "Salmon Fillet", serving: "150g", calories: 280, protein: 34, carbs: 0, fats: 15 , diet: "non_veg" },
  { id: 10, category: "protein", name: "Lean Ground Beef", serving: "150g cooked", calories: 297, protein: 32, carbs: 0, fats: 18 , diet: "non_veg" },
  { id: 11, category: "protein", name: "Tofu (firm)", serving: "150g", calories: 122, protein: 13, carbs: 3, fats: 7 , diet: "veg" },
  { id: 12, category: "protein", name: "Whey Protein Shake", serving: "1 scoop + water", calories: 120, protein: 24, carbs: 3, fats: 1.5 , diet: "veg" },
  { id: 13, category: "protein", name: "Cottage Cheese", serving: "1 cup", calories: 206, protein: 25, carbs: 8, fats: 9 , diet: "veg" },
  { id: 14, category: "protein", name: "Tuna (canned, in water)", serving: "1 can (140g)", calories: 128, protein: 29, carbs: 0, fats: 1 , diet: "non_veg" },
  { id: 15, category: "protein", name: "Paneer", serving: "100g", calories: 265, protein: 18, carbs: 4, fats: 21 , diet: "veg" },

  // ---- carbs ----
  { id: 16, category: "carbs", name: "White Rice (cooked)", serving: "1 cup", calories: 205, protein: 4, carbs: 45, fats: 0.4 , diet: "veg" },
  { id: 17, category: "carbs", name: "Brown Rice (cooked)", serving: "1 cup", calories: 216, protein: 5, carbs: 45, fats: 1.8 , diet: "veg" },
  { id: 18, category: "carbs", name: "Roti / Chapati", serving: "1 piece", calories: 120, protein: 3, carbs: 18, fats: 3.5 , diet: "veg" },
  { id: 19, category: "carbs", name: "Pasta (cooked)", serving: "1 cup", calories: 221, protein: 8, carbs: 43, fats: 1.3 , diet: "veg" },
  { id: 20, category: "carbs", name: "Sweet Potato (baked)", serving: "1 medium", calories: 112, protein: 2, carbs: 26, fats: 0.1 , diet: "veg" },
  { id: 21, category: "carbs", name: "Quinoa (cooked)", serving: "1 cup", calories: 222, protein: 8, carbs: 39, fats: 3.6 , diet: "veg" },

  // ---- veggie ----
  { id: 22, category: "veggie", name: "Mixed Green Salad", serving: "2 cups", calories: 45, protein: 2, carbs: 8, fats: 0.5 , diet: "veg" },
  { id: 23, category: "veggie", name: "Steamed Broccoli", serving: "1 cup", calories: 55, protein: 4, carbs: 11, fats: 0.6 , diet: "veg" },
  { id: 24, category: "veggie", name: "Roasted Vegetables", serving: "1.5 cups", calories: 120, protein: 3, carbs: 20, fats: 4 , diet: "veg" },
  { id: 25, category: "veggie", name: "Dal (lentil curry)", serving: "1 cup", calories: 198, protein: 13, carbs: 30, fats: 4 , diet: "veg" },
  { id: 26, category: "veggie", name: "Chickpea Salad", serving: "1 cup", calories: 269, protein: 12, carbs: 45, fats: 4 , diet: "veg" },

  // ---- fruit ----
  { id: 27, category: "fruit", name: "Apple", serving: "1 medium", calories: 95, protein: 0.5, carbs: 25, fats: 0.3 , diet: "veg" },
  { id: 28, category: "fruit", name: "Banana", serving: "1 medium", calories: 105, protein: 1.3, carbs: 27, fats: 0.4 , diet: "veg" },
  { id: 29, category: "fruit", name: "Mixed Berries", serving: "1 cup", calories: 70, protein: 1, carbs: 17, fats: 0.4 , diet: "veg" },
  { id: 30, category: "fruit", name: "Orange", serving: "1 medium", calories: 62, protein: 1.2, carbs: 15, fats: 0.2 , diet: "veg" },
  { id: 31, category: "fruit", name: "Mango", serving: "1 cup sliced", calories: 99, protein: 1.4, carbs: 25, fats: 0.6 , diet: "veg" },

  // ---- snack ----
  { id: 32, category: "snack", name: "Almonds", serving: "28g (~23 nuts)", calories: 164, protein: 6, carbs: 6, fats: 14 , diet: "veg" },
  { id: 33, category: "snack", name: "Protein Bar", serving: "1 bar", calories: 210, protein: 20, carbs: 22, fats: 7 , diet: "veg" },
  { id: 34, category: "snack", name: "Hummus & Carrots", serving: "3 tbsp + 1 cup carrots", calories: 150, protein: 5, carbs: 18, fats: 7 , diet: "veg" },
  { id: 35, category: "snack", name: "Popcorn (air-popped)", serving: "3 cups", calories: 93, protein: 3, carbs: 19, fats: 1 , diet: "veg" },
  { id: 36, category: "snack", name: "Dark Chocolate", serving: "30g", calories: 170, protein: 2, carbs: 13, fats: 12 , diet: "veg" },
  { id: 37, category: "snack", name: "Boiled Egg", serving: "1 large", calories: 78, protein: 6, carbs: 0.6, fats: 5 , diet: "non_veg" },

  // ---- drink ----
  { id: 38, category: "drink", name: "Black Coffee", serving: "1 cup", calories: 2, protein: 0.3, carbs: 0, fats: 0 , diet: "veg" },
  { id: 39, category: "drink", name: "Protein Smoothie", serving: "16 oz", calories: 280, protein: 25, carbs: 34, fats: 6 , diet: "veg" },
  { id: 40, category: "drink", name: "Orange Juice", serving: "1 cup", calories: 112, protein: 2, carbs: 26, fats: 0.5 , diet: "veg" },
  { id: 41, category: "drink", name: "Whole Milk", serving: "1 cup", calories: 149, protein: 8, carbs: 12, fats: 8 , diet: "veg" },
  { id: 42, category: "drink", name: "Green Tea", serving: "1 cup", calories: 2, protein: 0, carbs: 0.5, fats: 0 , diet: "veg" },

  // ---- fast_food ----
  { id: 43, category: "fast_food", name: "Cheeseburger", serving: "1 regular", calories: 300, protein: 15, carbs: 33, fats: 12 , diet: "non_veg" },
  { id: 44, category: "fast_food", name: "Chicken Burrito", serving: "1 wrap", calories: 480, protein: 28, carbs: 55, fats: 16 , diet: "non_veg" },
  { id: 45, category: "fast_food", name: "Cheese Pizza Slice", serving: "1 slice", calories: 285, protein: 12, carbs: 36, fats: 10 , diet: "veg" },
  { id: 46, category: "fast_food", name: "French Fries", serving: "medium", calories: 365, protein: 4, carbs: 48, fats: 17 , diet: "veg" },
  { id: 47, category: "fast_food", name: "Chicken Caesar Wrap", serving: "1 wrap", calories: 450, protein: 30, carbs: 38, fats: 20 , diet: "non_veg" },
];
