-- Add multi_day_wine, birthday, and other to trip_type check constraint
ALTER TABLE trip_proposals DROP CONSTRAINT IF EXISTS trip_proposals_trip_type_check;
ALTER TABLE trip_proposals ADD CONSTRAINT trip_proposals_trip_type_check
  CHECK (trip_type IN ('wine_tour', 'wine_group', 'multi_day_wine', 'celebration', 'corporate', 'wedding', 'anniversary', 'family', 'romantic', 'birthday', 'custom', 'other'));
