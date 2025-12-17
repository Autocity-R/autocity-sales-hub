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
    PostgrestVersion: "12.2.3 (519615d)"
  }
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
          context_items_used: Json | null
          created_at: string
          id: string
          memory_references: Json | null
          message_type: string
          processing_time_ms: number | null
          session_id: string
          webhook_response: Json | null
          webhook_triggered: boolean | null
        }
        Insert: {
          content: string
          context_items_used?: Json | null
          created_at?: string
          id?: string
          memory_references?: Json | null
          message_type: string
          processing_time_ms?: number | null
          session_id: string
          webhook_response?: Json | null
          webhook_triggered?: boolean | null
        }
        Update: {
          content?: string
          context_items_used?: Json | null
          created_at?: string
          id?: string
          memory_references?: Json | null
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
          context_summary: string | null
          created_at: string
          ended_at: string | null
          id: string
          lead_id: string | null
          memory_context: Json | null
          session_token: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agent_id: string
          context?: Json | null
          context_summary?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          lead_id?: string | null
          memory_context?: Json | null
          session_token: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agent_id?: string
          context?: Json | null
          context_summary?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          lead_id?: string | null
          memory_context?: Json | null
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
          {
            foreignKeyName: "ai_chat_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_email_processing: {
        Row: {
          competitive_mentions: Json | null
          content_summary: string | null
          created_at: string | null
          email_id: string
          email_message_id: string | null
          id: string
          intent_classification: string | null
          key_insights: Json | null
          lead_id: string | null
          lead_score: number
          processed_at: string | null
          processing_agent: string | null
          response_generated: boolean | null
          response_sent: boolean | null
          sender_email: string
          sentiment_score: number | null
          subject: string | null
          suggested_response: string | null
          urgency_level: string | null
        }
        Insert: {
          competitive_mentions?: Json | null
          content_summary?: string | null
          created_at?: string | null
          email_id: string
          email_message_id?: string | null
          id?: string
          intent_classification?: string | null
          key_insights?: Json | null
          lead_id?: string | null
          lead_score?: number
          processed_at?: string | null
          processing_agent?: string | null
          response_generated?: boolean | null
          response_sent?: boolean | null
          sender_email: string
          sentiment_score?: number | null
          subject?: string | null
          suggested_response?: string | null
          urgency_level?: string | null
        }
        Update: {
          competitive_mentions?: Json | null
          content_summary?: string | null
          created_at?: string | null
          email_id?: string
          email_message_id?: string | null
          id?: string
          intent_classification?: string | null
          key_insights?: Json | null
          lead_id?: string | null
          lead_score?: number
          processed_at?: string | null
          processing_agent?: string | null
          response_generated?: boolean | null
          response_sent?: boolean | null
          sender_email?: string
          sentiment_score?: number | null
          subject?: string | null
          suggested_response?: string | null
          urgency_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_email_processing_email_message_id_fkey"
            columns: ["email_message_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_email_processing_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_lead_memory: {
        Row: {
          context_data: Json
          context_type: string
          created_at: string
          expires_at: string | null
          id: string
          importance_score: number | null
          lead_id: string
          updated_at: string
        }
        Insert: {
          context_data?: Json
          context_type: string
          created_at?: string
          expires_at?: string | null
          id?: string
          importance_score?: number | null
          lead_id: string
          updated_at?: string
        }
        Update: {
          context_data?: Json
          context_type?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          importance_score?: number | null
          lead_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_lead_memory_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_sales_interactions: {
        Row: {
          agent_name: string | null
          ai_response: string | null
          created_at: string | null
          id: string
          input_data: Json
          interaction_type: string
          outcome: string | null
          success_indicators: Json | null
          team_feedback: string | null
          team_rating: number | null
          user_id: string | null
        }
        Insert: {
          agent_name?: string | null
          ai_response?: string | null
          created_at?: string | null
          id?: string
          input_data: Json
          interaction_type: string
          outcome?: string | null
          success_indicators?: Json | null
          team_feedback?: string | null
          team_rating?: number | null
          user_id?: string | null
        }
        Update: {
          agent_name?: string | null
          ai_response?: string | null
          created_at?: string | null
          id?: string
          input_data?: Json
          interaction_type?: string
          outcome?: string | null
          success_indicators?: Json | null
          team_feedback?: string | null
          team_rating?: number | null
          user_id?: string | null
        }
        Relationships: []
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
      competitor_dealers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_scrape_status: string | null
          last_scrape_vehicles_count: number | null
          last_scraped_at: string | null
          name: string
          notes: string | null
          scrape_schedule: string
          scrape_time: string
          scrape_url: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_scrape_status?: string | null
          last_scrape_vehicles_count?: number | null
          last_scraped_at?: string | null
          name: string
          notes?: string | null
          scrape_schedule?: string
          scrape_time?: string
          scrape_url: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_scrape_status?: string | null
          last_scrape_vehicles_count?: number | null
          last_scraped_at?: string | null
          name?: string
          notes?: string | null
          scrape_schedule?: string
          scrape_time?: string
          scrape_url?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      competitor_price_history: {
        Row: {
          id: string
          new_price: number | null
          old_price: number | null
          price_change: number | null
          recorded_at: string
          vehicle_id: string
        }
        Insert: {
          id?: string
          new_price?: number | null
          old_price?: number | null
          price_change?: number | null
          recorded_at?: string
          vehicle_id: string
        }
        Update: {
          id?: string
          new_price?: number | null
          old_price?: number | null
          price_change?: number | null
          recorded_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_price_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "competitor_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_scrape_logs: {
        Row: {
          dealer_id: string
          duration_ms: number | null
          error_message: string | null
          id: string
          scraped_at: string
          status: string
          vehicles_found: number | null
          vehicles_new: number | null
          vehicles_reappeared: number | null
          vehicles_sold: number | null
        }
        Insert: {
          dealer_id: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          scraped_at?: string
          status?: string
          vehicles_found?: number | null
          vehicles_new?: number | null
          vehicles_reappeared?: number | null
          vehicles_sold?: number | null
        }
        Update: {
          dealer_id?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          scraped_at?: string
          status?: string
          vehicles_found?: number | null
          vehicles_new?: number | null
          vehicles_reappeared?: number | null
          vehicles_sold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_scrape_logs_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "competitor_dealers"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_vehicles: {
        Row: {
          body_type: string | null
          brand: string
          build_year: number | null
          color: string | null
          consecutive_missing_scrapes: number
          created_at: string
          dealer_id: string
          external_url: string | null
          fingerprint: string
          first_seen_at: string
          fuel_type: string | null
          id: string
          image_url: string | null
          last_seen_at: string
          license_plate: string | null
          mileage: number | null
          mileage_bucket: number | null
          model: string
          price: number | null
          reappeared_count: number
          sold_at: string | null
          status: string
          total_stock_days: number
          transmission: string | null
          updated_at: string
          variant: string | null
        }
        Insert: {
          body_type?: string | null
          brand: string
          build_year?: number | null
          color?: string | null
          consecutive_missing_scrapes?: number
          created_at?: string
          dealer_id: string
          external_url?: string | null
          fingerprint: string
          first_seen_at?: string
          fuel_type?: string | null
          id?: string
          image_url?: string | null
          last_seen_at?: string
          license_plate?: string | null
          mileage?: number | null
          mileage_bucket?: number | null
          model: string
          price?: number | null
          reappeared_count?: number
          sold_at?: string | null
          status?: string
          total_stock_days?: number
          transmission?: string | null
          updated_at?: string
          variant?: string | null
        }
        Update: {
          body_type?: string | null
          brand?: string
          build_year?: number | null
          color?: string | null
          consecutive_missing_scrapes?: number
          created_at?: string
          dealer_id?: string
          external_url?: string | null
          fingerprint?: string
          first_seen_at?: string
          fuel_type?: string | null
          id?: string
          image_url?: string | null
          last_seen_at?: string
          license_plate?: string | null
          mileage?: number | null
          mileage_bucket?: number | null
          model?: string
          price?: number | null
          reappeared_count?: number
          sold_at?: string | null
          status?: string
          total_stock_days?: number
          transmission?: string | null
          updated_at?: string
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_vehicles_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "competitor_dealers"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          additional_emails: Json | null
          address_city: string | null
          address_number: string | null
          address_postal_code: string | null
          address_street: string | null
          company_name: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          is_car_dealer: boolean
          last_name: string
          phone: string | null
          type: string
          updated_at: string
        }
        Insert: {
          additional_emails?: Json | null
          address_city?: string | null
          address_number?: string | null
          address_postal_code?: string | null
          address_street?: string | null
          company_name?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          is_car_dealer?: boolean
          last_name: string
          phone?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          additional_emails?: Json | null
          address_city?: string | null
          address_number?: string | null
          address_postal_code?: string | null
          address_street?: string | null
          company_name?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          is_car_dealer?: boolean
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
      damage_repair_records: {
        Row: {
          completed_at: string
          created_at: string
          employee_id: string | null
          employee_name: string | null
          id: string
          part_count: number
          repair_cost: number
          repaired_parts: Json
          task_id: string | null
          vehicle_brand: string
          vehicle_id: string | null
          vehicle_license_number: string | null
          vehicle_model: string
          vehicle_vin: string | null
        }
        Insert: {
          completed_at: string
          created_at?: string
          employee_id?: string | null
          employee_name?: string | null
          id?: string
          part_count?: number
          repair_cost?: number
          repaired_parts?: Json
          task_id?: string | null
          vehicle_brand: string
          vehicle_id?: string | null
          vehicle_license_number?: string | null
          vehicle_model: string
          vehicle_vin?: string | null
        }
        Update: {
          completed_at?: string
          created_at?: string
          employee_id?: string | null
          employee_name?: string | null
          id?: string
          part_count?: number
          repair_cost?: number
          repaired_parts?: Json
          task_id?: string | null
          vehicle_brand?: string
          vehicle_id?: string | null
          vehicle_license_number?: string | null
          vehicle_model?: string
          vehicle_vin?: string | null
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          attachment_count: number | null
          cc_emails: string[] | null
          created_at: string | null
          error_message: string | null
          gmail_message_id: string | null
          id: string
          recipient_email: string
          sender_email: string
          sent_at: string | null
          sent_by_user_id: string | null
          status: string
          subject: string
          template_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          attachment_count?: number | null
          cc_emails?: string[] | null
          created_at?: string | null
          error_message?: string | null
          gmail_message_id?: string | null
          id?: string
          recipient_email: string
          sender_email: string
          sent_at?: string | null
          sent_by_user_id?: string | null
          status?: string
          subject: string
          template_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          attachment_count?: number | null
          cc_emails?: string[] | null
          created_at?: string | null
          error_message?: string | null
          gmail_message_id?: string | null
          id?: string
          recipient_email?: string
          sender_email?: string
          sent_at?: string | null
          sent_by_user_id?: string | null
          status?: string
          subject?: string
          template_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_messages: {
        Row: {
          body: string | null
          clean_customer_message: string | null
          created_at: string
          html_body: string | null
          id: string
          is_from_customer: boolean | null
          lead_id: string | null
          message_id: string
          parsed_data: Json | null
          portal_source: string | null
          received_at: string
          recipient: string
          sender: string
          subject: string | null
          thread_id: string | null
        }
        Insert: {
          body?: string | null
          clean_customer_message?: string | null
          created_at?: string
          html_body?: string | null
          id?: string
          is_from_customer?: boolean | null
          lead_id?: string | null
          message_id: string
          parsed_data?: Json | null
          portal_source?: string | null
          received_at: string
          recipient: string
          sender: string
          subject?: string | null
          thread_id?: string | null
        }
        Update: {
          body?: string | null
          clean_customer_message?: string | null
          created_at?: string
          html_body?: string | null
          id?: string
          is_from_customer?: boolean | null
          lead_id?: string | null
          message_id?: string
          parsed_data?: Json | null
          portal_source?: string | null
          received_at?: string
          recipient?: string
          sender?: string
          subject?: string | null
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "email_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          attempts: number
          created_at: string
          error_message: string | null
          id: string
          last_attempt_at: string | null
          payload: Json
          retry_after: string | null
          status: string
          template_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          payload: Json
          retry_after?: string | null
          status?: string
          template_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          payload?: Json
          retry_after?: string | null
          status?: string
          template_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_reminders: {
        Row: {
          created_at: string
          email_type: string
          id: string
          next_reminder_at: string | null
          recipient_email: string
          reminder_type: string
          sent_at: string
          status: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          email_type: string
          id?: string
          next_reminder_at?: string | null
          recipient_email: string
          reminder_type: string
          sent_at?: string
          status?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          email_type?: string
          id?: string
          next_reminder_at?: string | null
          recipient_email?: string
          reminder_type?: string
          sent_at?: string
          status?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_reminders_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_response_suggestions: {
        Row: {
          actual_response_sent: string | null
          created_at: string | null
          email_processing_id: string | null
          id: string
          lead_id: string | null
          modified_by_team: boolean | null
          personalization_factors: Json | null
          priority_level: string | null
          response_type: string | null
          sent_at: string | null
          suggested_response: string
          team_action: string | null
          team_modifications: string | null
          team_rating: number | null
          used_by_team: boolean | null
        }
        Insert: {
          actual_response_sent?: string | null
          created_at?: string | null
          email_processing_id?: string | null
          id?: string
          lead_id?: string | null
          modified_by_team?: boolean | null
          personalization_factors?: Json | null
          priority_level?: string | null
          response_type?: string | null
          sent_at?: string | null
          suggested_response: string
          team_action?: string | null
          team_modifications?: string | null
          team_rating?: number | null
          used_by_team?: boolean | null
        }
        Update: {
          actual_response_sent?: string | null
          created_at?: string | null
          email_processing_id?: string | null
          id?: string
          lead_id?: string | null
          modified_by_team?: boolean | null
          personalization_factors?: Json | null
          priority_level?: string | null
          response_type?: string | null
          sent_at?: string | null
          suggested_response?: string
          team_action?: string | null
          team_modifications?: string | null
          team_rating?: number | null
          used_by_team?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "email_response_suggestions_email_processing_id_fkey"
            columns: ["email_processing_id"]
            isOneToOne: false
            referencedRelation: "ai_email_processing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_response_suggestions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sent_log: {
        Row: {
          created_at: string
          email_type: string
          error_message: string | null
          id: string
          recipient_email: string
          recipient_name: string | null
          sent_at: string
          sent_by: string | null
          status: string
          subject: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          email_type: string
          error_message?: string | null
          id?: string
          recipient_email: string
          recipient_name?: string | null
          sent_at?: string
          sent_by?: string | null
          status?: string
          subject: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          email_type?: string
          error_message?: string | null
          id?: string
          recipient_email?: string
          recipient_name?: string | null
          sent_at?: string
          sent_by?: string | null
          status?: string
          subject?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sent_log_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_threads: {
        Row: {
          created_at: string
          first_message_date: string | null
          from_email: string | null
          id: string
          last_message_date: string | null
          lead_id: string | null
          message_count: number | null
          participants: Json | null
          status: string | null
          subject: string | null
          thread_id: string
          to_email: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_message_date?: string | null
          from_email?: string | null
          id?: string
          last_message_date?: string | null
          lead_id?: string | null
          message_count?: number | null
          participants?: Json | null
          status?: string | null
          subject?: string | null
          thread_id: string
          to_email?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_message_date?: string | null
          from_email?: string | null
          id?: string
          last_message_date?: string | null
          lead_id?: string | null
          message_count?: number | null
          participants?: Json | null
          status?: string | null
          subject?: string | null
          thread_id?: string
          to_email?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_threads_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      exact_online_cache: {
        Row: {
          cache_key: string
          created_at: string | null
          data: Json
          division_code: string | null
          entity_type: string
          expires_at: string
          id: string
        }
        Insert: {
          cache_key: string
          created_at?: string | null
          data: Json
          division_code?: string | null
          entity_type: string
          expires_at: string
          id?: string
        }
        Update: {
          cache_key?: string
          created_at?: string | null
          data?: Json
          division_code?: string | null
          entity_type?: string
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      exact_online_sync_status: {
        Row: {
          created_at: string | null
          division_code: string | null
          entity_type: string
          error_message: string | null
          id: string
          last_sync: string | null
          records_processed: number | null
          sync_duration_ms: number | null
          sync_status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          division_code?: string | null
          entity_type: string
          error_message?: string | null
          id?: string
          last_sync?: string | null
          records_processed?: number | null
          sync_duration_ms?: number | null
          sync_status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          division_code?: string | null
          entity_type?: string
          error_message?: string | null
          id?: string
          last_sync?: string | null
          records_processed?: number | null
          sync_duration_ms?: number | null
          sync_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      exact_online_tokens: {
        Row: {
          access_token: string
          company_name: string | null
          created_at: string | null
          division_code: string | null
          expires_at: string
          id: string
          refresh_token: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          access_token: string
          company_name?: string | null
          created_at?: string | null
          division_code?: string | null
          expires_at: string
          id?: string
          refresh_token: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_token?: string
          company_name?: string | null
          created_at?: string | null
          division_code?: string | null
          expires_at?: string
          id?: string
          refresh_token?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      lead_scoring_history: {
        Row: {
          engagement_score: number | null
          id: string
          lead_id: string
          match_score: number | null
          new_score: number
          previous_score: number | null
          scored_at: string | null
          scored_by_agent: string | null
          scoring_factors: Json | null
          scoring_reason: string | null
          sentiment_score: number | null
          urgency_score: number | null
        }
        Insert: {
          engagement_score?: number | null
          id?: string
          lead_id: string
          match_score?: number | null
          new_score: number
          previous_score?: number | null
          scored_at?: string | null
          scored_by_agent?: string | null
          scoring_factors?: Json | null
          scoring_reason?: string | null
          sentiment_score?: number | null
          urgency_score?: number | null
        }
        Update: {
          engagement_score?: number | null
          id?: string
          lead_id?: string
          match_score?: number | null
          new_score?: number
          previous_score?: number | null
          scored_at?: string | null
          scored_by_agent?: string | null
          scoring_factors?: Json | null
          scoring_reason?: string | null
          sentiment_score?: number | null
          urgency_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_scoring_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          created_at: string
          email: string | null
          email_thread_id: string | null
          first_name: string | null
          id: string
          intent_classification: string | null
          interested_vehicle: string | null
          last_ai_analysis: string | null
          last_email_date: string | null
          last_name: string | null
          lead_score: number | null
          lead_temperature: string | null
          lead_type: string | null
          owner_id: string | null
          parsing_confidence: number | null
          phone: string | null
          platform_metadata: Json | null
          priority: string
          response_required: boolean | null
          source_email: string | null
          status: string
          updated_at: string
          urgency_level: string | null
          vehicle_url: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          email?: string | null
          email_thread_id?: string | null
          first_name?: string | null
          id?: string
          intent_classification?: string | null
          interested_vehicle?: string | null
          last_ai_analysis?: string | null
          last_email_date?: string | null
          last_name?: string | null
          lead_score?: number | null
          lead_temperature?: string | null
          lead_type?: string | null
          owner_id?: string | null
          parsing_confidence?: number | null
          phone?: string | null
          platform_metadata?: Json | null
          priority: string
          response_required?: boolean | null
          source_email?: string | null
          status: string
          updated_at?: string
          urgency_level?: string | null
          vehicle_url?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          email?: string | null
          email_thread_id?: string | null
          first_name?: string | null
          id?: string
          intent_classification?: string | null
          interested_vehicle?: string | null
          last_ai_analysis?: string | null
          last_email_date?: string | null
          last_name?: string | null
          lead_score?: number | null
          lead_temperature?: string | null
          lead_type?: string | null
          owner_id?: string | null
          parsing_confidence?: number | null
          phone?: string | null
          platform_metadata?: Json | null
          priority?: string
          response_required?: boolean | null
          source_email?: string | null
          status?: string
          updated_at?: string
          urgency_level?: string | null
          vehicle_url?: string | null
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
          {
            foreignKeyName: "leads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      task_history: {
        Row: {
          change_reason: string | null
          changed_by: string
          created_at: string
          id: string
          new_assignee: string | null
          new_status: string
          old_assignee: string | null
          old_status: string | null
          task_id: string
        }
        Insert: {
          change_reason?: string | null
          changed_by: string
          created_at?: string
          id?: string
          new_assignee?: string | null
          new_status: string
          old_assignee?: string | null
          old_status?: string | null
          task_id: string
        }
        Update: {
          change_reason?: string | null
          changed_by?: string
          created_at?: string
          id?: string
          new_assignee?: string | null
          new_status?: string
          old_assignee?: string | null
          old_status?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_history_new_assignee_fkey"
            columns: ["new_assignee"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_history_old_assignee_fkey"
            columns: ["old_assignee"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_by: string
          assigned_to: string
          category: string
          completed_at: string | null
          created_at: string
          damage_parts: Json | null
          description: string
          due_date: string
          estimated_duration: number | null
          id: string
          location: string | null
          notes: string | null
          priority: string
          sort_order: number | null
          status: string
          title: string
          updated_at: string
          vehicle_brand: string | null
          vehicle_id: string | null
          vehicle_license_number: string | null
          vehicle_model: string | null
          vehicle_vin: string | null
        }
        Insert: {
          assigned_by: string
          assigned_to: string
          category?: string
          completed_at?: string | null
          created_at?: string
          damage_parts?: Json | null
          description: string
          due_date: string
          estimated_duration?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          priority?: string
          sort_order?: number | null
          status?: string
          title: string
          updated_at?: string
          vehicle_brand?: string | null
          vehicle_id?: string | null
          vehicle_license_number?: string | null
          vehicle_model?: string | null
          vehicle_vin?: string | null
        }
        Update: {
          assigned_by?: string
          assigned_to?: string
          category?: string
          completed_at?: string | null
          created_at?: string
          damage_parts?: Json | null
          description?: string
          due_date?: string
          estimated_duration?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          priority?: string
          sort_order?: number | null
          status?: string
          title?: string
          updated_at?: string
          vehicle_brand?: string | null
          vehicle_id?: string | null
          vehicle_license_number?: string | null
          vehicle_model?: string | null
          vehicle_vin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      taxatie_feedback: {
        Row: {
          actual_outcome: Json | null
          correction_type: string | null
          created_at: string
          created_by: string | null
          feedback_type: string
          id: string
          notes: string | null
          rating: number | null
          referenced_listing_id: string | null
          user_reasoning: string | null
          user_suggested_price: number | null
          valuation_id: string
        }
        Insert: {
          actual_outcome?: Json | null
          correction_type?: string | null
          created_at?: string
          created_by?: string | null
          feedback_type: string
          id?: string
          notes?: string | null
          rating?: number | null
          referenced_listing_id?: string | null
          user_reasoning?: string | null
          user_suggested_price?: number | null
          valuation_id: string
        }
        Update: {
          actual_outcome?: Json | null
          correction_type?: string | null
          created_at?: string
          created_by?: string | null
          feedback_type?: string
          id?: string
          notes?: string | null
          rating?: number | null
          referenced_listing_id?: string | null
          user_reasoning?: string | null
          user_suggested_price?: number | null
          valuation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "taxatie_feedback_valuation_id_fkey"
            columns: ["valuation_id"]
            isOneToOne: false
            referencedRelation: "taxatie_valuations"
            referencedColumns: ["id"]
          },
        ]
      }
      taxatie_valuations: {
        Row: {
          ai_advice: Json | null
          ai_model_version: string | null
          created_at: string
          created_by: string | null
          id: string
          internal_comparison: Json | null
          jpcars_data: Json | null
          license_plate: string | null
          portal_analysis: Json | null
          status: string
          vehicle_data: Json
        }
        Insert: {
          ai_advice?: Json | null
          ai_model_version?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          internal_comparison?: Json | null
          jpcars_data?: Json | null
          license_plate?: string | null
          portal_analysis?: Json | null
          status?: string
          vehicle_data?: Json
        }
        Update: {
          ai_advice?: Json | null
          ai_model_version?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          internal_comparison?: Json | null
          jpcars_data?: Json | null
          license_plate?: string | null
          portal_analysis?: Json | null
          status?: string
          vehicle_data?: Json
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vehicle_files: {
        Row: {
          category: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          metadata: Json | null
          updated_at: string
          uploaded_by: string | null
          vehicle_id: string
        }
        Insert: {
          category: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string
          uploaded_by?: string | null
          vehicle_id: string
        }
        Update: {
          category?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string
          uploaded_by?: string | null
          vehicle_id?: string
        }
        Relationships: []
      }
      vehicle_import_logs: {
        Row: {
          changed_by: string | null
          created_at: string | null
          external_reference: string | null
          id: string
          new_status: string
          old_status: string | null
          vehicle_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          external_reference?: string | null
          id?: string
          new_status: string
          old_status?: string | null
          vehicle_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          external_reference?: string | null
          id?: string
          new_status?: string
          old_status?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_import_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_price_audit_log: {
        Row: {
          change_reason: string | null
          change_source: string | null
          changed_at: string
          changed_by: string | null
          id: string
          new_purchase_price: number | null
          new_selling_price: number | null
          old_purchase_price: number | null
          old_selling_price: number | null
          vehicle_id: string
        }
        Insert: {
          change_reason?: string | null
          change_source?: string | null
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_purchase_price?: number | null
          new_selling_price?: number | null
          old_purchase_price?: number | null
          old_selling_price?: number | null
          vehicle_id: string
        }
        Update: {
          change_reason?: string | null
          change_source?: string | null
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_purchase_price?: number | null
          new_selling_price?: number | null
          old_purchase_price?: number | null
          old_selling_price?: number | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_price_audit_log_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_purchase_audit_log: {
        Row: {
          change_metadata: Json | null
          id: string
          purchase_price: number | null
          purchase_timestamp: string | null
          purchased_by: string | null
          vehicle_id: string
        }
        Insert: {
          change_metadata?: Json | null
          id?: string
          purchase_price?: number | null
          purchase_timestamp?: string | null
          purchased_by?: string | null
          vehicle_id: string
        }
        Update: {
          change_metadata?: Json | null
          id?: string
          purchase_price?: number | null
          purchase_timestamp?: string | null
          purchased_by?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_purchase_audit_log_purchased_by_fkey"
            columns: ["purchased_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_purchase_audit_log_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_status_audit_log: {
        Row: {
          change_metadata: Json | null
          change_timestamp: string
          changed_by: string | null
          id: string
          new_location: string | null
          new_status: string
          old_location: string | null
          old_status: string | null
          vehicle_id: string
        }
        Insert: {
          change_metadata?: Json | null
          change_timestamp?: string
          changed_by?: string | null
          id?: string
          new_location?: string | null
          new_status: string
          old_location?: string | null
          old_status?: string | null
          vehicle_id: string
        }
        Update: {
          change_metadata?: Json | null
          change_timestamp?: string
          changed_by?: string | null
          id?: string
          new_location?: string | null
          new_status?: string
          old_location?: string | null
          old_status?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_status_audit_log_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
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
          delivery_date: string | null
          details: Json
          email_reminder_settings: Json
          external_sheet_reference: string | null
          id: string
          import_status: string | null
          import_updated_at: string | null
          license_number: string | null
          location: string | null
          mileage: number | null
          model: string
          notes: string | null
          online_since_date: string | null
          purchase_date: string | null
          purchase_price: number | null
          purchased_by_name: string | null
          purchased_by_user_id: string | null
          selling_price: number | null
          sold_by_user_id: string | null
          sold_date: string | null
          status: string
          supplier_id: string | null
          transporter_id: string | null
          updated_at: string
          vin: string | null
          year: number | null
        }
        Insert: {
          brand: string
          color?: string | null
          created_at?: string
          customer_id?: string | null
          delivery_date?: string | null
          details?: Json
          email_reminder_settings?: Json
          external_sheet_reference?: string | null
          id?: string
          import_status?: string | null
          import_updated_at?: string | null
          license_number?: string | null
          location?: string | null
          mileage?: number | null
          model: string
          notes?: string | null
          online_since_date?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          purchased_by_name?: string | null
          purchased_by_user_id?: string | null
          selling_price?: number | null
          sold_by_user_id?: string | null
          sold_date?: string | null
          status?: string
          supplier_id?: string | null
          transporter_id?: string | null
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Update: {
          brand?: string
          color?: string | null
          created_at?: string
          customer_id?: string | null
          delivery_date?: string | null
          details?: Json
          email_reminder_settings?: Json
          external_sheet_reference?: string | null
          id?: string
          import_status?: string | null
          import_updated_at?: string | null
          license_number?: string | null
          location?: string | null
          mileage?: number | null
          model?: string
          notes?: string | null
          online_since_date?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          purchased_by_name?: string | null
          purchased_by_user_id?: string | null
          selling_price?: number | null
          sold_by_user_id?: string | null
          sold_date?: string | null
          status?: string
          supplier_id?: string | null
          transporter_id?: string | null
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
          {
            foreignKeyName: "vehicles_purchased_by_user_id_fkey"
            columns: ["purchased_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_transporter_id_fkey"
            columns: ["transporter_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_claims: {
        Row: {
          appointment_id: string | null
          claim_amount: number | null
          claim_status: string
          created_at: string
          description: string | null
          estimated_amount: number | null
          id: string
          loan_car_assigned: boolean | null
          loan_car_id: string | null
          manual_customer_name: string | null
          manual_customer_phone: string | null
          manual_license_number: string | null
          manual_vehicle_brand: string | null
          manual_vehicle_model: string | null
          resolution_date: string | null
          resolution_description: string | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          claim_amount?: number | null
          claim_status?: string
          created_at?: string
          description?: string | null
          estimated_amount?: number | null
          id?: string
          loan_car_assigned?: boolean | null
          loan_car_id?: string | null
          manual_customer_name?: string | null
          manual_customer_phone?: string | null
          manual_license_number?: string | null
          manual_vehicle_brand?: string | null
          manual_vehicle_model?: string | null
          resolution_date?: string | null
          resolution_description?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          claim_amount?: number | null
          claim_status?: string
          created_at?: string
          description?: string | null
          estimated_amount?: number | null
          id?: string
          loan_car_assigned?: boolean | null
          loan_car_id?: string | null
          manual_customer_name?: string | null
          manual_customer_phone?: string | null
          manual_license_number?: string | null
          manual_vehicle_brand?: string | null
          manual_vehicle_model?: string | null
          resolution_date?: string | null
          resolution_description?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warranty_claims_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_claims_loan_car_id_fkey"
            columns: ["loan_car_id"]
            isOneToOne: false
            referencedRelation: "loan_cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_claims_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_sales: {
        Row: {
          b2b_sales: number
          b2c_sales: number
          created_at: string
          id: string
          sale_date: string | null
          salesperson_id: string
          salesperson_name: string
          total_sales: number
          updated_at: string
          week_end_date: string
          week_start_date: string
        }
        Insert: {
          b2b_sales?: number
          b2c_sales?: number
          created_at?: string
          id?: string
          sale_date?: string | null
          salesperson_id: string
          salesperson_name: string
          total_sales?: number
          updated_at?: string
          week_end_date: string
          week_start_date: string
        }
        Update: {
          b2b_sales?: number
          b2c_sales?: number
          created_at?: string
          id?: string
          sale_date?: string | null
          salesperson_id?: string
          salesperson_name?: string
          total_sales?: number
          updated_at?: string
          week_end_date?: string
          week_start_date?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_assign_tasks: { Args: { user_id: string }; Returns: boolean }
      can_manage_task: {
        Args: { task_id: string; user_id: string }
        Returns: boolean
      }
      clean_expired_exact_online_cache: { Args: never; Returns: number }
      get_valid_exact_online_token: {
        Args: { user_uuid: string }
        Returns: {
          access_token: string
          division_code: string
          expires_at: string
          needs_refresh: boolean
          refresh_token: string
        }[]
      }
      get_vehicles_needing_reminders: {
        Args: never
        Returns: {
          days_since_last_email: number
          email_type: string
          recipient_email: string
          reminder_type: string
          vehicle_id: string
        }[]
      }
      get_week_start_date: { Args: { input_date?: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_owner: { Args: never; Returns: boolean }
      is_admin_user: { Args: { user_id: string }; Returns: boolean }
      update_weekly_sales: {
        Args: {
          p_sales_type: string
          p_salesperson_id: string
          p_salesperson_name: string
        }
        Returns: undefined
      }
      verify_webhook_sync: {
        Args: { agent_uuid: string }
        Returns: {
          active_webhooks_count: number
          agent_id: string
          agent_name: string
          agents_webhook_enabled: boolean
          agents_webhook_url: string
          is_synchronized: boolean
          webhooks_count: number
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "owner"
        | "manager"
        | "verkoper"
        | "operationeel"
        | "user"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "owner",
        "manager",
        "verkoper",
        "operationeel",
        "user",
      ],
    },
  },
} as const
