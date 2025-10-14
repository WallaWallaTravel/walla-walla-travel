-- Add 3 Mercedes Sprinter vans
INSERT INTO vehicles (vehicle_number, make, model, year, vin, license_plate, capacity, vehicle_type, is_active) VALUES
('Sprinter 1', 'Mercedes-Benz', 'Sprinter', 2025, 'VIN_PLACEHOLDER_1', 'PLATE_1', 11, 'passenger_van', true),
('Sprinter 2', 'Mercedes-Benz', 'Sprinter', 2025, 'VIN_PLACEHOLDER_2', 'PLATE_2', 14, 'passenger_van', true),
('Sprinter 3', 'Mercedes-Benz', 'Sprinter', 2025, 'VIN_PLACEHOLDER_3', 'PLATE_3', 14, 'passenger_van', true)
ON CONFLICT DO NOTHING;
