export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'admin' | 'client'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'admin' | 'client'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'admin' | 'client'
          updated_at?: string
        }
        Relationships: []
      }
      flows: {
        Row: {
          id: string
          name: string
          description: string | null
          webhook_url: string
          category: string | null
          icon: string
          is_active: boolean
          form_schema: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          webhook_url: string
          category?: string | null
          icon?: string
          is_active?: boolean
          form_schema?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          webhook_url?: string
          category?: string | null
          icon?: string
          is_active?: boolean
          form_schema?: Json
          updated_at?: string
        }
        Relationships: []
      }
      flow_access: {
        Row: {
          id: string
          flow_id: string
          profile_id: string
          created_at: string
        }
        Insert: {
          id?: string
          flow_id: string
          profile_id: string
          created_at?: string
        }
        Update: {
          id?: string
          flow_id?: string
          profile_id?: string
        }
        Relationships: []
      }
      flow_executions: {
        Row: {
          id: string
          flow_id: string | null
          profile_id: string | null
          status: 'pending' | 'success' | 'error'
          payload: Json
          response: Json
          executed_at: string
        }
        Insert: {
          id?: string
          flow_id?: string | null
          profile_id?: string | null
          status?: 'pending' | 'success' | 'error'
          payload?: Json
          response?: Json
          executed_at?: string
        }
        Update: {
          id?: string
          flow_id?: string | null
          profile_id?: string | null
          status?: 'pending' | 'success' | 'error'
          payload?: Json
          response?: Json
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export interface FormField {
  name: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'number' | 'email'
  required: boolean
  placeholder?: string
  options?: string[]
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Flow = Database['public']['Tables']['flows']['Row']
export type FlowAccess = Database['public']['Tables']['flow_access']['Row']
export type FlowExecution = Database['public']['Tables']['flow_executions']['Row']
