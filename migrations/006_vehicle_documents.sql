-- Create vehicle_documents table
CREATE TABLE IF NOT EXISTS vehicle_documents (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  document_name VARCHAR(200) NOT NULL,
  document_url TEXT,
  expiry_date DATE,
  is_active BOOLEAN DEFAULT true,
  uploaded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_vehicle_documents_vehicle_id ON vehicle_documents(vehicle_id);
CREATE INDEX idx_vehicle_documents_type ON vehicle_documents(document_type);
CREATE INDEX idx_vehicle_documents_active ON vehicle_documents(is_active);

-- Insert sample documents for existing vehicles
INSERT INTO vehicle_documents (vehicle_id, document_type, document_name, document_url, expiry_date) 
SELECT 
  id,
  'registration',
  'Vehicle Registration - ' || vehicle_number,
  'https://wallawalla.travel/docs/registration-' || LOWER(REPLACE(vehicle_number, ' ', '-')) || '.pdf',
  '2025-12-31'::DATE
FROM vehicles
WHERE is_active = true;

INSERT INTO vehicle_documents (vehicle_id, document_type, document_name, document_url, expiry_date) 
SELECT 
  id,
  'insurance',
  'Insurance Certificate - ' || vehicle_number,
  'https://wallawalla.travel/docs/insurance-' || LOWER(REPLACE(vehicle_number, ' ', '-')) || '.pdf',
  '2025-06-30'::DATE
FROM vehicles
WHERE is_active = true;

INSERT INTO vehicle_documents (vehicle_id, document_type, document_name, document_url) 
SELECT 
  id,
  'inspection',
  'Last DOT Inspection - ' || vehicle_number,
  'https://wallawalla.travel/docs/inspection-' || LOWER(REPLACE(vehicle_number, ' ', '-')) || '.pdf'
FROM vehicles
WHERE is_active = true;

INSERT INTO vehicle_documents (vehicle_id, document_type, document_name, document_url) 
SELECT 
  id,
  'maintenance',
  'Maintenance History - ' || vehicle_number,
  'https://wallawalla.travel/docs/maintenance-' || LOWER(REPLACE(vehicle_number, ' ', '-')) || '.pdf'
FROM vehicles
WHERE is_active = true;