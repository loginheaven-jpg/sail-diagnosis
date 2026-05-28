/**
 * Supabase Database 타입 정의 (수동 작성)
 *
 * 본 파일은 supabase/migrations/20260528000000_initial_schema.sql 의
 * 테이블 구조와 1:1 매핑된다. 마이그레이션이 바뀌면 동시 갱신한다.
 *
 * 향후 `supabase gen types typescript`로 자동 생성으로 전환할 수 있다.
 */

import type { AnswerRecord, SailType } from './sail';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          nickname: string | null;
          email: string | null;
          role: 'user' | 'coach' | 'admin';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          nickname?: string | null;
          email?: string | null;
          role?: 'user' | 'coach' | 'admin';
        };
        Update: {
          nickname?: string | null;
          email?: string | null;
          role?: 'user' | 'coach' | 'admin';
        };
      };
      results: {
        Row: {
          id: string;
          user_id: string | null;
          session_code: string | null;
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
          session_code?: string | null;
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
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

export type UserRow = Database['public']['Tables']['users']['Row'];
export type ResultRow = Database['public']['Tables']['results']['Row'];
export type ResultInsert = Database['public']['Tables']['results']['Insert'];
