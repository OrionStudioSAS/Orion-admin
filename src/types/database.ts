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
          avatar_url: string | null
          job_title: string | null
          linkedin_url: string | null
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
          avatar_url?: string | null
          job_title?: string | null
          linkedin_url?: string | null
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
          avatar_url?: string | null
          job_title?: string | null
          linkedin_url?: string | null
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
          name: string | null
          plan_type: 'webflow_creation' | 'shopify_creation' | 'webflow_refonte' | 'shopify_refonte' | 'automation' | 'design' | 'maintenance' | 'autre' | null
          status: 'en_cours' | 'termine' | 'en_pause'
          figma_url: string | null
          site_url: string | null
          staging_url: string | null
          google_business_url: string | null
          monday_url: string | null
          deadline: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          name?: string | null
          plan_type?: 'webflow_creation' | 'shopify_creation' | 'webflow_refonte' | 'shopify_refonte' | 'automation' | 'design' | 'maintenance' | 'autre' | null
          status?: 'en_cours' | 'termine' | 'en_pause'
          figma_url?: string | null
          site_url?: string | null
          staging_url?: string | null
          google_business_url?: string | null
          monday_url?: string | null
          deadline?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string | null
          plan_type?: 'webflow_creation' | 'shopify_creation' | 'webflow_refonte' | 'shopify_refonte' | 'automation' | 'design' | 'maintenance' | 'autre' | null
          status?: 'en_cours' | 'termine' | 'en_pause'
          figma_url?: string | null
          site_url?: string | null
          staging_url?: string | null
          google_business_url?: string | null
          monday_url?: string | null
          deadline?: string | null
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
          type: 'file' | 'link'
          storage_path: string | null
          url: string | null
          original_name: string | null
          size_bytes: number | null
          visible_to_client: boolean
          amount_ht: number | null
          is_paid: boolean
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          category: 'resource' | 'invoice' | 'quote'
          type?: 'file' | 'link'
          storage_path?: string | null
          url?: string | null
          original_name?: string | null
          size_bytes?: number | null
          visible_to_client?: boolean
          amount_ht?: number | null
          is_paid?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          url?: string | null
          visible_to_client?: boolean
          amount_ht?: number | null
          is_paid?: boolean
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
      project_steps: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string | null
          status: 'todo' | 'in_progress' | 'done'
          position: number
          start_date: string | null
          end_date: string | null
          client_approved: boolean
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          description?: string | null
          status?: 'todo' | 'in_progress' | 'done'
          position?: number
          start_date?: string | null
          end_date?: string | null
          client_approved?: boolean
          created_at?: string
        }
        Update: {
          title?: string
          description?: string | null
          status?: 'todo' | 'in_progress' | 'done'
          position?: number
          start_date?: string | null
          end_date?: string | null
          client_approved?: boolean
        }
        Relationships: []
      }
      step_messages: {
        Row: {
          id: string
          step_id: string
          project_id: string
          sender_id: string
          is_admin_sender: boolean
          content: string | null
          attachment_path: string | null
          attachment_name: string | null
          attachment_size: number | null
          attachment_type: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          step_id: string
          project_id: string
          sender_id: string
          is_admin_sender?: boolean
          content?: string | null
          attachment_path?: string | null
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          is_read?: boolean
        }
        Relationships: []
      }
      client_documents: {
        Row: {
          id: string
          profile_id: string
          type: 'file' | 'link'
          name: string
          url: string | null
          storage_path: string | null
          original_name: string | null
          size_bytes: number | null
          visible_to_client: boolean
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          type?: 'file' | 'link'
          name: string
          url?: string | null
          storage_path?: string | null
          original_name?: string | null
          size_bytes?: number | null
          visible_to_client?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          url?: string | null
          visible_to_client?: boolean
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
          channel: 'email' | 'cold_call'
          status: 'nouveau' | 'contacte' | 'en_discussion' | 'rdv_pris' | 'converti' | 'perdu'
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
          channel?: 'email' | 'cold_call'
          status?: 'nouveau' | 'contacte' | 'en_discussion' | 'rdv_pris' | 'converti' | 'perdu'
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
          channel?: 'email' | 'cold_call'
          status?: 'nouveau' | 'contacte' | 'en_discussion' | 'rdv_pris' | 'converti' | 'perdu'
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      apps: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          logo_url?: string | null
          description?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          logo_url?: string | null
          description?: string | null
        }
        Relationships: []
      }
      project_apps: {
        Row: {
          id: string
          project_id: string
          app_id: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          app_id: string
          created_at?: string
        }
        Update: {
          project_id?: string
          app_id?: string
        }
        Relationships: []
      }
      project_team_members: {
        Row: {
          id: string
          project_id: string
          profile_id: string
          role_override: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          profile_id: string
          role_override?: string | null
          created_at?: string
        }
        Update: {
          role_override?: string | null
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
export type ClientDocument = Database['public']['Tables']['client_documents']['Row']
export type ProjectStep = Database['public']['Tables']['project_steps']['Row']
export type StepMessage = Database['public']['Tables']['step_messages']['Row']
export type App = Database['public']['Tables']['apps']['Row']
export type ProjectApp = Database['public']['Tables']['project_apps']['Row']
export type ProjectTeamMember = Database['public']['Tables']['project_team_members']['Row']
