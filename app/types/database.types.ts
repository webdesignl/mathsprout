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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      attempts: {
        Row: {
          child_id: string
          correct: boolean
          created_at: string
          error_type: string | null
          family_id: string
          first_try: boolean
          hints_used: number
          id: string
          item_id: string | null
          mode: string
          problem: string | null
          rule_id: string | null
        }
        Insert: {
          child_id: string
          correct: boolean
          created_at?: string
          error_type?: string | null
          family_id: string
          first_try?: boolean
          hints_used?: number
          id?: string
          item_id?: string | null
          mode: string
          problem?: string | null
          rule_id?: string | null
        }
        Update: {
          child_id?: string
          correct?: boolean
          created_at?: string
          error_type?: string | null
          family_id?: string
          first_try?: boolean
          hints_used?: number
          id?: string
          item_id?: string | null
          mode?: string
          problem?: string | null
          rule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attempts_child_id_family_id_fkey"
            columns: ["child_id", "family_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id", "family_id"]
          },
          {
            foreignKeyName: "attempts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "rules"
            referencedColumns: ["id"]
          },
        ]
      }
      awards: {
        Row: {
          award_date: string | null
          child_id: string
          created_at: string
          family_id: string
          id: string
          idea_id: string | null
          kind: string
        }
        Insert: {
          award_date?: string | null
          child_id: string
          created_at?: string
          family_id: string
          id?: string
          idea_id?: string | null
          kind: string
        }
        Update: {
          award_date?: string | null
          child_id?: string
          created_at?: string
          family_id?: string
          id?: string
          idea_id?: string | null
          kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "awards_child_id_family_id_fkey"
            columns: ["child_id", "family_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id", "family_id"]
          },
        ]
      }
      children: {
        Row: {
          avatar: string | null
          created_at: string
          family_id: string
          grade: number | null
          id: string
          nickname: string
          paused_at: string | null
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          family_id: string
          grade?: number | null
          id?: string
          nickname: string
          paused_at?: string | null
        }
        Update: {
          avatar?: string | null
          created_at?: string
          family_id?: string
          grade?: number | null
          id?: string
          nickname?: string
          paused_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "children_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      concept_packs: {
        Row: {
          chapter: string
          id: string
          title: string
        }
        Insert: {
          chapter: string
          id: string
          title: string
        }
        Update: {
          chapter?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      daily_plans: {
        Row: {
          child_id: string
          completed_at: string | null
          completion_seen: boolean
          created_at: string
          family_id: string
          id: string
          plan_date: string
          screen_time_day: boolean
        }
        Insert: {
          child_id: string
          completed_at?: string | null
          completion_seen?: boolean
          created_at?: string
          family_id: string
          id?: string
          plan_date: string
          screen_time_day?: boolean
        }
        Update: {
          child_id?: string
          completed_at?: string | null
          completion_seen?: boolean
          created_at?: string
          family_id?: string
          id?: string
          plan_date?: string
          screen_time_day?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "daily_plans_child_id_family_id_fkey"
            columns: ["child_id", "family_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id", "family_id"]
          },
        ]
      }
      day_summaries: {
        Row: {
          child_id: string
          created_at: string
          done_count: number
          family_id: string
          finished_all: boolean
          id: string
          map_done: number
          seen: boolean
          summary: string
          summary_date: string
        }
        Insert: {
          child_id: string
          created_at?: string
          done_count?: number
          family_id: string
          finished_all?: boolean
          id?: string
          map_done?: number
          seen?: boolean
          summary: string
          summary_date: string
        }
        Update: {
          child_id?: string
          created_at?: string
          done_count?: number
          family_id?: string
          finished_all?: boolean
          id?: string
          map_done?: number
          seen?: boolean
          summary?: string
          summary_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_summaries_child_id_family_id_fkey"
            columns: ["child_id", "family_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id", "family_id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      family_members: {
        Row: {
          created_at: string
          email: string | null
          family_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          family_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          family_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      family_secrets: {
        Row: {
          failed_attempts: number
          family_id: string
          locked_until: string | null
          pin_hash: string | null
        }
        Insert: {
          failed_attempts?: number
          family_id: string
          locked_until?: string | null
          pin_hash?: string | null
        }
        Update: {
          failed_attempts?: number
          family_id?: string
          locked_until?: string | null
          pin_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_secrets_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: true
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      ideas: {
        Row: {
          approved: boolean | null
          child_id: string
          created_at: string
          family_id: string
          id: string
          reviewed_at: string | null
          set_number: number
          text: string
        }
        Insert: {
          approved?: boolean | null
          child_id: string
          created_at?: string
          family_id: string
          id?: string
          reviewed_at?: string | null
          set_number?: number
          text: string
        }
        Update: {
          approved?: boolean | null
          child_id?: string
          created_at?: string
          family_id?: string
          id?: string
          reviewed_at?: string | null
          set_number?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideas_child_id_family_id_fkey"
            columns: ["child_id", "family_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id", "family_id"]
          },
        ]
      }
      items: {
        Row: {
          answer: string
          approved: boolean
          explanation: string | null
          hint: string | null
          id: string
          options: Json | null
          prompt: string
          rule_id: string
          type: string
        }
        Insert: {
          answer: string
          approved?: boolean
          explanation?: string | null
          hint?: string | null
          id: string
          options?: Json | null
          prompt: string
          rule_id: string
          type: string
        }
        Update: {
          answer?: string
          approved?: boolean
          explanation?: string | null
          hint?: string | null
          id?: string
          options?: Json | null
          prompt?: string
          rule_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "rules"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_unlocks: {
        Row: {
          expires_at: string
          family_id: string
          session_id: string
          user_id: string
        }
        Insert: {
          expires_at: string
          family_id: string
          session_id: string
          user_id: string
        }
        Update: {
          expires_at?: string
          family_id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_unlocks_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      rules: {
        Row: {
          id: string
          pack_id: string
          statement: string
          visual: string | null
        }
        Insert: {
          id: string
          pack_id: string
          statement: string
          visual?: string | null
        }
        Update: {
          id?: string
          pack_id?: string
          statement?: string
          visual?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rules_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "concept_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          ask_detail: boolean
          child_id: string
          created_at: string
          family_id: string
          id: string
          kind: string
          minutes: number | null
          sort_order: number
          title: string
          category: string
          repeat_daily: boolean
        }
        Insert: {
          ask_detail?: boolean
          child_id: string
          created_at?: string
          family_id: string
          id?: string
          kind: string
          minutes?: number | null
          sort_order?: number
          title: string
          category?: string
          repeat_daily?: boolean
        }
        Update: {
          ask_detail?: boolean
          child_id?: string
          created_at?: string
          family_id?: string
          id?: string
          kind?: string
          minutes?: number | null
          sort_order?: number
          title?: string
          category?: string
          repeat_daily?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_child_id_family_id_fkey"
            columns: ["child_id", "family_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id", "family_id"]
          },
        ]
      }
      tasks: {
        Row: {
          added_by: string
          archived: boolean
          category: string
          done_on: string | null
          for_date: string
          template_id: string | null
          child_id: string
          created_at: string
          done: boolean
          done_at: string | null
          due: string | null
          family_id: string
          id: string
          kind: string
          minutes: number | null
          note: string | null
          priority: number | null
          priority_date: string | null
          seen_by_parent: boolean
          start_time: string | null
          title: string
        }
        Insert: {
          added_by?: string
          archived?: boolean
          category?: string
          child_id: string
          created_at?: string
          done?: boolean
          done_at?: string | null
          due?: string | null
          family_id: string
          id?: string
          kind: string
          minutes?: number | null
          note?: string | null
          priority?: number | null
          priority_date?: string | null
          seen_by_parent?: boolean
          start_time?: string | null
          title: string
          done_on?: string | null
          for_date?: string
          template_id?: string | null
        }
        Update: {
          added_by?: string
          archived?: boolean
          child_id?: string
          created_at?: string
          done?: boolean
          done_at?: string | null
          due?: string | null
          family_id?: string
          id?: string
          kind?: string
          minutes?: number | null
          note?: string | null
          priority?: number | null
          priority_date?: string | null
          seen_by_parent?: boolean
          start_time?: string | null
          title?: string
          category?: string
          done_on?: string | null
          for_date?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_child_id_family_id_fkey"
            columns: ["child_id", "family_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id", "family_id"]
          },
        ]
      }
      uploads: {
        Row: {
          child_id: string
          created_at: string
          family_id: string
          id: string
          kind: string
          storage_path: string
        }
        Insert: {
          child_id: string
          created_at?: string
          family_id: string
          id?: string
          kind: string
          storage_path: string
        }
        Update: {
          child_id?: string
          created_at?: string
          family_id?: string
          id?: string
          kind?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "uploads_child_id_family_id_fkey"
            columns: ["child_id", "family_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id", "family_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_task: {
        Args: {
          category?: string
          child_id: string
          due?: string
          for_date?: string
          kind: string
          minutes?: number
          title: string
        }
        Returns: string
      }
      give_day_star: { Args: { child_id: string; plan_date: string }; Returns: undefined }
      report_day_done: { Args: { child_id: string; plan_date: string }; Returns: boolean }
      uncomplete_task: { Args: { task_id: string }; Returns: undefined }
      archive_done_tasks: { Args: { child_id: string }; Returns: number }
      close_past_days: { Args: { today: string }; Returns: number }
      ensure_routines: { Args: { child_id: string; plan_date: string }; Returns: number }
      mark_summary_seen: { Args: { child_id: string; summary_date: string }; Returns: undefined }
      set_child_paused: { Args: { child_id: string; paused: boolean }; Returns: undefined }
      task_state: { Args: { category: string; due: string; for_date: string; plan_date: string }; Returns: string }
      complete_task: { Args: { on_date?: string; task_id: string }; Returns: undefined }
      current_session_id: { Args: never; Returns: string }
      give_star: { Args: { approved: boolean; idea_id: string }; Returns: undefined }
      has_parent_pin: { Args: never; Returns: boolean }
      is_parent_unlocked: { Args: never; Returns: boolean }
      lock_parent_mode: { Args: never; Returns: undefined }
      my_family_id: { Args: never; Returns: string }
      reset_parent_pin: { Args: { new_pin: string }; Returns: undefined }
      set_parent_pin: {
        Args: { current_pin?: string; new_pin: string }
        Returns: undefined
      }
      unlock_parent_mode: { Args: { pin: string }; Returns: string }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
