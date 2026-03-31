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
      projects: {
        Row: {
          id: string
          profile_id: string
          plan_type: 'webflow_creation' | 'shopify_creation' | 'webflow_refonte' | 'shopify_refonte' | 'autre' | null
          status: 'en_cours' | 'termine' | 'en_pause'
          figma_url: string | null
          site_url: string | null
          monday_url: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          plan_type?: 'webflow_creation' | 'shopify_creation' | 'webflow_refonte' | 'shopify_refonte' | 'autre' | null
          status?: 'en_cours' | 'termine' | 'en_pause'
          figma_url?: string | null
          site_url?: string | null
          monday_url?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          plan_type?: 'webflow_creation' | 'shopify_creation' | 'webflow_refonte' | 'shopify_refonte' | 'autre' | null
          status?: 'en_cours' | 'termine' | 'en_pause'
          figma_url?: string | null
          site_url?: string | null
          monday_url?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_files: {
        Row: {
          id: string
          project_id: string
          name: string
          category: 'resource' | 'invoice' | 'quote'
          storage_path: string
          original_name: string | null
          size_bytes: number | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          category: 'resource' | 'invoice' | 'quote'
          storage_path: string
          original_name?: string | null
          size_bytes?: number | null
          created_at?: string
        }
        Update: {
          name?: string
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
      prospects: {
        Row: {
          id: string
          company_name: string
          contact_name: string | null
          email: string | null
          phone: string | null
          linkedin_url: string | null
          website: string | null
          sector: string | null
          location: string | null
          source: string
          status: 'nouveau' | 'contacte' | 'en_discussion' | 'converti' | 'perdu'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_name: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          linkedin_url?: string | null
          website?: string | null
          sector?: string | null
          location?: string | null
          source?: string
          status?: 'nouveau' | 'contacte' | 'en_discussion' | 'converti' | 'perdu'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          company_name?: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          linkedin_url?: string | null
          website?: string | null
          sector?: string | null
          location?: string | null
          source?: string
          status?: 'nouveau' | 'contacte' | 'en_discussion' | 'converti' | 'perdu'
          notes?: string | null
          updated_at?: string
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
export type Project = Database['public']['Tables']['projects']['Row']
export type ProjectFile = Database['public']['Tables']['project_files']['Row']
export type Prospect = Database['public']['Tables']['prospects']['Row']
