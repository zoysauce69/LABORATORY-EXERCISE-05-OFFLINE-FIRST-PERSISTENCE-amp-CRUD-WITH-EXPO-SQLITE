-- =============================================================================
-- RoomLink 0004 — reference data
--
-- Amenity catalogue. These slugs are the contract with the mobile app:
-- src/constants/options.ts maps each slug to an icon, and the filter sheet is
-- built from this table so new amenities need no app release.
--
-- Idempotent: safe to re-run.
-- =============================================================================

insert into public.amenities (slug, label, icon, sort_order) values
  ('wifi',          'Wi-Fi',              'wifi',               10),
  ('air_conditioning','Air conditioning', 'snow',              20),
  ('parking',       'Parking',            'car',                30),
  ('laundry',       'Laundry',            'shirt',              40),
  ('kitchen',       'Kitchen',            'restaurant',         50),
  ('gym',           'Gym',                'barbell',            60),
  ('water',         'Water bill',         'water',              70),
  ('electricity',   'Electricity',        'flash',              80),
  ('internet',      'Fibre internet',     'globe',              90),
  ('pet_friendly',  'Pet friendly',       'paw',                100),
  ('security',      '24/7 security',      'shield-checkmark',   110),
  ('furnished',     'Furnished',          'bed',                120),
  ('balcony',       'Balcony',            'partly-sunny',       130),
  ('study_area',    'Study area',         'book',               140),
  ('elevator',      'Elevator',           'swap-vertical',      150),
  ('cctv',          'CCTV',               'videocam',           160),
  ('water_heater',  'Water heater',       'thermometer',        170),
  ('own_electric_meter','Own electric meter','speedometer',    180),
  ('flexible_terms','Flexible terms',     'calendar',           190)
on conflict (slug) do update
  set label = excluded.label,
      icon = excluded.icon,
      sort_order = excluded.sort_order;