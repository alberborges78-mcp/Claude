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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          role?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          role?: string
        }
        Relationships: []
      }
      campaign_prices: {
        Row: {
          campaign_id: string
          category: string
          created_at: string
          id: string
          order_index: number
          price_cents: number
          size_label: string
        }
        Insert: {
          campaign_id: string
          category: string
          created_at?: string
          id?: string
          order_index?: number
          price_cents: number
          size_label: string
        }
        Update: {
          campaign_id?: string
          category?: string
          created_at?: string
          id?: string
          order_index?: number
          price_cents?: number
          size_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_prices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          delivery_estimate: string | null
          ends_at: string
          id: string
          is_active: boolean
          name: string
          school_id: string
          starts_at: string
        }
        Insert: {
          created_at?: string
          delivery_estimate?: string | null
          ends_at: string
          id?: string
          is_active?: boolean
          name: string
          school_id: string
          starts_at?: string
        }
        Update: {
          created_at?: string
          delivery_estimate?: string | null
          ends_at?: string
          id?: string
          is_active?: boolean
          name?: string
          school_id?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          order_index: number
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          order_index?: number
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "classes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          created_at: string
          delivered_at: string
          delivered_by_admin: string
          id: string
          notes: string | null
          order_id: string
          recipient_name: string | null
        }
        Insert: {
          created_at?: string
          delivered_at?: string
          delivered_by_admin: string
          id?: string
          notes?: string | null
          order_id: string
          recipient_name?: string | null
        }
        Update: {
          created_at?: string
          delivered_at?: string
          delivered_by_admin?: string
          id?: string
          notes?: string | null
          order_id?: string
          recipient_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      item_personalizations: {
        Row: {
          created_at: string
          custom_name: string | null
          custom_number: string | null
          id: string
          order_item_id: string
          piece_index: number
          student_name: string
        }
        Insert: {
          created_at?: string
          custom_name?: string | null
          custom_number?: string | null
          id?: string
          order_item_id: string
          piece_index: number
          student_name: string
        }
        Update: {
          created_at?: string
          custom_name?: string | null
          custom_number?: string | null
          id?: string
          order_item_id?: string
          piece_index?: number
          student_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_personalizations_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          class_id: string
          class_name: string
          created_at: string
          id: string
          order_id: string
          quantity: number
          size_label: string
          student_name: string
          subtotal_cents: number
          unit_price_cents: number
        }
        Insert: {
          class_id: string
          class_name: string
          created_at?: string
          id?: string
          order_id: string
          quantity: number
          size_label: string
          student_name: string
          subtotal_cents: number
          unit_price_cents: number
        }
        Update: {
          class_id?: string
          class_name?: string
          created_at?: string
          id?: string
          order_id?: string
          quantity?: number
          size_label?: string
          student_name?: string
          subtotal_cents?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_events: {
        Row: {
          actor_id: string | null
          actor_type: string
          created_at: string
          event_type: string
          from_status: string | null
          id: string
          notes: string | null
          order_id: string
          to_status: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_type: string
          created_at?: string
          event_type: string
          from_status?: string | null
          id?: string
          notes?: string | null
          order_id: string
          to_status?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          campaign_id: string
          created_at: string
          customer_name: string
          customer_whatsapp: string
          delivery_status: string
          id: string
          order_number: string
          order_status: string
          payment_method: string
          payment_status: string
          pix_code: string | null
          pix_qr_base64: string | null
          pix_txid: string | null
          production_status: string
          qr_token: string
          total_amount_cents: number
          total_items: number
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          customer_name: string
          customer_whatsapp: string
          delivery_status?: string
          id?: string
          order_number: string
          order_status?: string
          payment_method: string
          payment_status?: string
          pix_code?: string | null
          pix_qr_base64?: string | null
          pix_txid?: string | null
          production_status?: string
          qr_token: string
          total_amount_cents: number
          total_items: number
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          customer_name?: string
          customer_whatsapp?: string
          delivery_status?: string
          id?: string
          order_number?: string
          order_status?: string
          payment_method?: string
          payment_status?: string
          pix_code?: string | null
          pix_qr_base64?: string | null
          pix_txid?: string | null
          production_status?: string
          qr_token?: string
          total_amount_cents?: number
          total_items?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          confirmed_at: string | null
          confirmed_by_admin: string | null
          created_at: string
          id: string
          method: string
          order_id: string
          status: string
          transaction_reference: string | null
        }
        Insert: {
          amount_cents: number
          confirmed_at?: string | null
          confirmed_by_admin?: string | null
          created_at?: string
          id?: string
          method: string
          order_id: string
          status: string
          transaction_reference?: string | null
        }
        Update: {
          amount_cents?: number
          confirmed_at?: string | null
          confirmed_by_admin?: string | null
          created_at?: string
          id?: string
          method?: string
          order_id?: string
          status?: string
          transaction_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      public_order_lookup_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          order_id: string
          token_hash: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          order_id: string
          token_hash: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          order_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_order_lookup_tokens_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          store_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          store_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schools_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string
          created_at: string
          id: string
          maps_url: string
          name: string
          whatsapp: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          maps_url: string
          name: string
          whatsapp: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          maps_url?: string
          name?: string
          whatsapp?: string
        }
        Relationships: []
      }
      whatsapp_outbox: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          order_id: string
          payload_text: string
          processed_at: string | null
          recipient_whatsapp: string
          retry_count: number
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          order_id: string
          payload_text: string
          processed_at?: string | null
          recipient_whatsapp: string
          retry_count?: number
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          order_id?: string
          payload_text?: string
          processed_at?: string | null
          recipient_whatsapp?: string
          retry_count?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_outbox_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      rpc_confirm_delivery: {
        Args: {
          p_admin_user: string
          p_notes?: string
          p_order_id: string
          p_recipient_name?: string
        }
        Returns: Json
      }
      rpc_confirm_payment: {
        Args: {
          p_admin_user: string
          p_method?: string
          p_order_id: string
          p_tx_reference?: string
        }
        Returns: Json
      }
      rpc_create_order: {
        Args: {
          p_campaign_id: string
          p_customer_name: string
          p_customer_whatsapp: string
          p_items: Json
          p_payment_method: string
        }
        Returns: Json
      }
      rpc_get_public_order_by_qr: {
        Args: { p_qr_token: string }
        Returns: Json
      }
      rpc_get_public_order_details: {
        Args: { p_lookup_token: string }
        Returns: Json
      }
      rpc_lookup_order_by_credentials: {
        Args: {
          p_customer_name: string
          p_customer_whatsapp: string
          p_order_number: string
          p_student_name: string
        }
        Returns: Json
      }
      rpc_search_public_orders: {
        Args: {
          p_customer_name?: string
          p_customer_whatsapp?: string
          p_order_number?: string
          p_page?: number
          p_page_size?: number
        }
        Returns: Json
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
