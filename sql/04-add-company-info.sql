-- Insert company information
INSERT INTO company_info (company_name, usdot_number, base_name, base_city, base_state) 
VALUES ('Walla Walla Travel', '3603851', 'Walla Walla Travel Office', 'Walla Walla', 'WA')
ON CONFLICT DO NOTHING;
