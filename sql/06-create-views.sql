-- View: Current day status for all drivers
CREATE OR REPLACE VIEW current_driver_status AS
SELECT 
  u.id as driver_id,
  u.name as driver_name,
  u.email,
  tc.id as time_card_id,
  tc.date,
  tc.clock_in_time,
  tc.clock_out_time,
  tc.driving_hours,
  tc.on_duty_hours,
  tc.status,
  v.vehicle_number,
  v.capacity as vehicle_capacity,
  dt.max_air_miles,
  dt.exceeded_150_miles,
  CASE 
    WHEN tc.driving_hours >= 10 THEN 'Driving limit reached'
    WHEN tc.driving_hours >= 9 THEN 'Approaching 10hr limit'
    WHEN tc.on_duty_hours >= 15 THEN 'On-duty limit reached'
    WHEN tc.on_duty_hours >= 14 THEN 'Approaching 15hr limit'
    ELSE 'Within limits'
  END as hos_status
FROM users u
LEFT JOIN time_cards tc ON u.id = tc.driver_id AND tc.date = CURRENT_DATE
LEFT JOIN vehicles v ON tc.vehicle_id = v.id
LEFT JOIN daily_trips dt ON tc.id = dt.time_card_id
WHERE u.role = 'driver' AND u.is_active = true;

-- View: Monthly exemption dashboard
CREATE OR REPLACE VIEW monthly_exemption_dashboard AS
SELECT 
  u.id as driver_id,
  u.name as driver_name,
  mes.month_start_date,
  mes.days_exceeded_150_miles,
  mes.requires_eld,
  CASE
    WHEN mes.days_exceeded_150_miles >= 8 THEN 'ELD Required'
    WHEN mes.days_exceeded_150_miles >= 7 THEN '1 day remaining'
    WHEN mes.days_exceeded_150_miles >= 6 THEN '2 days remaining'
    ELSE 'Within exemption'
  END as exemption_status,
  8 - COALESCE(mes.days_exceeded_150_miles, 0) as days_remaining
FROM users u
LEFT JOIN monthly_exemption_status mes 
  ON u.id = mes.driver_id 
  AND mes.month_start_date = DATE_TRUNC('month', CURRENT_DATE)
WHERE u.role = 'driver' AND u.is_active = true;
