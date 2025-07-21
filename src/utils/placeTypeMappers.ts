export type DatabasePlaceType = 
  'accounting' | 'airport' | 'amusement_park' | 'aquarium' | 'art_gallery' | 'atm' | 
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
  'country' | 'poi' | 'place' | 'other';


export function mapMapboxPlaceType(mapboxType?: string): DatabasePlaceType {
  if (!mapboxType) return 'other';
  
  const type = mapboxType.toLowerCase();
  
  const mapboxMappings: { [key: string]: DatabasePlaceType } = {
    'address': 'address',
    'neighborhood': 'neighborhood', 
    'locality': 'locality',
    'place': 'place',
    'region': 'region',
    'district': 'district',
    'postcode': 'postcode',
    'country': 'country',
    'poi': 'poi',
    
    'restaurant': 'restaurant',
    'cafe': 'cafe',
    'bar': 'bar',
    'hotel': 'lodging',
    'gas_station': 'gas_station',
    'bank': 'bank',
    'atm': 'atm',
    'hospital': 'hospital',
    'school': 'school',
    'park': 'park',
    'airport': 'airport',
    'train_station': 'train_station',
    'bus_station': 'bus_station',
    'subway_station': 'subway_station',
    'shopping_mall': 'shopping_mall',
    'store': 'store',
    'pharmacy': 'pharmacy',
    'library': 'library',
    'museum': 'museum',
    'church': 'church',
    'mosque': 'mosque',
    'synagogue': 'synagogue',
    'university': 'university',
  };
  
  return mapboxMappings[type] || 'other';
}

/**
 * Maps Google Places API types to our database enum
 * Google types should mostly match 1:1 since we based our schema on them
 */
export function mapGooglePlaceType(googleTypes?: string[]): DatabasePlaceType {
  if (!googleTypes || googleTypes.length === 0) return 'other';
  
  // Google Places can return multiple types, we want the most specific one
  // Order by specificity (most specific first)
  const priorityOrder: DatabasePlaceType[] = [
    'restaurant', 'bar', 'cafe', 'bakery', 'meal_delivery', 'meal_takeaway',
    
    'lodging', 'campground', 'rv_park',
    
    'gas_station', 'airport', 'train_station', 'bus_station', 'subway_station', 
    'light_rail_station', 'transit_station', 'taxi_stand',
    
    'night_club', 'casino', 'movie_theater', 'amusement_park', 'bowling_alley',
    
    'supermarket', 'convenience_store', 'shopping_mall', 
    'department_store', 'clothing_store', 'shoe_store', 'electronics_store',
    'jewelry_store', 'book_store', 'bicycle_store', 'furniture_store',
    'hardware_store', 'home_goods_store', 'pet_store', 'store',
    
    'hospital', 'doctor', 'dentist', 'pharmacy', 'drugstore', 'veterinary_care',
    'physiotherapist', 'beauty_salon', 'hair_care', 'spa', 'gym',
    
    'bank', 'atm', 'lawyer', 'accounting', 'insurance_agency', 'real_estate_agency',
    'travel_agency',
    
    'city_hall', 'courthouse', 'police', 'fire_station', 'post_office', 
    'embassy', 'local_government_office',
    
    'school', 'primary_school', 'secondary_school', 'university', 'library',
    
    'church', 'mosque', 'synagogue', 'hindu_temple',
    
    'park', 'tourist_attraction', 'museum', 'art_gallery', 'zoo', 'aquarium',
    'stadium',
    
    'car_dealer', 'car_rental', 'car_repair', 'car_wash', 'moving_company',
    'storage', 'laundry', 'locksmith', 'electrician', 'plumber', 'painter',
    'roofing_contractor', 'florist', 'funeral_home',
    
    'parking', 'other'
  ];
  
  for (const priorityType of priorityOrder) {
    if (googleTypes.includes(priorityType)) {
      return priorityType;
    }
  }
  
  const firstType = googleTypes[0] as DatabasePlaceType;
  const allValidTypes: DatabasePlaceType[] = [
    'accounting', 'airport', 'amusement_park', 'aquarium', 'art_gallery', 'atm',
    'bakery', 'bank', 'bar', 'beauty_salon', 'bicycle_store', 'book_store',
    'bowling_alley', 'bus_station', 'cafe', 'campground', 'car_dealer', 'car_rental',
    'car_repair', 'car_wash', 'casino', 'cemetery', 'church', 'city_hall',
    'clothing_store', 'convenience_store', 'courthouse', 'dentist', 'department_store',
    'doctor', 'drugstore', 'electrician', 'electronics_store', 'embassy',
    'fire_station', 'florist', 'funeral_home', 'furniture_store', 'gas_station',
    'gym', 'hair_care', 'hardware_store', 'hindu_temple', 'home_goods_store',
    'hospital', 'insurance_agency', 'jewelry_store', 'laundry', 'lawyer', 'library',
    'light_rail_station', 'liquor_store', 'local_government_office', 'locksmith',
    'lodging', 'meal_delivery', 'meal_takeaway', 'mosque', 'movie_rental',
    'movie_theater', 'moving_company', 'museum', 'night_club', 'painter', 'park',
    'parking', 'pet_store', 'pharmacy', 'physiotherapist', 'plumber', 'police',
    'post_office', 'primary_school', 'real_estate_agency', 'restaurant',
    'roofing_contractor', 'rv_park', 'school', 'secondary_school', 'shoe_store',
    'shopping_mall', 'spa', 'stadium', 'storage', 'store', 'subway_station',
    'supermarket', 'synagogue', 'taxi_stand', 'tourist_attraction', 'train_station',
    'transit_station', 'travel_agency', 'university', 'veterinary_care', 'zoo',
    'address', 'neighborhood', 'locality', 'region', 'district', 'postcode',
    'country', 'poi', 'place', 'other'
  ];
  
  return allValidTypes.includes(firstType) ? firstType : 'other';
}

/**
 * Gets a human-readable display name for a place type
 */
export function getPlaceTypeDisplayName(placeType: DatabasePlaceType): string {
  const displayNames: { [key in DatabasePlaceType]: string } = {
    'accounting': 'Accounting',
    'airport': 'Airport',
    'amusement_park': 'Amusement Park',
    'aquarium': 'Aquarium',
    'art_gallery': 'Art Gallery',
    'atm': 'ATM',
    'bakery': 'Bakery',
    'bank': 'Bank',
    'bar': 'Bar',
    'beauty_salon': 'Beauty Salon',
    'bicycle_store': 'Bicycle Store',
    'book_store': 'Book Store',
    'bowling_alley': 'Bowling Alley',
    'bus_station': 'Bus Station',
    'cafe': 'Café',
    'campground': 'Campground',
    'car_dealer': 'Car Dealer',
    'car_rental': 'Car Rental',
    'car_repair': 'Car Repair',
    'car_wash': 'Car Wash',
    'casino': 'Casino',
    'cemetery': 'Cemetery',
    'church': 'Church',
    'city_hall': 'City Hall',
    'clothing_store': 'Clothing Store',
    'convenience_store': 'Convenience Store',
    'courthouse': 'Courthouse',
    'dentist': 'Dentist',
    'department_store': 'Department Store',
    'doctor': 'Doctor',
    'drugstore': 'Drugstore',
    'electrician': 'Electrician',
    'electronics_store': 'Electronics Store',
    'embassy': 'Embassy',
    'fire_station': 'Fire Station',
    'florist': 'Florist',
    'funeral_home': 'Funeral Home',
    'furniture_store': 'Furniture Store',
    'gas_station': 'Gas Station',
    'gym': 'Gym',
    'hair_care': 'Hair Care',
    'hardware_store': 'Hardware Store',
    'hindu_temple': 'Hindu Temple',
    'home_goods_store': 'Home Goods Store',
    'hospital': 'Hospital',
    'insurance_agency': 'Insurance Agency',
    'jewelry_store': 'Jewelry Store',
    'laundry': 'Laundry',
    'lawyer': 'Lawyer',
    'library': 'Library',
    'light_rail_station': 'Light Rail Station',
    'liquor_store': 'Liquor Store',
    'local_government_office': 'Government Office',
    'locksmith': 'Locksmith',
    'lodging': 'Hotel/Lodging',
    'meal_delivery': 'Meal Delivery',
    'meal_takeaway': 'Takeaway',
    'mosque': 'Mosque',
    'movie_rental': 'Movie Rental',
    'movie_theater': 'Movie Theater',
    'moving_company': 'Moving Company',
    'museum': 'Museum',
    'night_club': 'Night Club',
    'painter': 'Painter',
    'park': 'Park',
    'parking': 'Parking',
    'pet_store': 'Pet Store',
    'pharmacy': 'Pharmacy',
    'physiotherapist': 'Physiotherapist',
    'plumber': 'Plumber',
    'police': 'Police',
    'post_office': 'Post Office',
    'primary_school': 'Primary School',
    'real_estate_agency': 'Real Estate',
    'restaurant': 'Restaurant',
    'roofing_contractor': 'Roofing Contractor',
    'rv_park': 'RV Park',
    'school': 'School',
    'secondary_school': 'Secondary School',
    'shoe_store': 'Shoe Store',
    'shopping_mall': 'Shopping Mall',
    'spa': 'Spa',
    'stadium': 'Stadium',
    'storage': 'Storage',
    'store': 'Store',
    'subway_station': 'Subway Station',
    'supermarket': 'Supermarket',
    'synagogue': 'Synagogue',
    'taxi_stand': 'Taxi Stand',
    'tourist_attraction': 'Tourist Attraction',
    'train_station': 'Train Station',
    'transit_station': 'Transit Station',
    'travel_agency': 'Travel Agency',
    'university': 'University',
    'veterinary_care': 'Veterinary Care',
    'zoo': 'Zoo',
    'address': 'Address',
    'neighborhood': 'Neighborhood',
    'locality': 'City/Town',
    'region': 'Region',
    'district': 'District',
    'postcode': 'Postal Code',
    'country': 'Country',
    'poi': 'Point of Interest',
    'place': 'Place',
    'other': 'Other'
  };
  
  return displayNames[placeType] || 'Other';
}