export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      ai_requests: {
        Row: {
          created_at: string;
          error_code: string | null;
          error_message: string | null;
          id: string;
          input_params: Json | null;
          is_system_error: boolean;
          request_type: Database["public"]["Enums"]["ai_request_type"];
          response_json: Json | null;
          user_id: string;
          workout_plan_id: string | null;
        };
        Insert: {
          created_at?: string;
          error_code?: string | null;
          error_message?: string | null;
          id?: string;
          input_params?: Json | null;
          is_system_error?: boolean;
          request_type: Database["public"]["Enums"]["ai_request_type"];
          response_json?: Json | null;
          user_id: string;
          workout_plan_id?: string | null;
        };
        Update: {
          created_at?: string;
          error_code?: string | null;
          error_message?: string | null;
          id?: string;
          input_params?: Json | null;
          is_system_error?: boolean;
          request_type?: Database["public"]["Enums"]["ai_request_type"];
          response_json?: Json | null;
          user_id?: string;
          workout_plan_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_requests_workout_plan_id_fkey";
            columns: ["workout_plan_id"];
            isOneToOne: false;
            referencedRelation: "workout_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_usage: {
        Row: {
          created_at: string;
          id: string;
          month_year: string;
          updated_at: string;
          usage_count: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          month_year: string;
          updated_at?: string;
          usage_count?: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          month_year?: string;
          updated_at?: string;
          usage_count?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      exercises: {
        Row: {
          created_at: string;
          details: string | null;
          duration_seconds: number | null;
          estimated_set_time_seconds: number | null;
          id: string;
          is_unilateral: boolean;
          level: string | null;
          parts: Database["public"]["Enums"]["exercise_part"][];
          reps: number | null;
          rest_after_series_seconds: number | null;
          rest_in_between_seconds: number | null;
          series: number;
          title: string;
          title_normalized: string;
          types: Database["public"]["Enums"]["exercise_type"][];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          details?: string | null;
          duration_seconds?: number | null;
          estimated_set_time_seconds?: number | null;
          id?: string;
          is_unilateral?: boolean;
          level?: string | null;
          parts: Database["public"]["Enums"]["exercise_part"][];
          reps?: number | null;
          rest_after_series_seconds?: number | null;
          rest_in_between_seconds?: number | null;
          series: number;
          title: string;
          title_normalized?: string;
          types: Database["public"]["Enums"]["exercise_type"][];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          details?: string | null;
          duration_seconds?: number | null;
          estimated_set_time_seconds?: number | null;
          id?: string;
          is_unilateral?: boolean;
          level?: string | null;
          parts?: Database["public"]["Enums"]["exercise_part"][];
          reps?: number | null;
          rest_after_series_seconds?: number | null;
          rest_in_between_seconds?: number | null;
          series?: number;
          title?: string;
          title_normalized?: string;
          types?: Database["public"]["Enums"]["exercise_type"][];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      personal_records: {
        Row: {
          achieved_at: string;
          achieved_in_session_id: string | null;
          achieved_in_set_number: number | null;
          created_at: string;
          exercise_id: string;
          id: string;
          metric_type: Database["public"]["Enums"]["pr_metric_type"];
          series_values: Record<string, number> | null;
          updated_at: string;
          user_id: string;
          value: number;
        };
        Insert: {
          achieved_at: string;
          achieved_in_session_id?: string | null;
          achieved_in_set_number?: number | null;
          created_at?: string;
          exercise_id: string;
          id?: string;
          metric_type: Database["public"]["Enums"]["pr_metric_type"];
          series_values?: Record<string, number> | null;
          updated_at?: string;
          user_id: string;
          value: number;
        };
        Update: {
          achieved_at?: string;
          achieved_in_session_id?: string | null;
          achieved_in_set_number?: number | null;
          created_at?: string;
          exercise_id?: string;
          id?: string;
          metric_type?: Database["public"]["Enums"]["pr_metric_type"];
          series_values?: Record<string, number> | null;
          updated_at?: string;
          user_id?: string;
          value?: number;
        };
        Relationships: [
          {
            foreignKeyName: "personal_records_achieved_in_session_id_fkey";
            columns: ["achieved_in_session_id"];
            isOneToOne: false;
            referencedRelation: "workout_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "personal_records_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      "test-num": {
        Row: {
          created_at: string;
          id: number;
          letter: string;
          num: number;
        };
        Insert: {
          created_at?: string;
          id?: number;
          letter: string;
          num: number;
        };
        Update: {
          created_at?: string;
          id?: number;
          letter?: string;
          num?: number;
        };
        Relationships: [];
      };
      workout_plan_exercises: {
        Row: {
          created_at: string;
          estimated_set_time_seconds: number | null;
          exercise_details: string | null;
          exercise_id: string | null;
          exercise_is_unilateral: boolean | null;
          exercise_part: Database["public"]["Enums"]["exercise_part"] | null;
          exercise_title: string | null;
          exercise_type: Database["public"]["Enums"]["exercise_type"] | null;
          id: string;
          in_scope_nr: number | null;
          plan_id: string;
          planned_duration_seconds: number | null;
          planned_reps: number | null;
          planned_rest_after_series_seconds: number | null;
          planned_rest_seconds: number | null;
          planned_sets: number | null;
          scope_id: string | null;
          scope_repeat_count: number | null;
          section_order: number;
          section_type: Database["public"]["Enums"]["exercise_type"];
          snapshot_id: string | null;
        };
        Insert: {
          created_at?: string;
          estimated_set_time_seconds?: number | null;
          exercise_details?: string | null;
          exercise_id?: string | null;
          exercise_is_unilateral?: boolean | null;
          exercise_part?: Database["public"]["Enums"]["exercise_part"] | null;
          exercise_title?: string | null;
          exercise_type?: Database["public"]["Enums"]["exercise_type"] | null;
          id?: string;
          in_scope_nr?: number | null;
          plan_id: string;
          planned_duration_seconds?: number | null;
          planned_reps?: number | null;
          planned_rest_after_series_seconds?: number | null;
          planned_rest_seconds?: number | null;
          planned_sets?: number | null;
          scope_id?: string | null;
          scope_repeat_count?: number | null;
          section_order: number;
          section_type: Database["public"]["Enums"]["exercise_type"];
          snapshot_id?: string | null;
        };
        Update: {
          created_at?: string;
          estimated_set_time_seconds?: number | null;
          exercise_details?: string | null;
          exercise_id?: string | null;
          exercise_is_unilateral?: boolean | null;
          exercise_part?: Database["public"]["Enums"]["exercise_part"] | null;
          exercise_title?: string | null;
          exercise_type?: Database["public"]["Enums"]["exercise_type"] | null;
          id?: string;
          in_scope_nr?: number | null;
          plan_id?: string;
          planned_duration_seconds?: number | null;
          planned_reps?: number | null;
          planned_rest_after_series_seconds?: number | null;
          planned_rest_seconds?: number | null;
          planned_sets?: number | null;
          scope_id?: string | null;
          scope_repeat_count?: number | null;
          section_order?: number;
          section_type?: Database["public"]["Enums"]["exercise_type"];
          snapshot_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "workout_plan_exercises_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_plan_exercises_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "workout_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_plans: {
        Row: {
          created_at: string;
          description: string | null;
          estimated_total_time_seconds: number | null;
          id: string;
          name: string;
          part: Database["public"]["Enums"]["exercise_part"] | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          estimated_total_time_seconds?: number | null;
          id?: string;
          name: string;
          part?: Database["public"]["Enums"]["exercise_part"] | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          estimated_total_time_seconds?: number | null;
          id?: string;
          name?: string;
          part?: Database["public"]["Enums"]["exercise_part"] | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      workout_session_exercises: {
        Row: {
          actual_duration_seconds: number | null;
          actual_reps: number | null;
          actual_rest_seconds: number | null;
          actual_sets: number | null;
          created_at: string;
          exercise_id: string | null;
          exercise_is_unilateral_at_time: boolean;
          exercise_order: number;
          exercise_part_at_time: Database["public"]["Enums"]["exercise_part"];
          exercise_title_at_time: string;
          exercise_type_at_time: Database["public"]["Enums"]["exercise_type"];
          id: string;
          is_skipped: boolean;
          planned_duration_seconds: number | null;
          planned_reps: number | null;
          planned_rest_after_series_seconds: number | null;
          planned_rest_seconds: number | null;
          planned_sets: number | null;
          session_id: string;
          updated_at: string;
        };
        Insert: {
          actual_duration_seconds?: number | null;
          actual_reps?: number | null;
          actual_rest_seconds?: number | null;
          actual_sets?: number | null;
          created_at?: string;
          exercise_id?: string | null;
          exercise_is_unilateral_at_time?: boolean;
          exercise_order: number;
          exercise_part_at_time: Database["public"]["Enums"]["exercise_part"];
          exercise_title_at_time: string;
          exercise_type_at_time: Database["public"]["Enums"]["exercise_type"];
          id?: string;
          is_skipped?: boolean;
          planned_duration_seconds?: number | null;
          planned_reps?: number | null;
          planned_rest_after_series_seconds?: number | null;
          planned_rest_seconds?: number | null;
          planned_sets?: number | null;
          session_id: string;
          updated_at?: string;
        };
        Update: {
          actual_duration_seconds?: number | null;
          actual_reps?: number | null;
          actual_rest_seconds?: number | null;
          actual_sets?: number | null;
          created_at?: string;
          exercise_id?: string | null;
          exercise_is_unilateral_at_time?: boolean;
          exercise_order?: number;
          exercise_part_at_time?: Database["public"]["Enums"]["exercise_part"];
          exercise_title_at_time?: string;
          exercise_type_at_time?: Database["public"]["Enums"]["exercise_type"];
          id?: string;
          is_skipped?: boolean;
          planned_duration_seconds?: number | null;
          planned_reps?: number | null;
          planned_rest_after_series_seconds?: number | null;
          planned_rest_seconds?: number | null;
          planned_sets?: number | null;
          session_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_session_exercises_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_session_exercises_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "workout_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_session_sets: {
        Row: {
          created_at: string;
          duration_seconds: number | null;
          id: string;
          reps: number | null;
          session_exercise_id: string;
          set_number: number;
          side_number: number | null;
          updated_at: string;
          weight_kg: number | null;
        };
        Insert: {
          created_at?: string;
          duration_seconds?: number | null;
          id?: string;
          reps?: number | null;
          session_exercise_id: string;
          set_number: number;
          side_number?: number | null;
          updated_at?: string;
          weight_kg?: number | null;
        };
        Update: {
          created_at?: string;
          duration_seconds?: number | null;
          id?: string;
          reps?: number | null;
          session_exercise_id?: string;
          set_number?: number;
          side_number?: number | null;
          updated_at?: string;
          weight_kg?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "workout_session_sets_session_exercise_id_fkey";
            columns: ["session_exercise_id"];
            isOneToOne: false;
            referencedRelation: "workout_session_exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_sessions: {
        Row: {
          active_duration_seconds: number | null;
          completed_at: string | null;
          current_position: number | null;
          id: string;
          last_action_at: string;
          last_timer_started_at: string | null;
          last_timer_stopped_at: string | null;
          plan_name_at_time: string | null;
          started_at: string;
          status: Database["public"]["Enums"]["workout_session_status"];
          user_id: string;
          workout_plan_id: string | null;
        };
        Insert: {
          active_duration_seconds?: number | null;
          completed_at?: string | null;
          current_position?: number | null;
          id?: string;
          last_action_at?: string;
          last_timer_started_at?: string | null;
          last_timer_stopped_at?: string | null;
          plan_name_at_time?: string | null;
          started_at?: string;
          status?: Database["public"]["Enums"]["workout_session_status"];
          user_id: string;
          workout_plan_id?: string | null;
        };
        Update: {
          active_duration_seconds?: number | null;
          completed_at?: string | null;
          current_position?: number | null;
          id?: string;
          last_action_at?: string;
          last_timer_started_at?: string | null;
          last_timer_stopped_at?: string | null;
          plan_name_at_time?: string | null;
          started_at?: string;
          status?: Database["public"]["Enums"]["workout_session_status"];
          user_id?: string;
          workout_plan_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "workout_sessions_workout_plan_id_fkey";
            columns: ["workout_plan_id"];
            isOneToOne: false;
            referencedRelation: "workout_plans";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      recalculate_pr_for_exercise: {
        Args: { p_exercise_id: string; p_user_id: string };
        Returns: undefined;
      };
      save_workout_session_exercise: {
        Args: {
          p_actual_duration_seconds?: number;
          p_actual_reps?: number;
          p_actual_rest_seconds?: number;
          p_actual_sets?: number;
          p_exercise_id: string;
          p_exercise_order: number;
          p_is_skipped?: boolean;
          p_session_id: string;
          p_sets_data?: Json;
        };
        Returns: string;
      };
    };
    Enums: {
      ai_request_type: "generate" | "optimize";
      exercise_part: "Legs" | "Core" | "Back" | "Arms" | "Chest" | "Glutes";
      exercise_type: "Warm-up" | "Main Workout" | "Cool-down";
      pr_metric_type: "total_reps" | "max_duration" | "max_weight";
      workout_session_status: "in_progress" | "completed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

// When CompositeTypes is empty, keyof is never. Conditional avoids union with never.
type SchemaOption = { schema: keyof DatabaseWithoutInternals };
type CompositeTypeNameOrOptions = [
  keyof DefaultSchema["CompositeTypes"],
] extends [never]
  ? SchemaOption
  : keyof DefaultSchema["CompositeTypes"] extends infer K
    ? K extends never
      ? SchemaOption
      : K | SchemaOption
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends CompositeTypeNameOrOptions,
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      ai_request_type: ["generate", "optimize"],
      exercise_part: ["Legs", "Core", "Back", "Arms", "Chest", "Glutes"],
      exercise_type: ["Warm-up", "Main Workout", "Cool-down"],
      pr_metric_type: ["total_reps", "max_duration", "max_weight"],
      workout_session_status: ["in_progress", "completed"],
    },
  },
} as const;
