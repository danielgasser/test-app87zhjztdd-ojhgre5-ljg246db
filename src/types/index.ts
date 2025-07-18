export interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  place_type: 'restaurant' | 'hotel' | 'gas_station' | 'attraction' | 'other';
  created_at: string;
  updated_at: string;
}

export interface SafetyRating {
  id: string;
  location_id: string;
  user_id: string;
  demographic_group: string;
  safety_score: number; // 1-5
  accessibility_score?: number;
  comfort_score?: number;
  service_score?: number;
  comment?: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Review {
  id: string;
  location_id: string;
  user_id: string;
  rating: number;
  title: string;
  content: string;
  demographic_context: DemographicProfile;
  created_at: string;
  helpful_count: number;
}

export interface DemographicProfile {
  race?: string[];
  gender?: string;
  lgbtq?: boolean;
  disability?: boolean;
  religion?: string;
  age_group?: string;
}