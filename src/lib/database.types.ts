/**
 * Database types.
 *
 * This file mirrors supabase/migrations/*.sql and is what `npm run db:types`
 * would regenerate. It is hand-maintained so the project type-checks before a
 * Supabase project exists. Re-run the generator once you have a project and
 * confirm the shapes still match.
 */

export type UserRole = 'student' | 'landlord';

export type PropertyType = 'boarding_house' | 'apartment' | 'studio' | 'shared_room';

export type PropertyStatus = 'draft' | 'published' | 'unpublished' | 'occupied';

export type BookingKind = 'visit' | 'application';

export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type RoommateRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export type NotificationType =
  | 'booking_update'
  | 'roommate_request'
  | 'roommate_response'
  | 'listing_update'
  | 'verification_update'
  | 'system';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      profile_private_details: {
        Row: ProfilePrivateDetailsRow;
        Insert: ProfilePrivateDetailsInsert;
        Update: ProfilePrivateDetailsUpdate;
        Relationships: [];
      };
      properties: {
        Row: PropertyRow;
        Insert: PropertyInsert;
        Update: PropertyUpdate;
        Relationships: [];
      };
      property_images: {
        Row: PropertyImageRow;
        Insert: PropertyImageInsert;
        Update: PropertyImageUpdate;
        Relationships: [];
      };
      amenities: {
        Row: AmenityRow;
        Insert: Partial<AmenityRow>;
        Update: Partial<AmenityRow>;
        Relationships: [];
      };
      property_amenities: {
        Row: PropertyAmenityRow;
        Insert: PropertyAmenityInsert;
        Update: never;
        Relationships: [];
      };
      saved_properties: {
        Row: SavedPropertyRow;
        Insert: SavedPropertyInsert;
        Update: never;
        Relationships: [];
      };
      saved_roommate_profiles: {
        Row: SavedRoommateProfileRow;
        Insert: SavedRoommateProfileInsert;
        Update: never;
        Relationships: [];
      };
      bookings: {
        Row: BookingRow;
        Insert: BookingInsert;
        Update: BookingUpdate;
        Relationships: [];
      };
      roommate_profiles: {
        Row: RoommateProfileRow;
        Insert: RoommateProfileInsert;
        Update: RoommateProfileUpdate;
        Relationships: [];
      };
      roommate_requests: {
        Row: RoommateRequestRow;
        Insert: RoommateRequestInsert;
        Update: RoommateRequestUpdate;
        Relationships: [];
      };
      landlord_verification_requests: {
        Row: VerificationRequestRow;
        Insert: VerificationRequestInsert;
        Update: never;
        Relationships: [];
      };
      notifications: {
        Row: NotificationRow;
        Insert: NotificationInsert;
        Update: NotificationUpdate;
        Relationships: [];
      };
      push_tokens: {
        Row: PushTokenRow;
        Insert: PushTokenInsert;
        Update: PushTokenUpdate;
        Relationships: [];
      };
      property_views: {
        Row: PropertyViewRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      admin_users: {
        Row: AdminUserRow;
        Insert: AdminUserInsert;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      search_properties: {
        Args: PropertySearchArgs;
        Returns: PropertySearchResult[];
      };
      landlord_dashboard_stats: {
        Args: Record<string, never>;
        Returns: LandlordDashboardStats;
      };
      search_roommates: {
        Args: RoommateSearchArgs;
        Returns: RoommateMatchResult[];
      };
      record_property_view: {
        Args: { p_property_id: string };
        Returns: number;
      };
      admin_review_verification: {
        Args: { p_request_id: string; p_decision: 'verified' | 'rejected'; p_notes?: string | null };
        Returns: VerificationRequestRow;
      };
      set_booking_status: {
        Args: { p_booking_id: string; p_status: BookingStatus; p_reason?: string | null };
        Returns: BookingRow;
      };
      notify: {
        Args: {
          p_user_id: string;
          p_type: NotificationType;
          p_title: string;
          p_body: string;
          p_data?: Record<string, unknown>;
        };
        Returns: undefined;
      };
      delete_my_account: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      is_admin: {
        Args: { uid: string };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      property_type: PropertyType;
      property_status: PropertyStatus;
      booking_kind: BookingKind;
      booking_status: BookingStatus;
      roommate_request_status: RoommateRequestStatus;
      verification_status: VerificationStatus;
      notification_type: NotificationType;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type ProfileRow = {
  id: string;
  role: UserRole;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  /** Landlord opt-in to be shown publicly. Students default to false. */
  is_public: boolean;
  /** Contact details the landlord explicitly chose to publish. */
  public_phone: string | null;
  public_email: string | null;
  business_name: string | null;
  verification_status: VerificationStatus;
  verified_at: string | null;
  notify_booking_updates: boolean;
  notify_roommate_requests: boolean;
  notify_listing_updates: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Insert shapes mirror the generator: only columns the database refuses to
 * default are required, everything else may be omitted. Keeping them optional
 * is what lets an upsert send only the fields that changed.
 */
export type ProfileInsert = Pick<ProfileRow, 'id' | 'role' | 'full_name'> &
  Partial<Omit<ProfileRow, 'id' | 'role' | 'full_name'>>;

export type ProfileUpdate = Partial<Omit<ProfileInsert, 'id' | 'role'>>;

export type ProfilePrivateDetailsRow = {
  user_id: string;
  /** Mirrors auth.users.email so the app can show it without touching auth. */
  email: string | null;
  phone: string | null;
  address_line: string | null;
  city: string | null;
  barangay: string | null;
  /** School or workplace used for the distance filter. */
  institution_name: string | null;
  institution_kind: 'school' | 'workplace' | null;
  institution_latitude: number | null;
  institution_longitude: number | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfilePrivateDetailsInsert = Pick<ProfilePrivateDetailsRow, 'user_id'> &
  Partial<Omit<ProfilePrivateDetailsRow, 'user_id'>>;

export type ProfilePrivateDetailsUpdate = Partial<Omit<ProfilePrivateDetailsInsert, 'user_id'>>;

export type OtherFee = {
  label: string;
  amount: number;
  recurring: boolean;
  note?: string;
};

export type NearbyPlace = {
  name: string;
  latitude: number;
  longitude: number;
};

export type PropertyRow = {
  id: string;
  landlord_id: string;
  title: string;
  description: string;
  property_type: PropertyType;
  monthly_rent: number;
  /** Security deposit / advance, disclosed separately from rent. */
  advance_amount: number;
  other_fees: OtherFee[];
  city: string;
  barangay: string;
  address_line: string | null;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  nearby_schools: NearbyPlace[];
  nearby_workplaces: NearbyPlace[];
  total_units: number;
  occupied_units: number;
  /** Restricts who may apply, e.g. "female_only". Advisory, enforced on the form. */
  gender_preference: string;
  available_from: string | null;
  status: PropertyStatus;
  is_featured: boolean;
  virtual_tour_url: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
};

export type PropertyInsert = Pick<
  PropertyRow,
  'landlord_id' | 'title' | 'description' | 'property_type' | 'monthly_rent'
> &
  Partial<Omit<PropertyRow, 'landlord_id' | 'title' | 'description' | 'property_type' | 'monthly_rent'>>;

export type PropertyUpdate = Partial<Omit<PropertyInsert, 'id' | 'landlord_id'>>;

export type PropertyImageRow = {
  id: string;
  property_id: string;
  /** Object key inside the `property-images` storage bucket. */
  storage_path: string;
  /** Set for landlord-uploaded media, false for external demo URLs. */
  is_uploaded: boolean;
  alt_text: string | null;
  sort_order: number;
  created_at: string;
};

export type PropertyImageInsert = Pick<PropertyImageRow, 'property_id' | 'storage_path'> &
  Partial<Omit<PropertyImageRow, 'property_id' | 'storage_path'>>;

export type PropertyImageUpdate = Partial<Omit<PropertyImageInsert, 'id' | 'property_id'>>;

export type AmenityRow = {
  id: number;
  slug: string;
  label: string;
  /** Key of an icon in the app icon map, e.g. "wifi". */
  icon: string;
  sort_order: number;
};

export type PropertyAmenityRow = {
  property_id: string;
  amenity_id: number;
};

export type PropertyAmenityInsert = Pick<PropertyAmenityRow, 'property_id' | 'amenity_id'>;

export type SavedPropertyRow = {
  user_id: string;
  property_id: string;
  created_at: string;
};

export type SavedPropertyInsert = Pick<SavedPropertyRow, 'user_id' | 'property_id'> &
  Partial<Omit<SavedPropertyRow, 'user_id' | 'property_id'>>;

export type SavedRoommateProfileRow = {
  user_id: string;
  roommate_profile_id: string;
  created_at: string;
};

export type SavedRoommateProfileInsert = Pick<
  SavedRoommateProfileRow,
  'user_id' | 'roommate_profile_id'
> &
  Partial<Omit<SavedRoommateProfileRow, 'user_id' | 'roommate_profile_id'>>;

export type BookingRow = {
  id: string;
  property_id: string;
  requester_id: string;
  landlord_id: string;
  kind: BookingKind;
  status: BookingStatus;
  scheduled_date: string;
  scheduled_time: string;
  reschedule_date: string | null;
  reschedule_time: string | null;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  /** One-shot note supplied on the form. Not a conversation. */
  note: string | null;
  move_in_date: string | null;
  occupants: number | null;
  rejection_reason: string | null;
  decided_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

/** `landlord_id` is filled in by the database, never by the client. */
export type BookingInsert = Pick<BookingRow, 'property_id' | 'requester_id' | 'kind'> &
  Partial<Omit<BookingRow, 'property_id' | 'requester_id' | 'kind'>>;

export type BookingUpdate = Partial<
  Pick<
    BookingRow,
    | 'status'
    | 'rejection_reason'
    | 'decided_at'
    | 'cancelled_at'
    | 'scheduled_date'
    | 'scheduled_time'
    | 'reschedule_date'
    | 'reschedule_time'
    | 'note'
    | 'contact_name'
    | 'contact_phone'
    | 'contact_email'
    | 'move_in_date'
    | 'occupants'
  >
>;

export type RoommateProfileRow = {
  id: string;
  user_id: string;
  headline: string | null;
  about: string | null;
  occupation: string | null;
  budget_min: number | null;
  budget_max: number | null;
  preferred_city: string | null;
  preferred_barangay: string | null;
  move_in_date: string | null;
  /** 1 = spotless, 5 = relaxed. */
  cleanliness: number;
  smoking_preference: 'non_smoker' | 'smoker' | 'no_preference';
  drinking_preference: 'non_drinker' | 'social' | 'no_preference';
  pets_preference: 'love_pets' | 'no_pets' | 'no_preference';
  guests_preference: 'few_guests' | 'no_guests' | 'no_preference';
  study_habits: 'quiet_study' | 'study_together' | 'no_preference';
  sleep_schedule: 'early_bird' | 'night_owl' | 'flexible';
  is_active: boolean;
  /** Master switch for appearing in other people's results. */
  discoverable: boolean;
  share_budget: boolean;
  share_location: boolean;
  share_move_in_date: boolean;
  share_lifestyle: boolean;
  share_occupation: boolean;
  created_at: string;
  updated_at: string;
};

export type RoommateProfileInsert = Pick<RoommateProfileRow, 'user_id'> &
  Partial<Omit<RoommateProfileRow, 'user_id'>>;

export type RoommateProfileUpdate = Partial<Omit<RoommateProfileInsert, 'id' | 'user_id'>>;

export type RoommateRequestRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: RoommateRequestStatus;
  /** Short intro supplied at send time. Not a conversation. */
  message: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RoommateRequestInsert = Pick<RoommateRequestRow, 'sender_id' | 'receiver_id'> &
  Partial<Omit<RoommateRequestRow, 'sender_id' | 'receiver_id'>>;

export type RoommateRequestUpdate = Partial<
  Pick<RoommateRequestRow, 'status' | 'responded_at' | 'message'>
>;

export type VerificationRequestRow = {
  id: string;
  landlord_id: string;
  status: VerificationStatus;
  full_legal_name: string;
  /** Residential address supplied for review. */
  address: string;
  id_type: 'philippine_id' | 'passport' | 'drivers_license' | 'other';
  /**
   * Last four characters only. Full ID numbers must never be stored.
   * Document images live in a private bucket and are never publicly readable.
   */
  id_number_last4: string;
  document_storage_path: string | null;
  submitted_notes: string | null;
  reviewer_id: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type VerificationRequestInsert = Pick<VerificationRequestRow, 'landlord_id'> &
  Partial<Omit<VerificationRequestRow, 'landlord_id'>>;

export type NotificationRow = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export type NotificationInsert = Pick<NotificationRow, 'user_id' | 'type' | 'title' | 'body'> &
  Partial<Omit<NotificationRow, 'user_id' | 'type' | 'title' | 'body'>>;

export type NotificationUpdate = Partial<Pick<NotificationRow, 'read_at'>>;

export type PushTokenRow = {
  id: string;
  user_id: string;
  token: string;
  platform: 'ios' | 'android' | 'web' | 'unknown';
  created_at: string;
};

export type PushTokenInsert = Pick<PushTokenRow, 'user_id' | 'token' | 'platform'> &
  Partial<Omit<PushTokenRow, 'user_id' | 'token' | 'platform'>>;

export type PushTokenUpdate = Partial<Pick<PushTokenRow, 'token' | 'platform'>>;

export type PropertyViewRow = {
  id: number;
  property_id: string;
  viewer_id: string | null;
  viewed_at: string;
};

export type AdminUserRow = {
  user_id: string;
  created_at: string;
};

export type AdminUserInsert = Pick<AdminUserRow, 'user_id'>;

/* ------------------------------------------------------------------ */
/* RPC payload shapes                                                   */
/* ------------------------------------------------------------------ */

export type PropertySearchArgs = {
  p_search?: string | null;
  p_city?: string | null;
  p_barangay?: string | null;
  p_min_price?: number | null;
  p_max_price?: number | null;
  p_property_types?: PropertyType[] | null;
  p_amenity_ids?: number[] | null;
  p_available_only?: boolean | null;
  p_near_latitude?: number | null;
  p_near_longitude?: number | null;
  p_near_name?: string | null;
  p_max_distance_km?: number | null;
  p_landlord_id?: string | null;
  p_include_drafts?: boolean | null;
  p_sort?: 'recent' | 'price_asc' | 'price_desc' | 'distance' | null;
  p_limit?: number | null;
  p_offset?: number | null;
};

export type PropertySearchResult = {
  id: string;
  title: string;
  property_type: PropertyType;
  monthly_rent: number;
  advance_amount: number;
  city: string;
  barangay: string;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  total_units: number;
  occupied_units: number;
  status: PropertyStatus;
  is_featured: boolean;
  view_count: number;
  created_at: string;
  landlord_id: string;
  landlord_name: string;
  landlord_verified: boolean;
  landlord_avatar_url: string | null;
  cover_image_path: string | null;
  cover_is_uploaded: boolean;
  amenity_ids: number[];
  amenities: { id: number; slug: string; label: string; icon: string }[];
  /** Null when no reference point was supplied. Never a fabricated value. */
  distance_km: number | null;
  distance_source: 'straightline' | 'routes' | null;
  available_units: number;
};

export type LandlordDashboardStats = {
  total_listings: number;
  published_listings: number;
  draft_listings: number;
  occupied_listings: number;
  total_units: number;
  available_units: number;
  occupied_units: number;
  pending_bookings: number;
  approved_bookings: number;
  rejected_bookings: number;
  cancelled_bookings: number;
  total_views: number;
  pending_verification: boolean;
  verification_status: VerificationStatus;
};

export type RoommateSearchArgs = {
  p_query?: string | null;
  p_city?: string | null;
  p_max_budget?: number | null;
  p_min_budget?: number | null;
  p_move_in_before?: string | null;
  /** Narrows to one person for the detail screen; still consent-gated. */
  p_user_id?: string | null;
  p_limit?: number | null;
  p_offset?: number | null;
};

export type RoommateMatchResult = {
  roommate_profile_id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  headline: string | null;
  about: string | null;
  occupation: string | null;
  budget_min: number | null;
  budget_max: number | null;
  preferred_city: string | null;
  preferred_barangay: string | null;
  move_in_date: string | null;
  cleanliness: number | null;
  smoking_preference: string | null;
  drinking_preference: string | null;
  pets_preference: string | null;
  guests_preference: string | null;
  study_habits: string | null;
  sleep_schedule: string | null;
  compatibility_score: number;
  /** Human readable, derived from fields both people agreed to share. */
  match_reasons: { label: string; detail: string; kind: 'match' | 'near' | 'difference' }[];
  request_status: RoommateRequestStatus | null;
  is_saved: boolean;
};