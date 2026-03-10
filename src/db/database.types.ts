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
      ai_chat_conversations: {
        Row: {
          created_at: string;
          id: string;
          last_message_at: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          last_message_at?: string;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          last_message_at?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      ai_chat_messages: {
        Row: {
          content: string;
          conversation_id: string;
          created_at: string;
          id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          content: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          role: string;
          user_id: string;
        };
        Update: {
          content?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "ai_chat_conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_coach_profiles: {
        Row: {
          contraindications: string | null;
          created_at: string;
          focus: string | null;
          id: string;
          persona_name: string;
          preferred_methodology: string | null;
          risk_tolerance: string | null;
          rules: Json | null;
          strictness: Database["public"]["Enums"]["coach_profile_strictness"];
          tone: Database["public"]["Enums"]["coach_profile_tone"];
          updated_at: string;
          user_id: string;
          verbosity: Database["public"]["Enums"]["coach_profile_verbosity"];
        };
        Insert: {
          contraindications?: string | null;
          created_at?: string;
          focus?: string | null;
          id?: string;
          persona_name?: string;
          preferred_methodology?: string | null;
          risk_tolerance?: string | null;
          rules?: Json | null;
          strictness?: Database["public"]["Enums"]["coach_profile_strictness"];
          tone?: Database["public"]["Enums"]["coach_profile_tone"];
          updated_at?: string;
          user_id: string;
          verbosity?: Database["public"]["Enums"]["coach_profile_verbosity"];
        };
        Update: {
          contraindications?: string | null;
          created_at?: string;
          focus?: string | null;
          id?: string;
          persona_name?: string;
          preferred_methodology?: string | null;
          risk_tolerance?: string | null;
          rules?: Json | null;
          strictness?: Database["public"]["Enums"]["coach_profile_strictness"];
          tone?: Database["public"]["Enums"]["coach_profile_tone"];
          updated_at?: string;
          user_id?: string;
          verbosity?: Database["public"]["Enums"]["coach_profile_verbosity"];
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
          is_save_to_pr: boolean | null;
          is_unilateral: boolean;
          level: string | null;
          parts: Database["public"]["Enums"]["exercise_part"][];
          prescription_config: Json | null;
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
          is_save_to_pr?: boolean | null;
          is_unilateral?: boolean;
          level?: string | null;
          parts: Database["public"]["Enums"]["exercise_part"][];
          prescription_config?: Json | null;
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
          is_save_to_pr?: boolean | null;
          is_unilateral?: boolean;
          level?: string | null;
          parts?: Database["public"]["Enums"]["exercise_part"][];
          prescription_config?: Json | null;
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
      external_workouts: {
        Row: {
          calories: number | null;
          created_at: string;
          duration_minutes: number;
          external_id: string | null;
          hr_avg: number | null;
          hr_max: number | null;
          id: string;
          intensity_rpe: number | null;
          notes: string | null;
          raw_payload: Json | null;
          source: Database["public"]["Enums"]["external_workout_source"];
          sport_type: string;
          started_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          calories?: number | null;
          created_at?: string;
          duration_minutes: number;
          external_id?: string | null;
          hr_avg?: number | null;
          hr_max?: number | null;
          id?: string;
          intensity_rpe?: number | null;
          notes?: string | null;
          raw_payload?: Json | null;
          source?: Database["public"]["Enums"]["external_workout_source"];
          sport_type: string;
          started_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          calories?: number | null;
          created_at?: string;
          duration_minutes?: number;
          external_id?: string | null;
          hr_avg?: number | null;
          hr_max?: number | null;
          id?: string;
          intensity_rpe?: number | null;
          notes?: string | null;
          raw_payload?: Json | null;
          source?: Database["public"]["Enums"]["external_workout_source"];
          sport_type?: string;
          started_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
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
      training_programs: {
        Row: {
          coach_profile_snapshot: Json | null;
          created_at: string;
          duration_months: number;
          goal_text: string | null;
          id: string;
          name: string;
          sessions_per_week: number;
          source: Database["public"]["Enums"]["training_program_source"];
          status: Database["public"]["Enums"]["training_program_status"];
          updated_at: string;
          user_id: string;
          weeks_count: number;
        };
        Insert: {
          coach_profile_snapshot?: Json | null;
          created_at?: string;
          duration_months: number;
          goal_text?: string | null;
          id?: string;
          name: string;
          sessions_per_week: number;
          source?: Database["public"]["Enums"]["training_program_source"];
          status?: Database["public"]["Enums"]["training_program_status"];
          updated_at?: string;
          user_id: string;
          weeks_count: number;
        };
        Update: {
          coach_profile_snapshot?: Json | null;
          created_at?: string;
          duration_months?: number;
          goal_text?: string | null;
          id?: string;
          name?: string;
          sessions_per_week?: number;
          source?: Database["public"]["Enums"]["training_program_source"];
          status?: Database["public"]["Enums"]["training_program_status"];
          updated_at?: string;
          user_id?: string;
          weeks_count?: number;
        };
        Relationships: [];
      };
      ai_plan_decisions: {
        Row: {
          accepted: boolean;
          created_at: string;
          final_output: Json;
          guardrail_events: Json;
          id: string;
          input_snapshot: Json;
          planner_output: Json;
          planner_source: string;
          realism_score: number;
          repair_log: Json;
          request_type: Database["public"]["Enums"]["ai_request_type"];
          training_program_id: string | null;
          updated_at: string;
          user_id: string;
          validation_result: Json;
        };
        Insert: {
          accepted?: boolean;
          created_at?: string;
          final_output: Json;
          guardrail_events?: Json;
          id?: string;
          input_snapshot: Json;
          planner_output: Json;
          planner_source?: string;
          realism_score: number;
          repair_log?: Json;
          request_type?: Database["public"]["Enums"]["ai_request_type"];
          training_program_id?: string | null;
          updated_at?: string;
          user_id: string;
          validation_result: Json;
        };
        Update: {
          accepted?: boolean;
          created_at?: string;
          final_output?: Json;
          guardrail_events?: Json;
          id?: string;
          input_snapshot?: Json;
          planner_output?: Json;
          planner_source?: string;
          realism_score?: number;
          repair_log?: Json;
          request_type?: Database["public"]["Enums"]["ai_request_type"];
          training_program_id?: string | null;
          updated_at?: string;
          user_id?: string;
          validation_result?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "ai_plan_decisions_training_program_id_fkey";
            columns: ["training_program_id"];
            isOneToOne: false;
            referencedRelation: "training_programs";
            referencedColumns: ["id"];
          },
        ];
      };
      program_sessions: {
        Row: {
          created_at: string;
          id: string;
          linked_workout_session_id: string | null;
          progression_overrides: Json | null;
          scheduled_date: string;
          session_index: number;
          status: Database["public"]["Enums"]["program_session_status"];
          training_program_id: string;
          updated_at: string;
          user_id: string;
          week_index: number;
          workout_plan_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          linked_workout_session_id?: string | null;
          progression_overrides?: Json | null;
          scheduled_date: string;
          session_index: number;
          status?: Database["public"]["Enums"]["program_session_status"];
          training_program_id: string;
          updated_at?: string;
          user_id: string;
          week_index: number;
          workout_plan_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          linked_workout_session_id?: string | null;
          progression_overrides?: Json | null;
          scheduled_date?: string;
          session_index?: number;
          status?: Database["public"]["Enums"]["program_session_status"];
          training_program_id?: string;
          updated_at?: string;
          user_id?: string;
          week_index?: number;
          workout_plan_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "program_sessions_linked_workout_session_id_fkey";
            columns: ["linked_workout_session_id"];
            isOneToOne: false;
            referencedRelation: "workout_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "program_sessions_training_program_id_fkey";
            columns: ["training_program_id"];
            isOneToOne: false;
            referencedRelation: "training_programs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "program_sessions_workout_plan_id_fkey";
            columns: ["workout_plan_id"];
            isOneToOne: false;
            referencedRelation: "workout_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      user_capability_profiles: {
        Row: {
          best_recent_duration_seconds: number | null;
          best_recent_load_kg: number | null;
          best_recent_reps: number | null;
          comfort_max_duration_seconds: number | null;
          comfort_max_load_kg: number | null;
          comfort_max_reps: number | null;
          confidence_score: number;
          created_at: string;
          current_level: string | null;
          exercise_id: string | null;
          id: string;
          movement_key: string;
          pain_flag: boolean;
          pain_notes: string | null;
          per_session_progression_cap_duration_seconds: number | null;
          per_session_progression_cap_reps: number | null;
          updated_at: string;
          updated_from: string;
          user_id: string;
          weekly_progression_cap_percent: number;
        };
        Insert: {
          best_recent_duration_seconds?: number | null;
          best_recent_load_kg?: number | null;
          best_recent_reps?: number | null;
          comfort_max_duration_seconds?: number | null;
          comfort_max_load_kg?: number | null;
          comfort_max_reps?: number | null;
          confidence_score?: number;
          created_at?: string;
          current_level?: string | null;
          exercise_id?: string | null;
          id?: string;
          movement_key: string;
          pain_flag?: boolean;
          pain_notes?: string | null;
          per_session_progression_cap_duration_seconds?: number | null;
          per_session_progression_cap_reps?: number | null;
          updated_at?: string;
          updated_from?: string;
          user_id: string;
          weekly_progression_cap_percent?: number;
        };
        Update: {
          best_recent_duration_seconds?: number | null;
          best_recent_load_kg?: number | null;
          best_recent_reps?: number | null;
          comfort_max_duration_seconds?: number | null;
          comfort_max_load_kg?: number | null;
          comfort_max_reps?: number | null;
          confidence_score?: number;
          created_at?: string;
          current_level?: string | null;
          exercise_id?: string | null;
          id?: string;
          movement_key?: string;
          pain_flag?: boolean;
          pain_notes?: string | null;
          per_session_progression_cap_duration_seconds?: number | null;
          per_session_progression_cap_reps?: number | null;
          updated_at?: string;
          updated_from?: string;
          user_id?: string;
          weekly_progression_cap_percent?: number;
        };
        Relationships: [
          {
            foreignKeyName: "user_capability_profiles_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      program_notes: {
        Row: {
          created_at: string;
          fatigue_level: number | null;
          id: string;
          note_text: string;
          program_session_id: string | null;
          source: string;
          training_program_id: string;
          updated_at: string;
          user_id: string;
          vitality_level: number | null;
        };
        Insert: {
          created_at?: string;
          fatigue_level?: number | null;
          id?: string;
          note_text: string;
          program_session_id?: string | null;
          source?: string;
          training_program_id: string;
          updated_at?: string;
          user_id: string;
          vitality_level?: number | null;
        };
        Update: {
          created_at?: string;
          fatigue_level?: number | null;
          id?: string;
          note_text?: string;
          program_session_id?: string | null;
          source?: string;
          training_program_id?: string;
          updated_at?: string;
          user_id?: string;
          vitality_level?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "program_notes_program_session_id_fkey";
            columns: ["program_session_id"];
            isOneToOne: false;
            referencedRelation: "program_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "program_notes_training_program_id_fkey";
            columns: ["training_program_id"];
            isOneToOne: false;
            referencedRelation: "training_programs";
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
      coach_profile_strictness: "low" | "medium" | "high";
      coach_profile_tone: "calm" | "motivating" | "direct";
      coach_profile_verbosity: "short" | "balanced" | "detailed";
      external_workout_source: "manual" | "garmin" | "apple_health";
      external_workout_sport_type: "pole_dance" | "calisthenics" | "other";
      exercise_part: "Legs" | "Core" | "Back" | "Arms" | "Chest" | "Glutes";
      exercise_type: "Warm-up" | "Main Workout" | "Cool-down";
      program_session_status: "planned" | "completed";
      pr_metric_type: "total_reps" | "max_duration" | "max_weight";
      training_program_source: "ai" | "manual";
      training_program_status: "draft" | "active" | "archived";
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
