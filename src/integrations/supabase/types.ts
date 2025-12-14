export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      allergens: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      household_members: {
        Row: {
          age_years: number | null
          created_at: string
          daily_calories: number | null
          daily_carbs_target: number | null
          daily_fat_target: number | null
          daily_protein_target: number | null
          gender: string | null
          height_cm: number | null
          id: string
          name: string
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          age_years?: number | null
          created_at?: string
          daily_calories?: number | null
          daily_carbs_target?: number | null
          daily_fat_target?: number | null
          daily_protein_target?: number | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          age_years?: number | null
          created_at?: string
          daily_calories?: number | null
          daily_carbs_target?: number | null
          daily_fat_target?: number | null
          daily_protein_target?: number | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      ingredient_preferences: {
        Row: {
          created_at: string | null
          id: string
          ingredient_name: string
          preference: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          ingredient_name: string
          preference: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          ingredient_name?: string
          preference?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_plans: {
        Row: {
          created_at: string | null
          duration_days: number
          id: string
          meals: Json
          title: string
          total_cost: number | null
          total_savings: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration_days: number
          id?: string
          meals: Json
          title: string
          total_cost?: number | null
          total_savings?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration_days?: number
          id?: string
          meals?: Json
          title?: string
          total_cost?: number | null
          total_savings?: number | null
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          brand: string | null
          category: string | null
          chain_id: string | null
          created_at: string
          external_id: string | null
          flyer_date: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          offer_price_dkk: number | null
          offer_text: string | null
          original_price_dkk: number | null
          price: number | null
          product_id: string | null
          product_name: string | null
          quantity: number | null
          raw_text: string | null
          scraped_at: string | null
          store_id: string | null
          unit: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          chain_id?: string | null
          created_at?: string
          external_id?: string | null
          flyer_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          offer_price_dkk?: number | null
          offer_text?: string | null
          original_price_dkk?: number | null
          price?: number | null
          product_id?: string | null
          product_name?: string | null
          quantity?: number | null
          raw_text?: string | null
          scraped_at?: string | null
          store_id?: string | null
          unit?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          chain_id?: string | null
          created_at?: string
          external_id?: string | null
          flyer_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          offer_price_dkk?: number | null
          offer_text?: string | null
          original_price_dkk?: number | null
          price?: number | null
          product_id?: string | null
          product_name?: string | null
          quantity?: number | null
          raw_text?: string | null
          scraped_at?: string | null
          store_id?: string | null
          unit?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "store_chains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          chain_id: string | null
          created_at: string
          id: string
          image_url: string | null
          name: string
          size_unit: string | null
          size_value: number | null
        }
        Insert: {
          brand?: string | null
          chain_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          size_unit?: string | null
          size_value?: number | null
        }
        Update: {
          brand?: string | null
          chain_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          size_unit?: string | null
          size_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "store_chains"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activity_level: string | null
          age_years: number | null
          budget_per_week: number | null
          created_at: string | null
          daily_calories: number | null
          daily_carbs_target: number | null
          daily_fat_target: number | null
          daily_protein_target: number | null
          date_of_birth: string | null
          dietary_goal: string | null
          email: string | null
          full_name: string | null
          gender: string | null
          height_cm: number | null
          id: string
          people_count: number | null
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          activity_level?: string | null
          age_years?: number | null
          budget_per_week?: number | null
          created_at?: string | null
          daily_calories?: number | null
          daily_carbs_target?: number | null
          daily_fat_target?: number | null
          daily_protein_target?: number | null
          date_of_birth?: string | null
          dietary_goal?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          height_cm?: number | null
          id: string
          people_count?: number | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          activity_level?: string | null
          age_years?: number | null
          budget_per_week?: number | null
          created_at?: string | null
          daily_calories?: number | null
          daily_carbs_target?: number | null
          daily_fat_target?: number | null
          daily_protein_target?: number | null
          date_of_birth?: string | null
          dietary_goal?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          people_count?: number | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      recipes: {
        Row: {
          calories: number | null
          carbs: number | null
          cook_time: number | null
          created_at: string | null
          description: string | null
          fat: number | null
          id: string
          image_url: string | null
          ingredients: Json | null
          instructions: Json | null
          prep_time: number | null
          protein: number | null
          servings: number | null
          tags: string[] | null
          title: string
        }
        Insert: {
          calories?: number | null
          carbs?: number | null
          cook_time?: number | null
          created_at?: string | null
          description?: string | null
          fat?: number | null
          id?: string
          image_url?: string | null
          ingredients?: Json | null
          instructions?: Json | null
          prep_time?: number | null
          protein?: number | null
          servings?: number | null
          tags?: string[] | null
          title: string
        }
        Update: {
          calories?: number | null
          carbs?: number | null
          cook_time?: number | null
          created_at?: string | null
          description?: string | null
          fat?: number | null
          id?: string
          image_url?: string | null
          ingredients?: Json | null
          instructions?: Json | null
          prep_time?: number | null
          protein?: number | null
          servings?: number | null
          tags?: string[] | null
          title?: string
        }
        Relationships: []
      }
      shopping_lists: {
        Row: {
          completed: boolean | null
          created_at: string | null
          id: string
          items: Json
          meal_plan_id: string | null
          total_price: number | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          items: Json
          meal_plan_id?: string | null
          total_price?: number | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          items?: Json
          meal_plan_id?: string | null
          total_price?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_lists_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      store_chains: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          chain: string
          chain_id: string | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          chain: string
          chain_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          chain?: string
          chain_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "store_chains"
            referencedColumns: ["id"]
          },
        ]
      }
      swipes: {
        Row: {
          created_at: string | null
          direction: string
          id: string
          recipe_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          direction: string
          id?: string
          recipe_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          direction?: string
          id?: string
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "swipes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_allergens: {
        Row: {
          allergen_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          allergen_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          allergen_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_allergens_allergen_id_fkey"
            columns: ["allergen_id"]
            isOneToOne: false
            referencedRelation: "allergens"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferred_chains: {
        Row: {
          chain_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          chain_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          chain_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferred_chains_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "store_chains"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          body_fat_percentage: number | null
          created_at: string
          id: string
          muscle_mass_kg: number | null
          notes: string | null
          recorded_at: string
          user_id: string
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          body_fat_percentage?: number | null
          created_at?: string
          id?: string
          muscle_mass_kg?: number | null
          notes?: string | null
          recorded_at?: string
          user_id: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          body_fat_percentage?: number | null
          created_at?: string
          id?: string
          muscle_mass_kg?: number | null
          notes?: string | null
          recorded_at?: string
          user_id?: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
