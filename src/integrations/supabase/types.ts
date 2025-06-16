export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_agent_calendar_settings: {
        Row: {
          agent_id: string
          agent_name: string
          can_check_availability: boolean | null
          can_create_appointments: boolean | null
          can_delete_appointments: boolean | null
          can_modify_appointments: boolean | null
          conflict_resolution: string | null
          created_at: string
          default_appointment_duration: number | null
          id: string
          updated_at: string
          working_days: string[] | null
          working_hours_end: string | null
          working_hours_start: string | null
        }
        Insert: {
          agent_id: string
          agent_name: string
          can_check_availability?: boolean | null
          can_create_appointments?: boolean | null
          can_delete_appointments?: boolean | null
          can_modify_appointments?: boolean | null
          conflict_resolution?: string | null
          created_at?: string
          default_appointment_duration?: number | null
          id?: string
          updated_at?: string
          working_days?: string[] | null
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Update: {
          agent_id?: string
          agent_name?: string
          can_check_availability?: boolean | null
          can_create_appointments?: boolean | null
          can_delete_appointments?: boolean | null
          can_modify_appointments?: boolean | null
          conflict_resolution?: string | null
          created_at?: string
          default_appointment_duration?: number | null
          id?: string
          updated_at?: string
          working_days?: string[] | null
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Relationships: []
      }
      ai_agent_chat_logs: {
        Row: {
          action_taken: string | null
          ai_agent_id: string
          appointment_created: string | null
          created_at: string
          id: string
          intent_detected: string | null
          message_content: string
          message_type: string
          metadata: Json | null
          session_id: string
          user_id: string
        }
        Insert: {
          action_taken?: string | null
          ai_agent_id: string
          appointment_created?: string | null
          created_at?: string
          id?: string
          intent_detected?: string | null
          message_content: string
          message_type: string
          metadata?: Json | null
          session_id: string
          user_id: string
        }
        Update: {
          action_taken?: string | null
          ai_agent_id?: string
          appointment_created?: string | null
          created_at?: string
          id?: string
          intent_detected?: string | null
          message_content?: string
          message_type?: string
          metadata?: Json | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_chat_logs_ai_agent_id_fkey"
            columns: ["ai_agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_chat_logs_appointment_created_fkey"
            columns: ["appointment_created"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_contexts: {
        Row: {
          agent_id: string
          context_type: string
          created_at: string
          id: string
          is_active: boolean | null
          priority: number | null
          query_template: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          context_type: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          priority?: number | null
          query_template: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          context_type?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          priority?: number | null
          query_template?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_contexts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_webhooks: {
        Row: {
          agent_id: string
          created_at: string
          headers: Json | null
          id: string
          is_active: boolean | null
          retry_count: number | null
          timeout_seconds: number | null
          updated_at: string
          webhook_name: string
          webhook_url: string
          workflow_type: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          retry_count?: number | null
          timeout_seconds?: number | null
          updated_at?: string
          webhook_name: string
          webhook_url: string
          workflow_type: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          retry_count?: number | null
          timeout_seconds?: number | null
          updated_at?: string
          webhook_name?: string
          webhook_url?: string
          workflow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_webhooks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          capabilities: string[]
          context_settings: Json | null
          created_at: string
          created_by: string | null
          data_access_permissions: Json | null
          id: string
          is_active: boolean | null
          is_webhook_enabled: boolean | null
          name: string
          permissions: Json | null
          persona: string
          system_prompt: string
          updated_at: string
          webhook_config: Json | null
          webhook_url: string | null
        }
        Insert: {
          capabilities: string[]
          context_settings?: Json | null
          created_at?: string
          created_by?: string | null
          data_access_permissions?: Json | null
          id?: string
          is_active?: boolean | null
          is_webhook_enabled?: boolean | null
          name: string
          permissions?: Json | null
          persona: string
          system_prompt: string
          updated_at?: string
          webhook_config?: Json | null
          webhook_url?: string | null
        }
        Update: {
          capabilities?: string[]
          context_settings?: Json | null
          created_at?: string
          created_by?: string | null
          data_access_permissions?: Json | null
          id?: string
          is_active?: boolean | null
          is_webhook_enabled?: boolean | null
          name?: string
          permissions?: Json | null
          persona?: string
          system_prompt?: string
          updated_at?: string
          webhook_config?: Json | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          message_type: string
          processing_time_ms: number | null
          session_id: string
          webhook_response: Json | null
          webhook_triggered: boolean | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_type: string
          processing_time_ms?: number | null
          session_id: string
          webhook_response?: Json | null
          webhook_triggered?: boolean | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          processing_time_ms?: number | null
          session_id?: string
          webhook_response?: Json | null
          webhook_triggered?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_sessions: {
        Row: {
          agent_id: string
          context: Json | null
          created_at: string
          ended_at: string | null
          id: string
          session_token: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agent_id: string
          context?: Json | null
          created_at?: string
          ended_at?: string | null
          id?: string
          session_token: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agent_id?: string
          context?: Json | null
          created_at?: string
          ended_at?: string | null
          id?: string
          session_token?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_webhook_logs: {
        Row: {
          agent_id: string
          created_at: string
          error_message: string | null
          id: string
          processing_time_ms: number | null
          request_payload: Json
          response_payload: Json | null
          retry_attempt: number | null
          session_id: string | null
          status_code: number | null
          success: boolean | null
          webhook_id: string | null
          webhook_url: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          processing_time_ms?: number | null
          request_payload: Json
          response_payload?: Json | null
          retry_attempt?: number | null
          session_id?: string | null
          status_code?: number | null
          success?: boolean | null
          webhook_id?: string | null
          webhook_url: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          processing_time_ms?: number | null
          request_payload?: Json
          response_payload?: Json | null
          retry_attempt?: number | null
          session_id?: string | null
          status_code?: number | null
          success?: boolean | null
          webhook_id?: string | null
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_webhook_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_webhook_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_webhook_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "ai_agent_webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          ai_agent_id: string | null
          assignedto: string | null
          confirmationsent: boolean | null
          created_at: string
          created_by_ai: boolean | null
          createdby: string
          customeremail: string | null
          customerid: string | null
          customername: string | null
          customerphone: string | null
          description: string | null
          endtime: string
          google_calendar_id: string | null
          google_event_id: string | null
          id: string
          last_synced_at: string | null
          leadid: string | null
          location: string | null
          notes: string | null
          remindersent: boolean | null
          starttime: string
          status: string
          sync_status: string | null
          title: string
          type: string
          updated_at: string
          vehiclebrand: string | null
          vehicleid: string | null
          vehiclelicensenumber: string | null
          vehiclemodel: string | null
        }
        Insert: {
          ai_agent_id?: string | null
          assignedto?: string | null
          confirmationsent?: boolean | null
          created_at?: string
          created_by_ai?: boolean | null
          createdby: string
          customeremail?: string | null
          customerid?: string | null
          customername?: string | null
          customerphone?: string | null
          description?: string | null
          endtime: string
          google_calendar_id?: string | null
          google_event_id?: string | null
          id?: string
          last_synced_at?: string | null
          leadid?: string | null
          location?: string | null
          notes?: string | null
          remindersent?: boolean | null
          starttime: string
          status?: string
          sync_status?: string | null
          title: string
          type: string
          updated_at?: string
          vehiclebrand?: string | null
          vehicleid?: string | null
          vehiclelicensenumber?: string | null
          vehiclemodel?: string | null
        }
        Update: {
          ai_agent_id?: string | null
          assignedto?: string | null
          confirmationsent?: boolean | null
          created_at?: string
          created_by_ai?: boolean | null
          createdby?: string
          customeremail?: string | null
          customerid?: string | null
          customername?: string | null
          customerphone?: string | null
          description?: string | null
          endtime?: string
          google_calendar_id?: string | null
          google_event_id?: string | null
          id?: string
          last_synced_at?: string | null
          leadid?: string | null
          location?: string | null
          notes?: string | null
          remindersent?: boolean | null
          starttime?: string
          status?: string
          sync_status?: string | null
          title?: string
          type?: string
          updated_at?: string
          vehiclebrand?: string | null
          vehicleid?: string | null
          vehiclelicensenumber?: string | null
          vehiclemodel?: string | null
        }
        Relationships: []
      }
      calendar_sync_logs: {
        Row: {
          appointment_id: string | null
          created_at: string
          error_message: string | null
          google_event_id: string | null
          id: string
          performed_by_ai_agent_id: string | null
          performed_by_user_id: string | null
          sync_action: string
          sync_data: Json | null
          sync_direction: string
          sync_status: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          error_message?: string | null
          google_event_id?: string | null
          id?: string
          performed_by_ai_agent_id?: string | null
          performed_by_user_id?: string | null
          sync_action: string
          sync_data?: Json | null
          sync_direction: string
          sync_status: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          error_message?: string | null
          google_event_id?: string | null
          id?: string
          performed_by_ai_agent_id?: string | null
          performed_by_user_id?: string | null
          sync_action?: string
          sync_data?: Json | null
          sync_direction?: string
          sync_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_sync_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_sync_logs_performed_by_ai_agent_id_fkey"
            columns: ["performed_by_ai_agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      company_calendar_settings: {
        Row: {
          auth_type: string | null
          auto_sync: boolean | null
          calendar_email: string | null
          calendar_name: string | null
          company_id: string
          conflict_resolution: string | null
          created_at: string
          google_access_token: string | null
          google_calendar_id: string | null
          google_refresh_token: string | null
          google_token_expires_at: string | null
          id: string
          managed_by_user_id: string | null
          service_account_email: string | null
          sync_direction: string | null
          sync_enabled: boolean | null
          updated_at: string
        }
        Insert: {
          auth_type?: string | null
          auto_sync?: boolean | null
          calendar_email?: string | null
          calendar_name?: string | null
          company_id?: string
          conflict_resolution?: string | null
          created_at?: string
          google_access_token?: string | null
          google_calendar_id?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id?: string
          managed_by_user_id?: string | null
          service_account_email?: string | null
          sync_direction?: string | null
          sync_enabled?: boolean | null
          updated_at?: string
        }
        Update: {
          auth_type?: string | null
          auto_sync?: boolean | null
          calendar_email?: string | null
          calendar_name?: string | null
          company_id?: string
          conflict_resolution?: string | null
          created_at?: string
          google_access_token?: string | null
          google_calendar_id?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id?: string
          managed_by_user_id?: string | null
          service_account_email?: string | null
          sync_direction?: string | null
          sync_enabled?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          address_city: string | null
          address_street: string | null
          company_name: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          type: string
          updated_at: string
        }
        Insert: {
          address_city?: string | null
          address_street?: string | null
          company_name?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          address_city?: string | null
          address_street?: string | null
          company_name?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          contract_amount: number | null
          contract_number: string
          created_at: string
          customer_id: string | null
          id: string
          status: string
          type: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          contract_amount?: number | null
          contract_number: string
          created_at?: string
          customer_id?: string | null
          id?: string
          status: string
          type: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          contract_amount?: number | null
          contract_number?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          status?: string
          type?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          interested_vehicle: string | null
          last_name: string | null
          phone: string | null
          priority: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          interested_vehicle?: string | null
          last_name?: string | null
          phone?: string | null
          priority: string
          status: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          interested_vehicle?: string | null
          last_name?: string | null
          phone?: string | null
          priority?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_interested_vehicle_fkey"
            columns: ["interested_vehicle"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_cars: {
        Row: {
          created_at: string
          customer_id: string | null
          end_date: string | null
          id: string
          notes: string | null
          start_date: string | null
          status: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loan_cars_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_cars_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_calendar_settings: {
        Row: {
          auto_sync: boolean | null
          calendar_name: string | null
          conflict_resolution: string | null
          created_at: string
          google_access_token: string | null
          google_calendar_id: string | null
          google_refresh_token: string | null
          google_token_expires_at: string | null
          id: string
          sync_direction: string | null
          sync_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_sync?: boolean | null
          calendar_name?: string | null
          conflict_resolution?: string | null
          created_at?: string
          google_access_token?: string | null
          google_calendar_id?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id?: string
          sync_direction?: string | null
          sync_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_sync?: boolean | null
          calendar_name?: string | null
          conflict_resolution?: string | null
          created_at?: string
          google_access_token?: string | null
          google_calendar_id?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id?: string
          sync_direction?: string | null
          sync_enabled?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_calendar_settings_profile"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          brand: string
          color: string | null
          created_at: string
          customer_id: string | null
          id: string
          license_number: string | null
          location: string | null
          mileage: number | null
          model: string
          selling_price: number | null
          status: string
          updated_at: string
          vin: string | null
          year: number | null
        }
        Insert: {
          brand: string
          color?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          license_number?: string | null
          location?: string | null
          mileage?: number | null
          model: string
          selling_price?: number | null
          status?: string
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Update: {
          brand?: string
          color?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          license_number?: string | null
          location?: string | null
          mileage?: number | null
          model?: string
          selling_price?: number | null
          status?: string
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_claims: {
        Row: {
          claim_amount: number | null
          claim_status: string
          created_at: string
          description: string | null
          id: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          claim_amount?: number | null
          claim_status?: string
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          claim_amount?: number | null
          claim_status?: string
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warranty_claims_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      verify_webhook_sync: {
        Args: { agent_uuid: string }
        Returns: {
          agent_id: string
          agent_name: string
          agents_webhook_enabled: boolean
          agents_webhook_url: string
          webhooks_count: number
          active_webhooks_count: number
          is_synchronized: boolean
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
