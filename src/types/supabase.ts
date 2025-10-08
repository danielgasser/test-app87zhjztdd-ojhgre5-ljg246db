export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            user_profiles: {
                Row: {
                    id: string
                    username: string | null
                    full_name: string | null
                    avatar_url: string | null
                    race_ethnicity: string[] | null
                    gender: string | null
                    lgbtq_status: boolean | null
                    disability_status: string[] | null
                    religion: string | null
                    age_range: string | null
                    privacy_level: 'public' | 'anonymous' | 'private'
                    show_demographics: boolean
                    total_reviews: number
                    helpful_votes: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    username?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    race_ethnicity?: string[] | null
                    gender?: string | null
                    lgbtq_status?: boolean | null
                    disability_status?: string[] | null
                    religion?: string | null
                    age_range?: string | null
                    privacy_level?: 'public' | 'anonymous' | 'private'
                    show_demographics?: boolean
                    total_reviews?: number
                    helpful_votes?: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    username?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    race_ethnicity?: string[] | null
                    gender?: string | null
                    lgbtq_status?: boolean | null
                    disability_status?: string[] | null
                    religion?: string | null
                    age_range?: string | null
                    privacy_level?: 'public' | 'anonymous' | 'private'
                    show_demographics?: boolean
                    total_reviews?: number
                    helpful_votes?: number
                    created_at?: string
                    updated_at?: string
                }
            }
            locations: {
                Row: {
                    id: string
                    name: string
                    description: string | null
                    address: string
                    city: string
                    state_province: string
                    country: string
                    postal_code: string | null
                    coordinates: unknown
                    place_type: 'accounting' | 'airport' | 'amusement_park' | 'aquarium' | 'art_gallery' | 'atm' |
                    'bakery' | 'bank' | 'bar' | 'beauty_salon' | 'bicycle_store' | 'book_store' |
                    'bowling_alley' | 'bus_station' | 'cafe' | 'campground' | 'car_dealer' | 'car_rental' |
                    'car_repair' | 'car_wash' | 'casino' | 'cemetery' | 'church' | 'city_hall' |
                    'clothing_store' | 'convenience_store' | 'courthouse' | 'dentist' | 'department_store' |
                    'doctor' | 'drugstore' | 'electrician' | 'electronics_store' | 'embassy' |
                    'fire_station' | 'florist' | 'funeral_home' | 'furniture_store' | 'gas_station' |
                    'gym' | 'hair_care' | 'hardware_store' | 'hindu_temple' | 'home_goods_store' |
                    'hospital' | 'insurance_agency' | 'jewelry_store' | 'laundry' | 'lawyer' | 'library' |
                    'light_rail_station' | 'liquor_store' | 'local_government_office' | 'locksmith' |
                    'lodging' | 'meal_delivery' | 'meal_takeaway' | 'mosque' | 'movie_rental' |
                    'movie_theater' | 'moving_company' | 'museum' | 'night_club' | 'painter' | 'park' |
                    'parking' | 'pet_store' | 'pharmacy' | 'physiotherapist' | 'plumber' | 'police' |
                    'post_office' | 'primary_school' | 'real_estate_agency' | 'restaurant' |
                    'roofing_contractor' | 'rv_park' | 'school' | 'secondary_school' | 'shoe_store' |
                    'shopping_mall' | 'spa' | 'stadium' | 'storage' | 'store' | 'subway_station' |
                    'supermarket' | 'synagogue' | 'taxi_stand' | 'tourist_attraction' | 'train_station' |
                    'transit_station' | 'travel_agency' | 'university' | 'veterinary_care' | 'zoo' |
                    'address' | 'neighborhood' | 'locality' | 'region' | 'district' | 'postcode' |
                    'country' | 'poi' | 'place' | 'other'
                    tags: string[] | null
                    google_place_id: string | null
                    created_by: string | null
                    verified: boolean
                    active: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    description?: string | null
                    address: string
                    city: string
                    state_province: string
                    country?: string
                    postal_code?: string | null
                    coordinates: unknown
                    place_type: 'accounting' | 'airport' | 'amusement_park' | 'aquarium' | 'art_gallery' | 'atm' |
                    'bakery' | 'bank' | 'bar' | 'beauty_salon' | 'bicycle_store' | 'book_store' |
                    'bowling_alley' | 'bus_station' | 'cafe' | 'campground' | 'car_dealer' | 'car_rental' |
                    'car_repair' | 'car_wash' | 'casino' | 'cemetery' | 'church' | 'city_hall' |
                    'clothing_store' | 'convenience_store' | 'courthouse' | 'dentist' | 'department_store' |
                    'doctor' | 'drugstore' | 'electrician' | 'electronics_store' | 'embassy' |
                    'fire_station' | 'florist' | 'funeral_home' | 'furniture_store' | 'gas_station' |
                    'gym' | 'hair_care' | 'hardware_store' | 'hindu_temple' | 'home_goods_store' |
                    'hospital' | 'insurance_agency' | 'jewelry_store' | 'laundry' | 'lawyer' | 'library' |
                    'light_rail_station' | 'liquor_store' | 'local_government_office' | 'locksmith' |
                    'lodging' | 'meal_delivery' | 'meal_takeaway' | 'mosque' | 'movie_rental' |
                    'movie_theater' | 'moving_company' | 'museum' | 'night_club' | 'painter' | 'park' |
                    'parking' | 'pet_store' | 'pharmacy' | 'physiotherapist' | 'plumber' | 'police' |
                    'post_office' | 'primary_school' | 'real_estate_agency' | 'restaurant' |
                    'roofing_contractor' | 'rv_park' | 'school' | 'secondary_school' | 'shoe_store' |
                    'shopping_mall' | 'spa' | 'stadium' | 'storage' | 'store' | 'subway_station' |
                    'supermarket' | 'synagogue' | 'taxi_stand' | 'tourist_attraction' | 'train_station' |
                    'transit_station' | 'travel_agency' | 'university' | 'veterinary_care' | 'zoo' |
                    'address' | 'neighborhood' | 'locality' | 'region' | 'district' | 'postcode' |
                    'country' | 'poi' | 'place' | 'other'
                    tags?: string[] | null
                    google_place_id?: string | null
                    created_by?: string | null
                    verified?: boolean
                    active?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    description?: string | null
                    address?: string
                    city?: string
                    state_province?: string
                    country?: string
                    postal_code?: string | null
                    coordinates?: unknown
                    place_type: 'accounting' | 'airport' | 'amusement_park' | 'aquarium' | 'art_gallery' | 'atm' |
                    'bakery' | 'bank' | 'bar' | 'beauty_salon' | 'bicycle_store' | 'book_store' |
                    'bowling_alley' | 'bus_station' | 'cafe' | 'campground' | 'car_dealer' | 'car_rental' |
                    'car_repair' | 'car_wash' | 'casino' | 'cemetery' | 'church' | 'city_hall' |
                    'clothing_store' | 'convenience_store' | 'courthouse' | 'dentist' | 'department_store' |
                    'doctor' | 'drugstore' | 'electrician' | 'electronics_store' | 'embassy' |
                    'fire_station' | 'florist' | 'funeral_home' | 'furniture_store' | 'gas_station' |
                    'gym' | 'hair_care' | 'hardware_store' | 'hindu_temple' | 'home_goods_store' |
                    'hospital' | 'insurance_agency' | 'jewelry_store' | 'laundry' | 'lawyer' | 'library' |
                    'light_rail_station' | 'liquor_store' | 'local_government_office' | 'locksmith' |
                    'lodging' | 'meal_delivery' | 'meal_takeaway' | 'mosque' | 'movie_rental' |
                    'movie_theater' | 'moving_company' | 'museum' | 'night_club' | 'painter' | 'park' |
                    'parking' | 'pet_store' | 'pharmacy' | 'physiotherapist' | 'plumber' | 'police' |
                    'post_office' | 'primary_school' | 'real_estate_agency' | 'restaurant' |
                    'roofing_contractor' | 'rv_park' | 'school' | 'secondary_school' | 'shoe_store' |
                    'shopping_mall' | 'spa' | 'stadium' | 'storage' | 'store' | 'subway_station' |
                    'supermarket' | 'synagogue' | 'taxi_stand' | 'tourist_attraction' | 'train_station' |
                    'transit_station' | 'travel_agency' | 'university' | 'veterinary_care' | 'zoo' |
                    'address' | 'neighborhood' | 'locality' | 'region' | 'district' | 'postcode' |
                    'country' | 'poi' | 'place' | 'other'
                    tags?: string[] | null
                    google_place_id?: string | null
                    created_by?: string | null
                    verified?: boolean
                    active?: boolean
                    created_at?: string
                    updated_at?: string
                }
            }
            reviews: {
                Row: {
                    id: string
                    location_id: string
                    user_id: string
                    title: string
                    content: string
                    overall_rating: number
                    safety_rating: number
                    comfort_rating: number
                    accessibility_rating: number | null
                    service_rating: number | null
                    visited_at: string | null
                    visit_type: 'solo' | 'couple' | 'family' | 'group' | 'business' | null
                    photo_urls: string[] | null
                    status: 'active' | 'flagged' | 'hidden' | 'deleted'
                    flag_count: number
                    helpful_count: number
                    unhelpful_count: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    location_id: string
                    user_id: string
                    title: string
                    content: string
                    overall_rating: number
                    safety_rating: number
                    comfort_rating: number
                    accessibility_rating?: number | null
                    service_rating?: number | null
                    visit_date?: string | null
                    time_of_day?: 'morning' | 'afternoon' | 'evening' | 'night' | null
                    visit_type?: 'solo' | 'couple' | 'family' | 'group' | 'business' | null
                    photo_urls?: string[] | null
                    status?: 'active' | 'flagged' | 'hidden' | 'deleted'
                    flag_count?: number
                    helpful_count?: number
                    unhelpful_count?: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    location_id?: string
                    user_id?: string
                    title?: string
                    content?: string
                    overall_rating?: number
                    safety_rating?: number
                    comfort_rating?: number
                    accessibility_rating?: number | null
                    service_rating?: number | null
                    visit_date?: string | null
                    time_of_day?: 'morning' | 'afternoon' | 'evening' | 'night' | null
                    visit_type?: 'solo' | 'couple' | 'family' | 'group' | 'business' | null
                    photo_urls?: string[] | null
                    status?: 'active' | 'flagged' | 'hidden' | 'deleted'
                    flag_count?: number
                    helpful_count?: number
                    unhelpful_count?: number
                    created_at?: string
                    updated_at?: string
                }
            }
            safety_scores: {
                Row: {
                    id: string
                    location_id: string
                    demographic_type: 'race_ethnicity' | 'gender' | 'lgbtq' |
                    'disability' | 'religion' | 'age' | 'overall'
                    demographic_value: string | null
                    avg_safety_score: number | null
                    avg_comfort_score: number | null
                    avg_overall_score: number | null
                    review_count: number
                    last_review_date: string | null
                    calculated_at: string
                }
                Insert: {
                    id?: string
                    location_id: string
                    demographic_type: 'race_ethnicity' | 'gender' | 'lgbtq' |
                    'disability' | 'religion' | 'age' | 'overall'
                    demographic_value?: string | null
                    avg_safety_score?: number | null
                    avg_comfort_score?: number | null
                    avg_overall_score?: number | null
                    review_count?: number
                    last_review_date?: string | null
                    calculated_at?: string
                }
                Update: {
                    id?: string
                    location_id?: string
                    demographic_type?: 'race_ethnicity' | 'gender' | 'lgbtq' |
                    'disability' | 'religion' | 'age' | 'overall'
                    demographic_value?: string | null
                    avg_safety_score?: number | null
                    avg_comfort_score?: number | null
                    avg_overall_score?: number | null
                    review_count?: number
                    last_review_date?: string | null
                    calculated_at?: string
                }
            }
            review_votes: {
                Row: {
                    id: string
                    review_id: string
                    user_id: string
                    vote_type: 'helpful' | 'unhelpful'
                    created_at: string
                }
                Insert: {
                    id?: string
                    review_id: string
                    user_id: string
                    vote_type: 'helpful' | 'unhelpful'
                    created_at?: string
                }
                Update: {
                    id?: string
                    review_id?: string
                    user_id?: string
                    vote_type?: 'helpful' | 'unhelpful'
                    created_at?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            calculate_location_safety_scores: {
                Args: {
                    p_location_id: string
                }
                Returns: undefined
            }
            get_nearby_locations: {
                Args: {
                    lat: number
                    lng: number
                    radius_meters?: number
                }
                Returns: {
                    id: string
                    name: string
                    address: string
                    place_type: string
                    distance_meters: number
                    avg_safety_score: number | null
                    latitude: number
                    longitude: number
                }[]
            }
            get_nearby_locations_for_user: {
                Args: {
                    lat: number
                    lng: number
                    user_race_ethnicity?: string[] | null
                    user_gender?: string | null
                    user_lgbtq_status?: boolean | null
                    radius_meters?: number
                }
                Returns: {
                    id: string
                    name: string
                    address: string
                    place_type: string
                    distance_meters: number
                    avg_safety_score: number | null
                    demographic_safety_score: number | null
                    latitude: number
                    longitude: number
                }[]
            }
        }
        Enums: {
            [_ in never]: never
        }
    }
}

export type Tables<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Row']

export type InsertTables<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Insert']

export type UpdateTables<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Update']

export type UserProfile = Tables<'user_profiles'>
export type Location = Tables<'locations'>
export type Review = Tables<'reviews'>
export type SafetyScore = Tables<'safety_scores'>
export type ReviewVote = Tables<'review_votes'>

export interface LocationWithScores extends Location {
    demographic_safety_score: any
    avg_safety_score: any
    longitude: number
    latitude: number
    safety_scores?: SafetyScore[]
    overall_safety_score?: number
    review_count?: number
}

export interface ReviewWithUser extends Review {
    user_profiles?: UserProfile
}

export interface ReviewWithLocation extends Review {
    locations?: Location
}
export interface CreateReviewForm {
    location_id: string
    title: string
    content: string
    overall_rating: number
    safety_rating: number
    comfort_rating: number
    accessibility_rating?: number
    service_rating?: number
    visited_at?: string | null
    time_of_day?: 'morning' | 'afternoon' | 'evening' | 'night' | null
    visit_type?: 'solo' | 'couple' | 'family' | 'group' | 'business'
}

export interface UpdateReviewForm {
    title?: string
    content?: string
    overall_rating?: number
    safety_rating?: number
    comfort_rating?: number
    accessibility_rating?: number | null
    service_rating?: number | null
    visited_at?: string
    visit_type?: 'solo' | 'couple' | 'family' | 'group' | 'business' | null
    location_id?: string
}

export interface CreateLocationForm {
    name: string
    description?: string
    address: string
    city: string
    state_province: string
    country: string
    postal_code?: string
    latitude: number
    longitude: number
    place_type: Location['place_type']
    tags?: string[]
}
export interface Coordinates {
    latitude: number
    longitude: number
}

export interface RouteRequest {
    start: Coordinates;
    end: Coordinates;
    user_demographics: UserProfile;
    avoid_safety_threshold?: number;
    optimize_for: 'safety' | 'time' | 'balanced';
}

export interface RouteSegment {
    coordinates: Coordinates[];
    safety_score: number;
    distance: number;
    duration: number;
    warnings?: string[];
}

export interface DangerZone {
    id: string
    location_id: string
    location_name: string
    center_lat: number
    center_lng: number
    danger_level: 'high' | 'medium' | 'low'
    affected_demographics: string[]
    polygon_points: Array<{ lat: number, lng: number }>
    reasons: string[]
    time_based: boolean
    active_times?: string[]
}

export interface DangerZonesResponse {
    zones: never[]
    user_id: string
    danger_zones: DangerZone[]
    total_zones: number
    user_demographics: {
        race_ethnicity: string[]
        gender: string
        lgbtq_status: boolean
    }
    generated_at: string
}