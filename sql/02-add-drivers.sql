-- Add three drivers
INSERT INTO users (email, password_hash, name, role, is_active) VALUES
('owner@wallawallatravel.com', '$2a$10$placeholder', 'Owner', 'driver', true),
('eric@wallawallatravel.com', '$2a$10$placeholder', 'Eric Critchlow', 'driver', true),
('janine@wallawallatravel.com', '$2a$10$placeholder', 'Janine Bergevin', 'driver', true)
ON CONFLICT (email) DO NOTHING;
