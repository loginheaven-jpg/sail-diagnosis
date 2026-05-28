/**
 * Supabase Database 타입 정의 (수동 작성)
 *
 * 본 파일은 supabase/migrations/*.sql 의 누적 스키마와 1:1 매핑된다.
 * 마이그레이션이 바뀌면 동시 갱신한다.
 *
 * 현재 반영된 마이그레이션:
 *   - 20260528000000_initial_schema.sql  (users + results)
 *   - 20260528120000_groups.sql          (groups + group_members + coach_applications,
 *                                         results.group_id, results.session_code DROP)
 */

import type { AnswerRecord, SailType } from './sail';

export type UserRole = 'user' | 'coach' | 'admin';
export type GroupStatus = 'active' | 'archived';
export type CoachApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          nickname: string | null;
          full_name: string | null;
          phone: string | null;
          email: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          nickname?: string | null;
          full_name?: string | null;
          phone?: string | null;
          email?: string | null;
          role?: UserRole;
        };
        Update: {
          nickname?: string | null;
          full_name?: string | null;
          phone?: string | null;
          email?: string | null;
          role?: UserRole;
        };
      };

      results: {
        Row: {
          id: string;
          user_id: string | null;
          group_id: string | null;
          nickname: string | null;
          answers: AnswerRecord;
          assertiveness_raw: number;
          responsiveness_raw: number;
          assertiveness_norm: number;
          responsiveness_norm: number;
          type_s_pct: number;
          type_a_pct: number;
          type_i_pct: number;
          type_l_pct: number;
          dominant_type: SailType;
          secondary_type: SailType | null;
          intensity: number;
          consistency_score: number | null;
          device: string | null;
          created_at: string;
        };
        Insert: {
          user_id?: string | null;
          group_id?: string | null;
          nickname?: string | null;
          answers: AnswerRecord;
          assertiveness_raw: number;
          responsiveness_raw: number;
          assertiveness_norm: number;
          responsiveness_norm: number;
          type_s_pct: number;
          type_a_pct: number;
          type_i_pct: number;
          type_l_pct: number;
          dominant_type: SailType;
          secondary_type?: SailType | null;
          intensity: number;
          consistency_score?: number | null;
          device?: string | null;
        };
        Update: Partial<Database['public']['Tables']['results']['Insert']>;
      };

      groups: {
        Row: {
          id: string;
          coach_id: string;
          name: string;
          description: string | null;
          code: string;
          max_members: number;
          status: GroupStatus;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          coach_id: string;
          name: string;
          description?: string | null;
          code: string;
          max_members?: number;
          status?: GroupStatus;
          expires_at?: string | null;
        };
        Update: {
          name?: string;
          description?: string | null;
          code?: string;
          max_members?: number;
          status?: GroupStatus;
          expires_at?: string | null;
        };
      };

      group_members: {
        Row: {
          group_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          group_id: string;
          user_id: string;
        };
        Update: never;
      };

      coach_applications: {
        Row: {
          id: string;
          user_id: string;
          status: CoachApplicationStatus;
          motivation: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_note: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          status?: CoachApplicationStatus;
          motivation?: string | null;
        };
        Update: {
          status?: CoachApplicationStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_note?: string | null;
        };
      };
    };

    Views: { [_ in never]: never };
    Functions: {
      resolve_group_by_code: {
        Args: { p_code: string };
        Returns: string | null;
      };
      phone_exists: {
        Args: { p_phone: string };
        Returns: boolean;
      };
      email_by_phone: {
        Args: { p_phone: string };
        Returns: string | null;
      };
      is_admin: { Args: { p_user_id: string }; Returns: boolean };
      is_group_coach: {
        Args: { p_group_id: string; p_user_id: string };
        Returns: boolean;
      };
      is_group_member: {
        Args: { p_group_id: string; p_user_id: string };
        Returns: boolean;
      };
      user_role: { Args: { p_user_id: string }; Returns: string };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

export type UserRow = Database['public']['Tables']['users']['Row'];
export type ResultRow = Database['public']['Tables']['results']['Row'];
export type ResultInsert = Database['public']['Tables']['results']['Insert'];

export type GroupRow = Database['public']['Tables']['groups']['Row'];
export type GroupInsert = Database['public']['Tables']['groups']['Insert'];
export type GroupUpdate = Database['public']['Tables']['groups']['Update'];

export type GroupMemberRow = Database['public']['Tables']['group_members']['Row'];

export type CoachApplicationRow =
  Database['public']['Tables']['coach_applications']['Row'];
export type CoachApplicationInsert =
  Database['public']['Tables']['coach_applications']['Insert'];
export type CoachApplicationUpdate =
  Database['public']['Tables']['coach_applications']['Update'];
