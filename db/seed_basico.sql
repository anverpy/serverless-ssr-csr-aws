-- === DATOS LIGEROS DE PRUEBA (DESARROLLO RÁPIDO) ===

INSERT INTO products (serial_id, nombre, descripcion, categoria, precio, seo_tags, estado_desarrollo, coste_computo_usd, revenue) VALUES
('NLP-100', 'NeuralLogic Pro', 'Motor LLM ligero para soporte conversacional y análisis de texto.', 'Natural Language Processing', 29.99, 'chatbot, nlp, analisis de sentimiento, llm', 'EN_PRODUCCION', 5.00, 35.00),
('CV-101', 'OptiVision v2.0', 'Sistema de visión por computadora para control de calidad.', 'Computer Vision', 49.99, 'ocr, dnn, vision artificial, deteccion de objetos', 'EN_PRODUCCION', 15.50, 60.00),
('DA-102', 'DataFlow Enterprise', 'Plataforma de forecasting predictivo para finanzas.', 'Data Analytics', 39.50, 'forecasting, data analytics, predictive', 'BETA_INTERNA', 20.00, 0.00);

-- Algunos datos históricos para NLP-100 (product_id = 1)
INSERT INTO daily_revenue_log (product_id, log_date, daily_revenue) VALUES
(1, CURRENT_DATE - INTERVAL '3 days', 15.00),
(1, CURRENT_DATE - INTERVAL '2 days', 18.50),
(1, CURRENT_DATE - INTERVAL '1 day',  22.00),
(1, CURRENT_DATE,  25.00);

-- Algunos datos históricos para CV-101 (product_id = 2)
INSERT INTO daily_revenue_log (product_id, log_date, daily_revenue) VALUES
(2, CURRENT_DATE - INTERVAL '3 days', 40.00),
(2, CURRENT_DATE - INTERVAL '2 days', 45.00),
(2, CURRENT_DATE - INTERVAL '1 day',  42.00),
(2, CURRENT_DATE,  50.00);