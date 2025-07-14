
-- Insert test vehicles for different categories
INSERT INTO public.vehicles (brand, model, year, color, license_number, vin, mileage, selling_price, status, location) VALUES
-- Online vehicles (voorraad)
('BMW', 'X5', 2023, 'Zwart', '1-ABC-123', 'WBAXXX123456789', 15000, 52000, 'voorraad', 'showroom'),
('Mercedes', 'E-Class', 2022, 'Zilver', '2-DEF-456', 'WDB2XXX987654321', 22000, 44000, 'voorraad', 'showroom'),
('Audi', 'A4', 2023, 'Wit', '3-GHI-789', 'WAUZZZ456789123', 8500, 41000, 'voorraad', 'showroom'),
('Volkswagen', 'Golf', 2022, 'Blauw', '4-JKL-012', 'WVWXXX789123456', 18000, 28000, 'voorraad', 'showroom'),

-- B2B sold vehicles
('Tesla', 'Model S', 2023, 'Rood', '5-MNO-345', '5YJ3E1XX789123456', 5000, 85000, 'verkocht_b2b', 'showroom'),
('Porsche', 'Cayenne', 2022, 'Grijs', '6-PQR-678', 'WP1XX456789123456', 12000, 75000, 'verkocht_b2b', 'showroom'),
('BMW', '5 Serie', 2023, 'Zwart', '7-STU-901', 'WBAXXX789456123', 8000, 58000, 'verkocht_b2b', 'showroom'),

-- B2C sold vehicles
('Toyota', 'Prius', 2022, 'Wit', '8-VWX-234', 'JTDXXX123789456', 25000, 32000, 'verkocht_b2c', 'showroom'),
('Honda', 'Civic', 2023, 'Groen', '9-YZA-567', 'JHMXXX456123789', 12000, 26000, 'verkocht_b2c', 'showroom'),
('Nissan', 'Qashqai', 2022, 'Blauw', '0-BCD-890', 'SJNXXX789456123', 19000, 35000, 'verkocht_b2c', 'showroom'),

-- Delivered vehicles (afgeleverd)
('Ford', 'Focus', 2021, 'Zilver', '1-EFG-123', 'WF0XXX123456789', 32000, 24000, 'afgeleverd', 'afgeleverd'),
('Opel', 'Astra', 2022, 'Rood', '2-HIJ-456', 'W0LXXX456789123', 28000, 22000, 'afgeleverd', 'afgeleverd'),
('Renault', 'Clio', 2021, 'Wit', '3-KLM-789', 'VF1XXX789123456', 35000, 18000, 'afgeleverd', 'afgeleverd'),

-- Transport vehicles (onderweg/niet aangekomen)
('Skoda', 'Octavia', 2023, 'Grijs', '4-NOP-012', 'TMBXXX012345678', 8000, 29000, 'voorraad', 'onderweg'),
('Seat', 'Leon', 2022, 'Zwart', '5-QRS-345', 'VSSXXX345678901', 15000, 25000, 'voorraad', 'onderweg'),
('Hyundai', 'i30', 2023, 'Blauw', '6-TUV-678', 'KMHXXX678901234', 6000, 27000, 'voorraad', 'onderweg');
