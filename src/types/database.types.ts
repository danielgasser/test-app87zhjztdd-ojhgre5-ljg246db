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
      locations: {
        Row: {
          active: boolean | null
          address: string
          avg_comfort_score: number | null
          avg_overall_score: number | null
          avg_safety_score: number | null
          city: string
          coordinates: unknown
          country: string
          created_at: string | null
          created_by: string | null
          description: string | null
          google_place_id: string | null
          id: string
          name: string
          place_type: Database["public"]["Enums"]["place_type_enum"]
          place_type_backup: string | null
          postal_code: string | null
          review_count: number | null
          state_province: string
          tags: string[] | null
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          active?: boolean | null
          address: string
          avg_comfort_score?: number | null
          avg_overall_score?: number | null
          avg_safety_score?: number | null
          city: string
          coordinates: unknown
          country?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          google_place_id?: string | null
          id?: string
          name: string
          place_type: Database["public"]["Enums"]["place_type_enum"]
          place_type_backup?: string | null
          postal_code?: string | null
          review_count?: number | null
          state_province: string
          tags?: string[] | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          active?: boolean | null
          address?: string
          avg_comfort_score?: number | null
          avg_overall_score?: number | null
          avg_safety_score?: number | null
          city?: string
          coordinates?: unknown
          country?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          google_place_id?: string | null
          id?: string
          name?: string
          place_type?: Database["public"]["Enums"]["place_type_enum"]
          place_type_backup?: string | null
          postal_code?: string | null
          review_count?: number | null
          state_province?: string
          tags?: string[] | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      ml_training_data: {
        Row: {
          created_at: string | null
          demographic_features: Json | null
          id: string
          location_id: string | null
          safety_metrics: Json | null
          temporal_features: Json | null
        }
        Insert: {
          created_at?: string | null
          demographic_features?: Json | null
          id?: string
          location_id?: string | null
          safety_metrics?: Json | null
          temporal_features?: Json | null
        }
        Update: {
          created_at?: string | null
          demographic_features?: Json | null
          id?: string
          location_id?: string | null
          safety_metrics?: Json | null
          temporal_features?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_training_data_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          notification_type: string
          review_ids: string[]
          route_id: string | null
          sent_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          notification_type: string
          review_ids?: string[]
          route_id?: string | null
          sent_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          notification_type?: string
          review_ids?: string[]
          route_id?: string | null
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          demographics: Json | null
          id: string
          onboarding_complete: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          demographics?: Json | null
          id?: string
          onboarding_complete?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          demographics?: Json | null
          id?: string
          onboarding_complete?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      review_votes: {
        Row: {
          created_at: string | null
          id: string
          review_id: string
          user_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          review_id: string
          user_id: string
          vote_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          review_id?: string
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_votes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          accessibility_rating: number | null
          comfort_rating: number
          content: string
          created_at: string | null
          flag_count: number | null
          helpful_count: number | null
          id: string
          location_id: string
          overall_rating: number
          photo_urls: string[] | null
          safety_rating: number
          service_rating: number | null
          status: string | null
          title: string
          unhelpful_count: number | null
          updated_at: string | null
          user_id: string
          visit_type: string | null
          visited_at: string | null
        }
        Insert: {
          accessibility_rating?: number | null
          comfort_rating: number
          content: string
          created_at?: string | null
          flag_count?: number | null
          helpful_count?: number | null
          id?: string
          location_id: string
          overall_rating: number
          photo_urls?: string[] | null
          safety_rating: number
          service_rating?: number | null
          status?: string | null
          title: string
          unhelpful_count?: number | null
          updated_at?: string | null
          user_id: string
          visit_type?: string | null
          visited_at?: string | null
        }
        Update: {
          accessibility_rating?: number | null
          comfort_rating?: number
          content?: string
          created_at?: string | null
          flag_count?: number | null
          helpful_count?: number | null
          id?: string
          location_id?: string
          overall_rating?: number
          photo_urls?: string[] | null
          safety_rating?: number
          service_rating?: number | null
          status?: string | null
          title?: string
          unhelpful_count?: number | null
          updated_at?: string | null
          user_id?: string
          visit_type?: string | null
          visited_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      route_segments: {
        Row: {
          demographic_type: string | null
          demographic_value: string | null
          end_point: unknown
          id: string
          last_calculated: string | null
          path: unknown
          safety_score: number | null
          start_point: unknown
        }
        Insert: {
          demographic_type?: string | null
          demographic_value?: string | null
          end_point?: unknown
          id?: string
          last_calculated?: string | null
          path?: unknown
          safety_score?: number | null
          start_point?: unknown
        }
        Update: {
          demographic_type?: string | null
          demographic_value?: string | null
          end_point?: unknown
          id?: string
          last_calculated?: string | null
          path?: unknown
          safety_score?: number | null
          start_point?: unknown
        }
        Relationships: []
      }
      routes: {
        Row: {
          created_at: string
          destination_name: string
          distance_km: number
          duration_minutes: number
          id: string
          navigation_ended_at: string | null
          navigation_started_at: string | null
          origin_name: string
          route_coordinates: Json
          safety_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          destination_name: string
          distance_km: number
          duration_minutes: number
          id?: string
          navigation_ended_at?: string | null
          navigation_started_at?: string | null
          origin_name: string
          route_coordinates: Json
          safety_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          destination_name?: string
          distance_km?: number
          duration_minutes?: number
          id?: string
          navigation_ended_at?: string | null
          navigation_started_at?: string | null
          origin_name?: string
          route_coordinates?: Json
          safety_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      safety_scores: {
        Row: {
          avg_comfort_score: number | null
          avg_overall_score: number | null
          avg_safety_score: number | null
          calculated_at: string | null
          demographic_type: string
          demographic_value: string | null
          id: string
          last_review_date: string | null
          location_id: string
          review_count: number | null
        }
        Insert: {
          avg_comfort_score?: number | null
          avg_overall_score?: number | null
          avg_safety_score?: number | null
          calculated_at?: string | null
          demographic_type: string
          demographic_value?: string | null
          id?: string
          last_review_date?: string | null
          location_id: string
          review_count?: number | null
        }
        Update: {
          avg_comfort_score?: number | null
          avg_overall_score?: number | null
          avg_safety_score?: number | null
          calculated_at?: string | null
          demographic_type?: string
          demographic_value?: string | null
          id?: string
          last_review_date?: string | null
          location_id?: string
          review_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_scores_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          age_range: string | null
          avatar_url: string | null
          created_at: string | null
          disability_status: string[] | null
          full_name: string | null
          gender: string | null
          helpful_votes: number | null
          id: string
          lgbtq_status: boolean | null
          notification_preferences: Json | null
          privacy_level: string | null
          push_token: string | null
          race_ethnicity: string[] | null
          religion: string | null
          role: string | null
          show_demographics: boolean | null
          total_reviews: number | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          age_range?: string | null
          avatar_url?: string | null
          created_at?: string | null
          disability_status?: string[] | null
          full_name?: string | null
          gender?: string | null
          helpful_votes?: number | null
          id: string
          lgbtq_status?: boolean | null
          notification_preferences?: Json | null
          privacy_level?: string | null
          push_token?: string | null
          race_ethnicity?: string[] | null
          religion?: string | null
          role?: string | null
          show_demographics?: boolean | null
          total_reviews?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          age_range?: string | null
          avatar_url?: string | null
          created_at?: string | null
          disability_status?: string[] | null
          full_name?: string | null
          gender?: string | null
          helpful_votes?: number | null
          id?: string
          lgbtq_status?: boolean | null
          notification_preferences?: Json | null
          privacy_level?: string | null
          push_token?: string | null
          race_ethnicity?: string[] | null
          religion?: string | null
          role?: string | null
          show_demographics?: boolean | null
          total_reviews?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      calculate_location_safety_scores: {
        Args: { p_location_id: string }
        Returns: undefined
      }
      cleanup_old_notification_logs: { Args: never; Returns: undefined }
      decrement_review_count: {
        Args: { count_field: string; review_id: string }
        Returns: undefined
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
      dropgeometrytable:
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      extract_ml_training_data: {
        Args: never
        Returns: {
          comfort_rating: number
          location_id: string
          location_latitude: number
          location_longitude: number
          location_type: string
          overall_rating: number
          review_created_at: string
          safety_rating: number
          user_age_range: string
          user_gender: string
          user_id: string
          user_lgbtq_status: boolean
          user_race_ethnicity: string[]
          user_religion: string
        }[]
      }
      find_similar_users: {
        Args: { similarity_threshold?: number; target_user_id: string }
        Returns: {
          shared_demographics: string[]
          similar_user_id: string
          similarity_score: number
        }[]
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_basic_ml_recommendations: {
        Args: { max_recommendations?: number; target_user_id: string }
        Returns: {
          confidence_score: number
          location_id: string
          location_name: string
          predicted_safety_score: number
          recommendation_reason: string
          similar_user_count: number
        }[]
      }
      get_discrimination_patterns: {
        Args: { p_location_id?: string; p_threshold?: number }
        Returns: {
          affected_demographics: string[]
          evidence: Json
          location_id: string
          location_name: string
          pattern_type: string
          recommendation: string
          severity: string
        }[]
      }
      get_heatmap_data: {
        Args: {
          center_lat: number
          center_lng: number
          radius_meters?: number
          user_age_range?: string
          user_disability_status?: string[]
          user_gender?: string
          user_lgbtq_status?: boolean
          user_race_ethnicity?: string[]
          user_religion?: string
        }
        Returns: {
          heat_weight: number
          latitude: number
          longitude: number
          review_count: number
          safety_score: number
        }[]
      }
      get_location_with_coords: {
        Args: { location_id: string }
        Returns: {
          active: boolean
          address: string
          avg_comfort_score: number
          avg_overall_score: number
          avg_safety_score: number
          city: string
          country: string
          created_at: string
          id: string
          latitude: number
          longitude: number
          name: string
          place_type: string
          review_count: number
          state_province: string
          updated_at: string
          verified: boolean
        }[]
      }
      get_ml_recommendations_for_user: {
        Args: {
          max_distance_meters?: number
          target_user_id: string
          user_lat?: number
          user_lng?: number
        }
        Returns: {
          confidence_score: number
          distance_meters: number
          location_id: string
          location_name: string
          predicted_safety_score: number
          recommendation_reason: string
          similar_user_count: number
        }[]
      }
      get_nearby_locations: {
        Args: { lat: number; lng: number; radius_meters?: number }
        Returns: {
          address: string
          avg_safety_score: number
          distance_meters: number
          id: string
          latitude: number
          longitude: number
          name: string
          place_type: string
        }[]
      }
      get_nearby_locations_for_user: {
        Args: {
          lat: number
          lng: number
          radius_meters?: number
          user_gender?: string
          user_lgbtq_status?: boolean
          user_race_ethnicity?: string[]
        }
        Returns: {
          address: string
          avg_safety_score: number
          demographic_safety_score: number
          distance_meters: number
          id: string
          latitude: number
          longitude: number
          name: string
          place_type: string
        }[]
      }
      get_nearby_reviews: {
        Args: {
          lat: number
          lng: number
          radius_meters?: number
          review_limit?: number
        }
        Returns: {
          content: string
          created_at: string
          distance_meters: number
          id: string
          location_address: string
          location_id: string
          location_latitude: number
          location_longitude: number
          location_name: string
          overall_rating: number
          safety_rating: number
          title: string
          user_disability_status: string[]
          user_full_name: string
          user_gender: string
          user_id: string
          user_lgbtq_status: boolean
          user_race_ethnicity: string[]
          user_show_demographics: boolean
        }[]
      }
      get_safety_insights: {
        Args: {
          max_results?: number
          radius_meters?: number
          user_lat?: number
          user_lng?: number
        }
        Returns: {
          change_value: number
          created_at: string
          insight_type: string
          location_address: string
          location_id: string
          location_name: string
          message: string
          severity: string
        }[]
      }
      get_trending_locations: {
        Args: { days_window?: number; max_results?: number }
        Returns: {
          location_address: string
          location_id: string
          location_name: string
          review_count_current: number
          review_count_previous: number
          trend_direction: string
          trend_percentage: number
        }[]
      }
      get_user_public_profile: {
        Args: { profile_user_id: string }
        Returns: {
          age_range: string
          avatar_url: string
          created_at: string
          disability_status: string[]
          full_name: string
          gender: string
          is_public: boolean
          lgbtq_status: boolean
          privacy_level: string
          race_ethnicity: string[]
          religion: string
          show_demographics: boolean
          total_reviews: number
          user_id: string
        }[]
      }
      get_user_public_reviews: {
        Args: { profile_user_id: string; review_limit?: number }
        Returns: {
          content: string
          created_at: string
          id: string
          location_address: string
          location_id: string
          location_name: string
          overall_rating: number
          safety_rating: number
          title: string
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      increment_review_count: {
        Args: { count_field: string; review_id: string }
        Returns: undefined
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      populate_geometry_columns:
        | { Args: { use_typmod?: boolean }; Returns: string }
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      search_locations_with_coords: {
        Args: { result_limit?: number; search_query: string }
        Returns: {
          address: string
          city: string
          id: string
          latitude: number
          longitude: number
          name: string
          place_type: string
          state_province: string
        }[]
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_askml:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geom: unknown }; Returns: number }
        | { Args: { geog: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      test_demographic_patterns: {
        Args: never
        Returns: {
          avg_safety_rating: number
          pattern_type: string
          pattern_value: string
          sample_locations: string[]
          user_count: number
        }[]
      }
      test_extract_ml_data: {
        Args: never
        Returns: {
          location_id: string
          location_name: string
          location_type: string
          overall_rating: number
          safety_rating: number
          user_gender: string
          user_id: string
          user_lgbtq_status: boolean
          user_race_ethnicity: string[]
        }[]
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      place_type_enum:
        | "accounting"
        | "airport"
        | "amusement_park"
        | "aquarium"
        | "art_gallery"
        | "atm"
        | "bakery"
        | "bank"
        | "bar"
        | "beauty_salon"
        | "bicycle_store"
        | "book_store"
        | "bowling_alley"
        | "bus_station"
        | "cafe"
        | "campground"
        | "car_dealer"
        | "car_rental"
        | "car_repair"
        | "car_wash"
        | "casino"
        | "cemetery"
        | "church"
        | "city_hall"
        | "clothing_store"
        | "convenience_store"
        | "courthouse"
        | "dentist"
        | "department_store"
        | "doctor"
        | "drugstore"
        | "electrician"
        | "electronics_store"
        | "embassy"
        | "fire_station"
        | "florist"
        | "funeral_home"
        | "furniture_store"
        | "gas_station"
        | "gym"
        | "hair_care"
        | "hardware_store"
        | "hindu_temple"
        | "home_goods_store"
        | "hospital"
        | "insurance_agency"
        | "jewelry_store"
        | "laundry"
        | "lawyer"
        | "library"
        | "light_rail_station"
        | "liquor_store"
        | "local_government_office"
        | "locksmith"
        | "lodging"
        | "meal_delivery"
        | "meal_takeaway"
        | "mosque"
        | "movie_rental"
        | "movie_theater"
        | "moving_company"
        | "museum"
        | "night_club"
        | "painter"
        | "park"
        | "parking"
        | "pet_store"
        | "pharmacy"
        | "physiotherapist"
        | "plumber"
        | "police"
        | "post_office"
        | "primary_school"
        | "real_estate_agency"
        | "restaurant"
        | "roofing_contractor"
        | "rv_park"
        | "school"
        | "secondary_school"
        | "shoe_store"
        | "shopping_mall"
        | "spa"
        | "stadium"
        | "storage"
        | "store"
        | "subway_station"
        | "supermarket"
        | "synagogue"
        | "taxi_stand"
        | "tourist_attraction"
        | "train_station"
        | "transit_station"
        | "travel_agency"
        | "university"
        | "veterinary_care"
        | "zoo"
        | "address"
        | "neighborhood"
        | "locality"
        | "region"
        | "district"
        | "postcode"
        | "country"
        | "poi"
        | "place"
        | "other"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
      place_type_enum: [
        "accounting",
        "airport",
        "amusement_park",
        "aquarium",
        "art_gallery",
        "atm",
        "bakery",
        "bank",
        "bar",
        "beauty_salon",
        "bicycle_store",
        "book_store",
        "bowling_alley",
        "bus_station",
        "cafe",
        "campground",
        "car_dealer",
        "car_rental",
        "car_repair",
        "car_wash",
        "casino",
        "cemetery",
        "church",
        "city_hall",
        "clothing_store",
        "convenience_store",
        "courthouse",
        "dentist",
        "department_store",
        "doctor",
        "drugstore",
        "electrician",
        "electronics_store",
        "embassy",
        "fire_station",
        "florist",
        "funeral_home",
        "furniture_store",
        "gas_station",
        "gym",
        "hair_care",
        "hardware_store",
        "hindu_temple",
        "home_goods_store",
        "hospital",
        "insurance_agency",
        "jewelry_store",
        "laundry",
        "lawyer",
        "library",
        "light_rail_station",
        "liquor_store",
        "local_government_office",
        "locksmith",
        "lodging",
        "meal_delivery",
        "meal_takeaway",
        "mosque",
        "movie_rental",
        "movie_theater",
        "moving_company",
        "museum",
        "night_club",
        "painter",
        "park",
        "parking",
        "pet_store",
        "pharmacy",
        "physiotherapist",
        "plumber",
        "police",
        "post_office",
        "primary_school",
        "real_estate_agency",
        "restaurant",
        "roofing_contractor",
        "rv_park",
        "school",
        "secondary_school",
        "shoe_store",
        "shopping_mall",
        "spa",
        "stadium",
        "storage",
        "store",
        "subway_station",
        "supermarket",
        "synagogue",
        "taxi_stand",
        "tourist_attraction",
        "train_station",
        "transit_station",
        "travel_agency",
        "university",
        "veterinary_care",
        "zoo",
        "address",
        "neighborhood",
        "locality",
        "region",
        "district",
        "postcode",
        "country",
        "poi",
        "place",
        "other",
      ],
    },
  },
} as const
