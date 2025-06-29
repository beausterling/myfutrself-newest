type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_custom: boolean | null
          name: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_custom?: boolean | null
          name: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_custom?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      goals: {
        Row: {
          category_id: string
          created_at: string | null
          deadline: string | null
          frequency: string | null
          id: string
          start_date: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string | null
          deadline?: string | null
          frequency?: string | null
          id?: string
          start_date?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string | null
          deadline?: string | null
          frequency?: string | null
          id?: string
          start_date?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      motivations: {
        Row: {
          created_at: string | null
          goal_id: string
          id: string
          motivation_text: string | null
          obstacles: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          goal_id: string
          id?: string
          motivation_text?: string | null
          obstacles?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          goal_id?: string
          id?: string
          motivation_text?: string | null
          obstacles?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "motivations_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          ai_triggered_enabled: boolean | null
          contact_prefs: string[] | null
          created_at: string | null
          email_notifications_enabled: boolean | null
          future_photo_updated_at: string | null
          future_photo_url: string | null
          onboarding_completed: boolean | null
          photo_updated_at: string | null
          photo_url: string | null
          preferred_sms_time_end: string | null
          preferred_sms_time_start: string | null
          preferred_time_end: string | null
          preferred_time_start: string | null
          sms_notifications_enabled: boolean | null
          supabase_uuid: string | null
          updated_at: string | null
          user_id: string
          voice_preference: string
        }
        Insert: {
          avatar_url?: string | null
          ai_triggered_enabled?: boolean | null
          contact_prefs?: string[] | null
          created_at?: string | null
          email_notifications_enabled?: boolean | null
          future_photo_updated_at?: string | null
          future_photo_url?: string | null
          onboarding_completed?: boolean | null
          photo_updated_at?: string | null
          photo_url?: string | null
          preferred_sms_time_end?: string | null
          preferred_sms_time_start?: string | null
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          sms_notifications_enabled?: boolean | null
          supabase_uuid?: string | null
          updated_at?: string | null
          user_id?: string
          voice_preference: string
        }
        Update: {
          avatar_url?: string | null
          ai_triggered_enabled?: boolean | null
          contact_prefs?: string[] | null
          created_at?: string | null
          email_notifications_enabled?: boolean | null
          future_photo_updated_at?: string | null
          future_photo_url?: string | null
          onboarding_completed?: boolean | null
          photo_updated_at?: string | null
          photo_url?: string | null
          preferred_sms_time_end?: string | null
          preferred_sms_time_start?: string | null
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          sms_notifications_enabled?: boolean | null
          supabase_uuid?: string | null
          updated_at?: string | null
          user_id?: string
          voice_preference?: string
        }
        Relationships: []
      }
      user_selected_categories: {
        Row: {
          category_id: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_selected_categories_category_id"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_selected_categories_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string | null
          email: string
          feedback: string | null
          first_name: string | null
          goals: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          feedback?: string | null
          first_name?: string | null
          goals?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          feedback?: string | null
          first_name?: string | null
          goals?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      requesting_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}