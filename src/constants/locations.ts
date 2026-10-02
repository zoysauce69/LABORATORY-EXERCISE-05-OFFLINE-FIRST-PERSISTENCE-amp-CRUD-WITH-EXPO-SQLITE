/**
 * Static reference data used by filter sheets and forms.
 *
 * Property records always live in Postgres. This file only supplies the option
 * lists for pickers, plus the well-known universities and business districts
 * students can anchor their distance filter to.
 */

export interface CityOption {
  label: string;
  /** Approximate centre used to seed the map/distance reference point. */
  latitude: number;
  longitude: number;
}

export const PH_CITIES: CityOption[] = [
  // Metro Manila
  { label: 'Caloocan', latitude: 14.676, longitude: 120.982 },
  { label: 'Makati', latitude: 14.569, longitude: 121.034 },
  { label: 'Mandaluyong', latitude: 14.579, longitude: 121.036 },
  { label: 'Manila', latitude: 14.599, longitude: 120.984 },
  { label: 'Marikina', latitude: 14.579, longitude: 121.034 },
  { label: 'Muntinlupa', latitude: 14.383, longitude: 121.183 },
  { label: 'Navotas', latitude: 14.573, longitude: 120.956 },
  { label: 'Parañaque', latitude: 14.529, longitude: 121.01 },
  { label: 'Pasay', latitude: 14.537, longitude: 120.997 },
  { label: 'Pasig', latitude: 14.574, longitude: 121.065 },
  { label: 'Quezon City', latitude: 14.676, longitude: 121.048 },
  { label: 'San Juan', latitude: 14.604, longitude: 121.022 },
  { label: 'Taguig', latitude: 14.553, longitude: 121.05 },
  { label: 'Valenzuela', latitude: 14.695, longitude: 120.98 },
  // Major provincial cities with sizeable student populations
  { label: 'Bacolod', latitude: 10.679, longitude: 122.967 },
  { label: 'Cebu City', latitude: 10.316, longitude: 123.885 },
  { label: 'Davao City', latitude: 7.068, longitude: 125.607 },
  { label: 'Dumaguete', latitude: 9.306, longitude: 123.306 },
  { label: 'Iloilo City', latitude: 10.693, longitude: 122.567 },
  { label: 'Los Baños', latitude: 14.212, longitude: 121.165 },
];

export const PH_BARANGAYS: Record<string, string[]> = {
  Caloocan: ['Bagong Silang', 'Calasag', 'Gulod', 'Poblacion', 'Sampaloc'],
  Makati: ['Belgrave', 'Dasmariñas', 'Guadalupe', 'Makati', 'Poblacion', 'San Antonio'],
  Mandaluyong: ['Addition Hills', 'Bagong Silang', 'Buayang Bato', 'Muzon', 'Poblacion'],
  Manila: ['Binondo', 'Ermita', 'Malate', 'Pandacan', 'Sampaloc', 'San Andres', 'Tondo'],
  Marikina: ['Calumpang', 'Centennial', 'Fb Harrison', 'Industrial', 'Kalusugan', 'San Roque'],
  Muntinlupa: ['Alabang', 'Ayala Alabang', 'Bayanan', 'Cupang', 'Poblacion', 'Tunasan'],
  Navotas: ['Bagumbayan North', 'Bagumbayan South', 'Navotas East', 'San Jose'],
  'Parañaque': ['Baclaran', 'BF Parañaque', 'Don Bosco', 'La Huerta', 'Mabini-J Rizal'],
  Pasay: ['Cartas', 'Pasay', 'Signal Hill', 'T Ships'],
  Pasig: ['Bagong Silang', 'Bayanan', 'Canluban', 'Kuningan', 'Manggahan', 'Poblacion', 'Ugong'],
  'Quezon City': [
    'Bagong Lipunan',
    'Batasan Hills',
    ' Commonwealth',
    'Don Manuel',
    'Holy Spirit',
    'Kalusugan',
    'Krus naPeso',
    'Old Capitol Site',
    'Payatas',
    'Poblacion',
    'San Martin de Porres',
    'Tala',
  ],
  'San Juan': ['Addition Hills', 'Bagong Jingon', 'Coronel Primero', 'Isabelita', 'Little Baguio', 'Pinaglabanan'],
  Taguig: ['Bagumbayan', 'Bambaan', 'Barangka', 'Cupang', 'Maharlika', 'Poblacion', 'Ususan'],
  Valenzuela: ['Bagbaguin', 'Balakeng', 'Fatima', 'Polo', 'San Agustin', 'Sunshine'],
  Bacolod: ['Bagong Silang', 'Estancia', 'Mandalagan', 'Poblacion', 'Tacalang', 'Villamacin'],
  'Cebu City': [
    'Banana',
    'Cebu City Capitol',
    'Lahug',
    'Mabolo',
    'Mandaue',
    'Poblacion',
    'Talamban',
    'Talisay',
  ],
  'Davao City': ['Agdao', 'Bunawan', 'Matina', 'Poblacion', 'Toril', 'Tuday'],
  Dumaguete: ['Arellano', 'Baptisan', 'Poblacion', 'San Jose', 'Sibulan'],
  'Iloilo City': [
    'Bolo',
    'Cabatuan',
    'Cagbang',
    'Lapuz',
    'Molo',
    'Poblacion',
    'Santa Barbara',
  ],
  'Los Baños': ['Batmal', 'College', 'Poblacion', 'Putatan'],
};

/** Curated, well-known anchors for the distance filter. */
export interface InstitutionOption {
  label: string;
  city: string;
  latitude: number;
  longitude: number;
}

export const PH_SCHOOLS: InstitutionOption[] = [
  { label: 'University of the Philippines Diliman', city: 'Quezon City', latitude: 14.653, longitude: 121.035 },
  { label: 'Ateneo de Manila University', city: 'Quezon City', latitude: 14.676, longitude: 121.061 },
  { label: 'De La Salle University – Taft', city: 'Manila', latitude: 14.601, longitude: 120.99 },
  { label: 'Polytechnic University of the Philippines', city: 'Manila', latitude: 14.613, longitude: 120.977 },
  { label: 'Far Eastern University', city: 'Manila', latitude: 14.614, longitude: 120.998 },
  { label: 'National University – Fairview', city: 'Quezon City', latitude: 14.676, longitude: 121.047 },
  { label: 'Technological Institute of the Philippines', city: 'Manila', latitude: 14.606, longitude: 120.985 },
  { label: 'Adamson University', city: 'Manila', latitude: 14.606, longitude: 120.984 },
  { label: 'University of Santo Tomas', city: 'Manila', latitude: 14.611, longitude: 121.0 },
  { label: 'Mapúa University – Intramuros', city: 'Manila', latitude: 14.605, longitude: 120.982 },
  { label: 'Arellano University', city: 'Manila', latitude: 14.617, longitude: 121.0 },
  { label: 'University of Makati', city: 'Makati', latitude: 14.57, longitude: 121.043 },
  { label: 'Asian Institute of Management', city: 'Makati', latitude: 14.551, longitude: 121.061 },
  { label: 'Centro Escolar University', city: 'Manila', latitude: 14.601, longitude: 121.021 },
  { label: 'Philippine Christian University', city: 'Manila', latitude: 14.605, longitude: 120.989 },
  { label: 'San Beda University', city: 'Manila', latitude: 14.601, longitude: 121.0 },
  { label: 'National College of Business and Arts – Fairview', city: 'Quezon City', latitude: 14.679, longitude: 121.045 },
  { label: 'Miriam College', city: 'Quezon City', latitude: 14.603, longitude: 121.029 },
  { label: 'New Era University', city: 'Bacolod', latitude: 14.408, longitude: 122.871 },
  { label: 'University of San Carlos – Talamban', city: 'Cebu City', latitude: 10.316, longitude: 123.89 },
  { label: 'Ateneo de Davao University', city: 'Davao City', latitude: 7.067, longitude: 125.607 },
  { label: 'Silliman University', city: 'Dumaguete', latitude: 9.154, longitude: 123.186 },
  { label: 'University of the Philippines Visayas', city: 'Cebu City', latitude: 10.318, longitude: 123.891 },
  { label: 'Lyceum of the Philippines – Manila', city: 'Manila', latitude: 14.59, longitude: 121.012 },
];

export const PH_WORKPLACES: InstitutionOption[] = [
  { label: 'BGC (Makati business district)', city: 'Makati', latitude: 14.551, longitude: 121.053 },
  { label: 'Makati CBD – Ayala Avenue', city: 'Makati', latitude: 14.566, longitude: 121.033 },
  { label: 'Ortigas Center', city: 'Pasig', latitude: 14.587, longitude: 121.061 },
  { label: 'Bonifacio Global City (5th Ave)', city: 'Taguig', latitude: 14.551, longitude: 121.045 },
  { label: 'Bonifacio High Street', city: 'Taguig', latitude: 14.551, longitude: 121.062 },
  { label: 'Makati–Manila business corridor', city: 'Makati', latitude: 14.566, longitude: 121.019 },
  { label: 'Aseana City', city: 'Parañaque', latitude: 14.533, longitude: 120.933 },
  { label: 'SM Megamall – EDSA', city: 'Quezon City', latitude: 14.683, longitude: 121.05 },
  { label: 'Timog Avenue', city: 'Quezon City', latitude: 14.62, longitude: 121.038 },
  { label: 'Quezon City Hall complex', city: 'Quezon City', latitude: 14.676, longitude: 121.048 },
  { label: 'Manila City Hall', city: 'Manila', latitude: 14.602, longitude: 120.982 },
  { label: 'Cebu IT Park', city: 'Cebu City', latitude: 10.311, longitude: 123.89 },
  { label: 'Davao City Business Park', city: 'Davao City', latitude: 7.077, longitude: 125.613 },
  { label: 'Iloilo Business District', city: 'Iloilo City', latitude: 10.695, longitude: 122.562 },
  { label: 'Lakambay / Newport', city: 'Parañaque', latitude: 14.531, longitude: 120.935 },
];

export function barangaysFor(city: string | null | undefined): string[] {
  if (!city) return [];
  return PH_BARANGAYS[city] ?? [];
}

export function cities(): string[] {
  return PH_CITIES.map((c) => c.label);
}

export function cityCoordinates(city: string): CityOption | undefined {
  return PH_CITIES.find((c) => c.label.toLowerCase() === city.toLowerCase());
}