from datetime import datetime, timedelta
import random
import os

# =============================================================================
# SCRIPT DE GENERACIÓN DE DATOS DE PRUEBA (SQL)
# =============================================================================
# Propósito: Generar automáticamente el archivo `init.sql` con datos 
# ficticios pero realistas para la startup de Inteligencia Artificial.
# Contiene: 
# - Tabla `products`: Catálogo de productos/modelos AI.
# - Tabla `daily_revenue_log`: Histórico de ingresos de los últimos 30 días.
# =============================================================================

# Constantes de configuración de negocio
NUM_PRODUCTOS = 2000
DIAS_HISTORICO = 30
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(BASE_DIR, 'seed.sql')

categories = [
    ("Natural Language Processing", "chatbot, nlp, analisis de sentimiento, llm", [
        "Motor LLM ligero para soporte conversacional y análisis de texto.",
        "Procesador de lenguaje natural optimizado para alta concurrencia.",
        "Agente conversacional predictivo para empresas."
    ]), 
    ("Computer Vision", "ocr, dnn, vision artificial, deteccion de objetos", [
        "Modelo optimizado para reconocimiento facial y análisis térmico.",
        "Sistema de visión por computadora para control de calidad.",
        "Motor de inferencia visual en tiempo real para drones."
    ]), 
    ("Data Analytics", "forecasting, data analytics, predictive", [
        "Plataforma de forecasting predictivo para finanzas.",
        "Motor de análisis de series temporales y detección de anomalías.",
        "Sistema de inteligencia de negocios basado en machine learning."
    ]), 
    ("AI Audio", "tts, audio, speech to text, asr", [
        "Sintetizador de voz neural con latencia ultra baja.",
        "Transcriptor ASR (Automatic Speech Recognition) para reuniones.",
        "Filtro de audio basado en IA para cancelación de ruido."
    ])
]

# Prefijos y sufijos para generar nombres atractivos de productos tecnológicos
prefixes = ["Neural", "Opti", "Quantum", "Data", "Chat", "Vision", "Voice", "Deep", "Cogni", "Smart", "Auto"]
nuclei = ["Mind", "Logic", "Flow", "Sync", "Stream", "Graph", "Net", "Pulse", "Core", "Brain"]
suffixes = ["Pro", "v2.0", "Enterprise", "Lite", "Max", "Edge", "Cloud", "Nexus", "", "Plus"]

# =============================================================================
# 1. GENERACIÓN DE DATOS MASIVOS: PRODUCTS (SIN CREAR TABLAS)
# =============================================================================
sql = "-- === ESTE FICHERO FUE GENERADO AUTOMÁTICAMENTE PARA CARGA MUY PESADA ===\n\n"

# Solo insertamos en la tabla ya definida en 'schema.sql'
sql += "INSERT INTO products (serial_id, nombre, descripcion, categoria, precio, seo_tags, estado_desarrollo, coste_computo_usd, revenue) VALUES\n"

values = []
product_states = []

# Contadores para secuenciar los códigos (Ej. CV-100, NLP-101)
cat_counters = {
    "Natural Language Processing": 100,
    "Computer Vision": 100,
    "Data Analytics": 100,
    "AI Audio": 100
}

def get_initials(category):
    """
    Función que devuelve las iniciales de una categoría.
    Ejemplo: 'Natural Language Processing' -> 'NLP'
    """
    words = category.split()
    return "".join([w[0].upper() for w in words])

print(f"Generando {NUM_PRODUCTOS} productos...")

# Bucle principal: Creación de cada producto con lógica relacional y de viabilidad económica ficticia.
for _ in range(NUM_PRODUCTOS):
    # Selección aleatoria de la familia de categoría
    cat_tuple = random.choice(categories)
    c, t, desc_list = cat_tuple  # Categoría, Tags(SEO), Descripciones 
    
    # Generar el identificador interno del negocio
    serial_id = f"{get_initials(c)}-{cat_counters[c]}"
    cat_counters[c] += 1
    
    # Nombre comercial combinando prefijos, núcleos y sufijos tecnológicos
    n = f"{random.choice(prefixes)}{random.choice(nuclei)} {random.choice(suffixes)}".strip()
    
    # Selección y especificación base
    desc = random.choice(desc_list)
    price = round(random.uniform(4.99, 49.99), 2)
    
    # Probabilidad de asignación del estado de desarrollo (80% Productos exitosos/públicos, 20% En pruebas de I+D)
    estado = random.choices(['EN_PRODUCCION', 'BETA_INTERNA', 'I+D'], weights=[0.8, 0.1, 0.1])[0]
    product_states.append(estado)  # Se almacena para su uso en la tabla 'daily_revenue_log' a posteriori
    
    # =============================================================================
    # LÓGICA DE NEGOCIO FICTICIA (INGRESOS / COSTES MES A MES)
    # =============================================================================
    if estado == 'EN_PRODUCCION':
        # Hay un 5% de que un producto sea líder o "super-estrella" y devuelva un ROI (Retorno) increíble:
        if random.random() < 0.05:
            # Bajo gasto de servidores con un gran volumen de compras
            coste_computo_usd = round(random.uniform(price * 0.1, price * 0.3), 2)
            revenue = round(random.uniform(price * 1.0, price * 2.4), 2)
        else:
            # Si no es líder, sufre la crudeza normal de la industria del SaaS (Rango Pyme de ganancia limitada)
            coste_computo_usd = round(random.uniform(price * 0.16, price * 0.5), 2)
            revenue = round(random.uniform(price * 0.24, price * 0.7), 2)
    else:
        # En las etapas I+D y BETA el coste de entrenamiento es alto porque los modelos son glotones y nadie lo ha comprado (Revenue: 0$)
        coste_computo_usd = round(random.uniform(price * 0.3, price * 1.6), 2)
        revenue = 0

    # Inyección a lista de batch para queries grandes
    # Uso de la interpolación f-string directa (recordad escapar las cadenas correctamente con '')
    values.append(f"('{serial_id}', '{n}', '{desc}', '{c}', {price}, '{t}', '{estado}', {coste_computo_usd}, {revenue})")

# Unificamos el batch y cerramos la tabla 1
sql += ",\n".join(values) + ";\n\n"

# =============================================================================
# 2. GENERACIÓN DE DATOS (HISTÓRICO MASIVO)
# =============================================================================
# Propósito: Evaluar series temporales de ingresos en los ultimos X días (30 por defecto).
# Necesaria en la Lambdas (SSR) para obtener el Crecimiento Week-Over-Week.
sql += """
-- Generación histórica (Inserciones) \n
"""

# Inicializamos estructura de control para el histórico
log_values = []
start_date = datetime.now() - timedelta(days=DIAS_HISTORICO)

print(f"Generando histórico de facturación de {DIAS_HISTORICO} días...")

# Recorremos todos los elementos y según su estado generamos ingresos diarios "caminantes" aleatorios
for i, estado in enumerate(product_states, start=1):
    # Condición Crítica: Sólo los productos en "EN_PRODUCCION" pueden tener facturación
    if estado == 'EN_PRODUCCION':
        # Se escoge al azar un ingreso de base de arranque para el "Día Uno"
        base_daily = round(random.uniform(10.0, 100.0), 2)
        
        # En cada ciclo de día que se va sumando a los 30 Días base:
        for day_offset in range(DIAS_HISTORICO):
            current_date = (start_date + timedelta(days=day_offset)).strftime('%Y-%m-%d')
            
            # (Random Walk Simulation) Se introduce una volatilidad con impacto máximo/mínimo diario 
            # de un +/-5% (mínimo) a un +10% (Subidas moderadas) simulando mercado
            base_daily = base_daily * random.uniform(0.95, 1.10)
            daily_rev = round(base_daily, 2)
            log_values.append(f"({i}, '{current_date}', {daily_rev})")

# =============================================================================
# 3. CONSOLIDACIÓN FINAL E INSERCIONES GRANDES (BATCHING)
# =============================================================================
# Agrupamos e inertamos los miles de campos generados aleatoriamente en el archivo. 
chunk_size = 5000
for idx in range(0, len(log_values), chunk_size):
    chunk = log_values[idx:idx+chunk_size]
    sql += "INSERT INTO daily_revenue_log (product_id, log_date, daily_revenue) VALUES\n" + ",\n".join(chunk) + ";\n"

# Escribe en la ruta el Fichero Final 
with open(OUTPUT_FILE, 'w') as f:
    f.write(sql)

print(f"✅ ¡Operación Finalizada! Generado archivo '{OUTPUT_FILE}'.")
