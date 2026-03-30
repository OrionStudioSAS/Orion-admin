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
          company: string | null
          website: string | null
          webflow_site: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'admin' | 'client'
          company?: string | null
          website?: string | null
          webflow_site?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'admin' | 'client'
          company?: string | null
          website?: string | null
          webflow_site?: string | null
          phone?: string | null
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
      support_messages: {
        Row: {
          id: string
          profile_id: string
          sender_id: string
          content: string
          is_admin_sender: boolean
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          sender_id: string
          content: string
          is_admin_sender?: boolean
          is_read?: boolean
          created_at?: string
        }
        Update: {
          is_read?: boolean
        }
        Relationships: []
      }
      access_requests: {
        Row: {
          id: string
          profile_id: string
          flow_id: string
          status: 'pending' | 'approved' | 'rejected'
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          flow_id: string
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
        }
        Update: {
          id?: string
          status?: 'pending' | 'approved' | 'rejected'
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
export type AccessRequest = Database['public']['Tables']['access_requests']['Row']
export type SupportMessage = Database['public']['Tables']['support_messages']['Row']
