import { create } from 'zustand';

interface OnboardingData {
  // Step 1: Personal info
  fullName: string;
  gender: string;
  dateOfBirth: string;
  
  // Step 2: Physical measurements
  heightCm: number | null;
  weightKg: number | null;
  
  // Step 3: Activity level
  activityLevel: string;
  
  // Step 4: Goals
  dietaryGoal: string;
  
  // Step 5: Household size
  peopleCount: number;
  
  // Step 6: Allergens
  selectedAllergens: string[];
}

interface OnboardingState {
  currentStep: number;
  data: OnboardingData;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateData: (updates: Partial<OnboardingData>) => void;
  reset: () => void;
}

const initialData: OnboardingData = {
  fullName: '',
  gender: '',
  dateOfBirth: '',
  heightCm: null,
  weightKg: null,
  activityLevel: '',
  dietaryGoal: '',
  peopleCount: 1,
  selectedAllergens: [],
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  currentStep: 1,
  data: initialData,
  setStep: (step) => set({ currentStep: step }),
  nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 6) })),
  prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),
  updateData: (updates) => set((state) => ({ data: { ...state.data, ...updates } })),
  reset: () => set({ currentStep: 1, data: initialData }),
}));
