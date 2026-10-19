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
          child_id: string
          created_at: string
          family_id: string
          id: string
          kind: string
        }
        Insert: {
          child_id: string
          created_at?: string
          family_id: string
          id?: string
          kind: string
        }
        Update: {
          child_id?: string
          created_at?: string
          family_id?: string
          id?: string
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
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          family_id: string
          grade?: number | null
          id?: string
          nickname: string
        }
        Update: {
          avatar?: string | null
          created_at?: string
          family_id?: string
          grade?: number | null
          id?: string
          nickname?: string
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
      tasks: {
        Row: {
          child_id: string
          created_at: string
          done: boolean
          due: string | null
          family_id: string
          id: string
          kind: string
          minutes: number | null
          title: string
        }
        Insert: {
          child_id: string
          created_at?: string
          done?: boolean
          due?: string | null
          family_id: string
          id?: string
          kind: string
          minutes?: number | null
          title: string
        }
        Update: {
          child_id?: string
          created_at?: string
          done?: boolean
          due?: string | null
          family_id?: string
          id?: string
          kind?: string
          minutes?: number | null
          title?: string
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
      complete_task: { Args: { task_id: string }; Returns: undefined }
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
