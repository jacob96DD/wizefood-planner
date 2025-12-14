import { create } from 'zustand';

interface HouseholdMember {
  id: string;
  name: string;
  gender: string;
  ageYears: number | null;
  heightCm: number | null;
  weightKg: number | null;
}

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
  
  // Step 6: Household members (other than primary user)
  householdMembers: HouseholdMember[];
  
  // Step 7: Allergens
  selectedAllergens: string[];
}

interface OnboardingState {
  currentStep: number;
  data: OnboardingData;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateData: (updates: Partial<OnboardingData>) => void;
  updateHouseholdMember: (id: string, updates: Partial<HouseholdMember>) => void;
  initializeHouseholdMembers: (count: number) => void;
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
  householdMembers: [],
  selectedAllergens: [],
};

const generateMemberId = () => Math.random().toString(36).substring(2, 9);

export const useOnboardingStore = create<OnboardingState>((set) => ({
  currentStep: 1,
  data: initialData,
  setStep: (step) => set({ currentStep: step }),
  nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 7) })),
  prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),
  updateData: (updates) => set((state) => ({ data: { ...state.data, ...updates } })),
  updateHouseholdMember: (id, updates) => set((state) => ({
    data: {
      ...state.data,
      householdMembers: state.data.householdMembers.map((member) =>
        member.id === id ? { ...member, ...updates } : member
      ),
    },
  })),
  initializeHouseholdMembers: (count) => set((state) => {
    // Count is the additional members (not including primary user)
    const additionalMembers = count - 1;
    const currentMembers = state.data.householdMembers;
    
    if (additionalMembers <= 0) {
      return { data: { ...state.data, householdMembers: [] } };
    }
    
    if (currentMembers.length === additionalMembers) {
      return state;
    }
    
    if (currentMembers.length < additionalMembers) {
      // Add new members
      const newMembers: HouseholdMember[] = [];
      for (let i = currentMembers.length; i < additionalMembers; i++) {
        newMembers.push({
          id: generateMemberId(),
          name: '',
          gender: '',
          ageYears: null,
          heightCm: null,
          weightKg: null,
        });
      }
      return {
        data: {
          ...state.data,
          householdMembers: [...currentMembers, ...newMembers],
        },
      };
    }
    
    // Remove excess members
    return {
      data: {
        ...state.data,
        householdMembers: currentMembers.slice(0, additionalMembers),
      },
    };
  }),
  reset: () => set({ currentStep: 1, data: initialData }),
}));

export type { HouseholdMember, OnboardingData };
