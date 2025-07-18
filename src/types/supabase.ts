import { DemographicProfile } from './index';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          demographics: DemographicProfile;
          onboarding_complete: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          demographics?: DemographicProfile;
          onboarding_complete?: boolean;
        };
        Update: {
          demographics?: DemographicProfile;
          onboarding_complete?: boolean;
        };
      };
      locations: {
        Row: {
          id: string;
          name: string;
          address: string;
          latitude: number;
          longitude: number;
          place_type: string;
          created_at: string;
          updated_at: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          location_id: string;
          user_id: string;
          rating: number;
          title: string;
          content: string;
          demographic_context: DemographicProfile;
          created_at: string;
        };
      };
    };
  };
};