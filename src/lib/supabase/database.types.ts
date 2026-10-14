/**
 * Hand-written in the exact shape `supabase gen types typescript` produces so it can be
 * regenerated later without touching call sites:
 *
 *   supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
 *
 * This file is the contract that `supabase/migrations/0001_schema.sql` must satisfy.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '13.0.4'
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          phone: string
          role: Database['public']['Enums']['user_role']
          created_at: string
          /** 0003_admin_roles.sql; optional so pre-migration projects still type-check. */
          admin_role?: Database['public']['Enums']['admin_role'] | null
        }
        Insert: {
          id: string
          email: string
          full_name?: string
          phone?: string
          role?: Database['public']['Enums']['user_role']
          created_at?: string
          admin_role?: Database['public']['Enums']['admin_role'] | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          phone?: string
          role?: Database['public']['Enums']['user_role']
          created_at?: string
          admin_role?: Database['public']['Enums']['admin_role'] | null
        }
        Relationships: []
      }
      addresses: {
        Row: {
          id: string
          user_id: string
          label: string
          address_line: string
          barangay: string
          city: string
          province: string
          postal_code: string
          delivery_instructions: string
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          label: string
          address_line: string
          barangay: string
          city: string
          province: string
          postal_code: string
          delivery_instructions?: string
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          label?: string
          address_line?: string
          barangay?: string
          city?: string
          province?: string
          postal_code?: string
          delivery_instructions?: string
          is_default?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'addresses_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      categories: {
        Row: {
          id: string
          slug: string
          name: string
          description: string
          image_url: string | null
          sort_order: number
          created_at: string
          /** 0003_categories_intro.sql; optional so a database still on 0001 keeps working. */
          intro_title?: string | null
          intro_body?: string | null
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description?: string
          image_url?: string | null
          sort_order?: number
          created_at?: string
          intro_title?: string | null
          intro_body?: string | null
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string
          image_url?: string | null
          sort_order?: number
          created_at?: string
          intro_title?: string | null
          intro_body?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          slug: string
          name: string
          description: string
          details: string[]
          category_id: string
          base_price: number
          sale_price: number | null
          /** Generated column: coalesce(sale_price, base_price). Used for price filters/sorts. */
          display_price: number
          status: Database['public']['Enums']['product_status']
          is_featured: boolean
          sales_count: number
          created_at: string
          updated_at: string
          /** 0003_products_seo.sql; optional so pre-migration projects still type-check. */
          seo_title?: string
          seo_description?: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description?: string
          details?: string[]
          category_id: string
          base_price: number
          sale_price?: number | null
          display_price?: never
          status?: Database['public']['Enums']['product_status']
          is_featured?: boolean
          sales_count?: number
          created_at?: string
          updated_at?: string
          seo_title?: string
          seo_description?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string
          details?: string[]
          category_id?: string
          base_price?: number
          sale_price?: number | null
          display_price?: never
          status?: Database['public']['Enums']['product_status']
          is_featured?: boolean
          sales_count?: number
          created_at?: string
          updated_at?: string
          seo_title?: string
          seo_description?: string
        }
        Relationships: [
          {
            foreignKeyName: 'products_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
        ]
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          url: string
          alt: string
          is_primary: boolean
          sort_order: number
        }
        Insert: {
          id?: string
          product_id: string
          url: string
          alt?: string
          is_primary?: boolean
          sort_order?: number
        }
        Update: {
          id?: string
          product_id?: string
          url?: string
          alt?: string
          is_primary?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: 'product_images_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      product_variants: {
        Row: {
          id: string
          product_id: string
          sku: string
          size: string
          color_name: string
          color_hex: string
          stock: number
          reserved_stock: number
          low_stock_threshold: number
        }
        Insert: {
          id?: string
          product_id: string
          sku: string
          size: string
          color_name: string
          color_hex: string
          stock?: number
          reserved_stock?: number
          low_stock_threshold?: number
        }
        Update: {
          id?: string
          product_id?: string
          sku?: string
          size?: string
          color_name?: string
          color_hex?: string
          stock?: number
          reserved_stock?: number
          low_stock_threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: 'product_variants_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      orders: {
        Row: {
          id: string
          order_number: string
          user_id: string | null
          customer_name: string
          customer_email: string
          customer_phone: string
          address_line: string
          barangay: string
          city: string
          province: string
          postal_code: string
          delivery_instructions: string
          subtotal: number
          shipping_fee: number
          discount: number
          total: number
          payment_method: Database['public']['Enums']['payment_method']
          payment_status: Database['public']['Enums']['payment_status']
          status: Database['public']['Enums']['order_status']
          courier: string | null
          tracking_number: string | null
          customer_note: string
          admin_notes: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number: string
          user_id?: string | null
          customer_name: string
          customer_email: string
          customer_phone: string
          address_line: string
          barangay: string
          city: string
          province: string
          postal_code: string
          delivery_instructions?: string
          subtotal: number
          shipping_fee: number
          discount?: number
          total: number
          payment_method: Database['public']['Enums']['payment_method']
          payment_status: Database['public']['Enums']['payment_status']
          status: Database['public']['Enums']['order_status']
          courier?: string | null
          tracking_number?: string | null
          customer_note?: string
          admin_notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_number?: string
          user_id?: string | null
          customer_name?: string
          customer_email?: string
          customer_phone?: string
          address_line?: string
          barangay?: string
          city?: string
          province?: string
          postal_code?: string
          delivery_instructions?: string
          subtotal?: number
          shipping_fee?: number
          discount?: number
          total?: number
          payment_method?: Database['public']['Enums']['payment_method']
          payment_status?: Database['public']['Enums']['payment_status']
          status?: Database['public']['Enums']['order_status']
          courier?: string | null
          tracking_number?: string | null
          customer_note?: string
          admin_notes?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'orders_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          variant_id: string
          product_name: string
          product_slug: string
          image_url: string | null
          sku: string
          size: string
          color_name: string
          unit_price: number
          quantity: number
          line_total: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          variant_id: string
          product_name: string
          product_slug: string
          image_url?: string | null
          sku: string
          size: string
          color_name: string
          unit_price: number
          quantity: number
          line_total: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          variant_id?: string
          product_name?: string
          product_slug?: string
          image_url?: string | null
          sku?: string
          size?: string
          color_name?: string
          unit_price?: number
          quantity?: number
          line_total?: number
        }
        Relationships: [
          {
            foreignKeyName: 'order_items_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_items_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_items_variant_id_fkey'
            columns: ['variant_id']
            isOneToOne: false
            referencedRelation: 'product_variants'
            referencedColumns: ['id']
          },
        ]
      }
      order_status_events: {
        Row: {
          id: string
          order_id: string
          status: Database['public']['Enums']['order_status']
          note: string | null
          actor: string
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          status: Database['public']['Enums']['order_status']
          note?: string | null
          actor: string
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          status?: Database['public']['Enums']['order_status']
          note?: string | null
          actor?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'order_status_events_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
        ]
      }
      inventory_movements: {
        Row: {
          id: string
          variant_id: string
          delta: number
          stock_after: number
          reason: Database['public']['Enums']['movement_reason']
          note: string
          actor: string
          reference_order_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          variant_id: string
          delta: number
          stock_after: number
          reason: Database['public']['Enums']['movement_reason']
          note?: string
          actor: string
          reference_order_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          variant_id?: string
          delta?: number
          stock_after?: number
          reason?: Database['public']['Enums']['movement_reason']
          note?: string
          actor?: string
          reference_order_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'inventory_movements_variant_id_fkey'
            columns: ['variant_id']
            isOneToOne: false
            referencedRelation: 'product_variants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'inventory_movements_reference_order_id_fkey'
            columns: ['reference_order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          recipient_role: Database['public']['Enums']['user_role']
          type: Database['public']['Enums']['notification_type']
          title: string
          message: string
          href: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          recipient_role?: Database['public']['Enums']['user_role']
          type: Database['public']['Enums']['notification_type']
          title: string
          message: string
          href?: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          recipient_role?: Database['public']['Enums']['user_role']
          type?: Database['public']['Enums']['notification_type']
          title?: string
          message?: string
          href?: string
          is_read?: boolean
          created_at?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          id: number
          store_name: string
          logo_url: string | null
          contact_email: string
          contact_phone: string
          address: string
          flat_shipping_fee: number
          free_shipping_threshold: number
          cod_enabled: boolean
          online_payment_enabled: boolean
          online_payment_configured: boolean
          email_notifications_configured: boolean
          default_low_stock_threshold: number
          notify_new_orders: boolean
          notify_low_stock: boolean
          notify_payment_events: boolean
          updated_at: string
        }
        Insert: {
          id?: number
          store_name?: string
          logo_url?: string | null
          contact_email?: string
          contact_phone?: string
          address?: string
          flat_shipping_fee?: number
          free_shipping_threshold?: number
          cod_enabled?: boolean
          online_payment_enabled?: boolean
          online_payment_configured?: boolean
          email_notifications_configured?: boolean
          default_low_stock_threshold?: number
          notify_new_orders?: boolean
          notify_low_stock?: boolean
          notify_payment_events?: boolean
          updated_at?: string
        }
        Update: {
          id?: number
          store_name?: string
          logo_url?: string | null
          contact_email?: string
          contact_phone?: string
          address?: string
          flat_shipping_fee?: number
          free_shipping_threshold?: number
          cod_enabled?: boolean
          online_payment_enabled?: boolean
          online_payment_configured?: boolean
          email_notifications_configured?: boolean
          default_low_stock_threshold?: number
          notify_new_orders?: boolean
          notify_low_stock?: boolean
          notify_payment_events?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      payment_sessions: {
        Row: {
          id: string
          order_id: string
          provider: string
          provider_session_id: string | null
          status: string
          redirect_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          provider: string
          provider_session_id?: string | null
          status?: string
          redirect_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          provider?: string
          provider_session_id?: string | null
          status?: string
          redirect_url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'payment_sessions_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
        ]
      }
      /** CMS (0002_cms.sql). Admin-only select; writes only through cms_* RPCs. */
      cms_documents: {
        Row: {
          id: string
          key: string
          kind: Database['public']['Enums']['cms_document_kind']
          title: string
          draft: Json
          published: Json | null
          draft_version: number
          published_version: number
          updated_by: string | null
          updated_by_name: string
          published_at: string | null
          created_at: string
          updated_at: string
          /** 0003_cms_schedule.sql; optional so a database still on 0002 keeps working. */
          scheduled_at?: string | null
        }
        Insert: {
          id?: string
          key: string
          kind: Database['public']['Enums']['cms_document_kind']
          title: string
          draft: Json
          published?: Json | null
          draft_version?: number
          published_version?: number
          updated_by?: string | null
          updated_by_name?: string
          published_at?: string | null
          created_at?: string
          updated_at?: string
          scheduled_at?: string | null
        }
        Update: {
          id?: string
          key?: string
          kind?: Database['public']['Enums']['cms_document_kind']
          title?: string
          draft?: Json
          published?: Json | null
          draft_version?: number
          published_version?: number
          updated_by?: string | null
          updated_by_name?: string
          published_at?: string | null
          created_at?: string
          updated_at?: string
          scheduled_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'cms_documents_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      cms_revisions: {
        Row: {
          id: string
          document_id: string
          version: number
          content: Json
          note: string
          created_by: string | null
          created_by_name: string
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          version: number
          content: Json
          note?: string
          created_by?: string | null
          created_by_name?: string
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          version?: number
          content?: Json
          note?: string
          created_by?: string | null
          created_by_name?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cms_revisions_document_id_fkey'
            columns: ['document_id']
            isOneToOne: false
            referencedRelation: 'cms_documents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cms_revisions_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      /** `id` is text so seeded assets keep the ids referenced by the default documents. */
      cms_media: {
        Row: {
          id: string
          bucket: string
          path: string
          url: string
          alt: string
          mime: string
          size_bytes: number
          width: number | null
          height: number | null
          uploaded_by: string | null
          uploaded_by_name: string
          created_at: string
        }
        Insert: {
          id?: string
          bucket?: string
          path: string
          url: string
          alt?: string
          mime: string
          size_bytes: number
          width?: number | null
          height?: number | null
          uploaded_by?: string | null
          uploaded_by_name?: string
          created_at?: string
        }
        Update: {
          id?: string
          bucket?: string
          path?: string
          url?: string
          alt?: string
          mime?: string
          size_bytes?: number
          width?: number | null
          height?: number | null
          uploaded_by?: string | null
          uploaded_by_name?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cms_media_uploaded_by_fkey'
            columns: ['uploaded_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      cms_audit_log: {
        Row: {
          id: string
          actor: string | null
          actor_name: string
          action: Database['public']['Enums']['cms_audit_action']
          document_key: string | null
          media_id: string | null
          details: string
          created_at: string
        }
        Insert: {
          id?: string
          actor?: string | null
          actor_name?: string
          action: Database['public']['Enums']['cms_audit_action']
          document_key?: string | null
          media_id?: string | null
          details?: string
          created_at?: string
        }
        Update: {
          id?: string
          actor?: string | null
          actor_name?: string
          action?: Database['public']['Enums']['cms_audit_action']
          document_key?: string | null
          media_id?: string | null
          details?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cms_audit_log_actor_fkey'
            columns: ['actor']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      /** Orders joined with their item count. RLS of `orders` applies (security_invoker). */
      order_summaries: {
        Row: {
          id: string
          order_number: string
          user_id: string | null
          customer_name: string
          customer_email: string
          item_count: number
          total: number
          payment_method: Database['public']['Enums']['payment_method']
          payment_status: Database['public']['Enums']['payment_status']
          status: Database['public']['Enums']['order_status']
          created_at: string
        }
        Relationships: []
      }
      /** Variants joined with product info and derived availability. */
      inventory_rows: {
        Row: {
          variant_id: string
          product_id: string
          product_name: string
          product_slug: string
          product_status: Database['public']['Enums']['product_status']
          image_url: string | null
          sku: string
          size: string
          color_name: string
          stock: number
          reserved_stock: number
          available_stock: number
          low_stock_threshold: number
          stock_status: string
        }
        Relationships: []
      }
      /** Movements joined with SKU, product name and referenced order number. */
      inventory_movement_rows: {
        Row: {
          id: string
          variant_id: string
          sku: string
          product_name: string
          delta: number
          stock_after: number
          reason: Database['public']['Enums']['movement_reason']
          note: string
          actor: string
          reference_order_id: string | null
          reference_order_number: string | null
          created_at: string
        }
        Relationships: []
      }
      /**
       * Published CMS content only (rows where `published` is not null). Definer rights:
       * readable by anon + authenticated while `cms_documents` stays admin-only.
       */
      cms_published_documents: {
        Row: {
          key: string | null
          kind: Database['public']['Enums']['cms_document_kind'] | null
          published: Json | null
          published_version: number | null
          published_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      /** 0003_admin_roles.sql */
      is_owner: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      place_order: {
        Args: { payload: Json }
        Returns: Json
      }
      update_order_status: {
        Args: {
          p_order_id: string
          p_status: Database['public']['Enums']['order_status']
          p_note: string
        }
        Returns: undefined
      }
      adjust_stock: {
        Args: {
          p_variant_id: string
          p_delta: number
          p_reason: Database['public']['Enums']['movement_reason']
          p_note: string
        }
        Returns: undefined
      }
      mark_cod_payment_collected: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      /** 0004_order_emails.sql */
      record_order_update_notification: {
        Args: { p_order_id: string; p_emailed: boolean }
        Returns: undefined
      }
      cancel_my_order: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      dashboard_summary: {
        Args: { p_days: number }
        Returns: Json
      }
      customer_summaries: {
        Args: { p_search: string }
        Returns: Json
      }
      save_product: {
        Args: { p_product_id: string | null; p_payload: Json }
        Returns: string
      }
      cms_document_json: {
        Args: { p_id: string }
        Returns: Json
      }
      cms_save_draft: {
        Args: { p_key: string; p_content: Json; p_expected_version: number }
        Returns: Json
      }
      cms_publish: {
        Args: { p_key: string; p_note: string }
        Returns: Json
      }
      cms_restore_revision: {
        Args: { p_key: string; p_version: number }
        Returns: Json
      }
      cms_create_page: {
        Args: { p_slug: string; p_title: string; p_content: Json }
        Returns: Json
      }
      cms_delete_page: {
        Args: { p_slug: string }
        Returns: undefined
      }
      cms_register_media: {
        Args: {
          p_path: string
          p_url: string
          p_alt: string
          p_mime: string
          p_size: number
          p_width: number | null
          p_height: number | null
        }
        Returns: Json
      }
      cms_update_media_alt: {
        Args: { p_id: string; p_alt: string }
        Returns: Json
      }
      cms_media_usages: {
        Args: { p_id: string }
        Returns: string[]
      }
      cms_delete_media: {
        Args: { p_id: string }
        Returns: undefined
      }
      /** Scheduled publishing (0003_cms_schedule.sql). */
      cms_publish_internal: {
        Args: { p_key: string; p_note: string; p_actor_name: string }
        Returns: Json
      }
      cms_schedule_publish: {
        Args: { p_key: string; p_at: string }
        Returns: Json
      }
      cms_cancel_schedule: {
        Args: { p_key: string }
        Returns: Json
      }
      cms_run_scheduled: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      /** Agent A: guest order tracking (0003_track_order.sql). */
      track_order: {
        Args: { p_order_number: string; p_email: string }
        Returns: Json
      }
    }
    Enums: {
      product_status: 'draft' | 'published' | 'archived'
      order_status:
        | 'pending_payment'
        | 'pending_confirmation'
        | 'confirmed'
        | 'processing'
        | 'shipped'
        | 'delivered'
        | 'cancelled'
      payment_status:
        | 'unpaid'
        | 'pending'
        | 'paid'
        | 'failed'
        | 'refund_pending'
        | 'refunded'
        | 'partially_refunded'
      payment_method: 'cod' | 'online'
      user_role: 'buyer' | 'admin'
      /** 0003_admin_roles.sql */
      admin_role: 'owner' | 'staff'
      movement_reason:
        | 'restock'
        | 'correction'
        | 'damaged'
        | 'returned'
        | 'order_reserved'
        | 'order_released'
        | 'order_fulfilled'
      notification_type:
        | 'new_order'
        | 'payment_confirmed'
        | 'low_stock'
        | 'order_issue'
        /** 0004_order_emails.sql */
        | 'order_update'
      cms_document_kind: 'page' | 'navigation' | 'theme' | 'announcement'
      cms_audit_action:
        | 'save_draft'
        | 'publish'
        | 'restore'
        | 'media_upload'
        | 'media_delete'
        | 'create_page'
        | 'delete_page'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update']
export type Views<T extends keyof PublicSchema['Views']> = PublicSchema['Views'][T]['Row']
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T]
