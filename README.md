# 🚀 Arquitectura Serverless: SSR y CSR con AWS Lambda y API Gateway
<img src="assets/arquitectura.png" width="100%"> 

[![AWS LocalStack](https://img.shields.io/badge/LocalStack-3.8.1-232F3E?logo=amazon-aws)](https://localstack.cloud/)
[![React](https://img.shields.io/badge/React-18.2.0-61DAFB?logo=react)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14.0-336791?logo=postgresql)](https://www.postgresql.org/)
[![AWS SAM](https://img.shields.io/badge/AWS_SAM-CloudFormation-FF9900?logo=aws-lambda)](https://aws.amazon.com/serverless/sam/)
[![Python](https://img.shields.io/badge/Python-3.14.3-3776AB?logo=python&logoColor=white)](https://www.python.org/)

Una plataforma empresarial full-stack basada en la nube para la gestión y análisis financiero de productos de Inteligencia Artificial.<br>Este proyecto implementa una arquitectura híbrida desacoplada utilizando **AWS LocalStack** y **CloudFormation (SAM)**.

## 📖 Descripción del Proyecto

- **CSR (Client-Side Rendering)**: Una Single Page Application (SPA) pública desarrollada en React/Vite y alojada en un bucket S3.
- **SSR (Server-Side Rendering)**: Un dashboard analítico del lado del servidor, generado dinámicamente desde AWS Lambda, optimizado para rendimiento, ejecutivos y web crawlers, con gráficos nativos inyectados en HTML.
- **REST API**: Una API exclusiva enfocada en procesar flujos de datos y filtros desde el frontend (CSR).

Todo el entorno se orquesta de manera local emulando servicios de AWS mediante LocalStack y desplegando la infraestructura a través de código (IaC).

## 🏗️ Arquitectura Híbrida

- **Infraestructura como Código (IaC)**: Totalmente centralizada en `template.yaml` usando AWS SAM (Serverless Application Model).
- **Frontend SPA (CSR)**: Aplicación React desplegada automáticamente en AWS S3.
- **Lambdas Desacopladas**:
  - `lambda-ssr`: Genera HTML estático pre-renderizado para operaciones analíticas pesadas.
  - `lambda-api`: Resuelve operaciones REST (JSON) para interactuar con la interfaz pública.
- **Base de Datos**: PostgreSQL diseñada para alta carga, manejando datos orgánicos de rendimiento y métricas financieras (revenue, computation cost) de los últimos 30 días (~48,000 registros).
- **Rutas y Gatillos**: API Gateway enruta eficientemente el tráfico hacia `/ssr` y `/api`. Módulos centralizados como `shared/db-queries.js` unifican las sentencias SQL.

## ⚙️ Stack Tecnológico

- **Frontend**: Impulsado con ![Google Gemini](https://img.shields.io/badge/Google%20Gemini-886FBF?logo=googlegemini&logoColor=fff), React, Vite. 
- **Backend / Serverless**: Node.js, ![AWS Lambda](https://custom-icon-badges.demolab.com/badge/AWS%20Lambda-%23FF9900.svg?logo=aws-lambda&logoColor=white), [![AWS](https://custom-icon-badges.demolab.com/badge/AWS-%23FF9900.svg?logo=aws&logoColor=white)](#) API Gateway
- **Infraestructura [![AWS](https://custom-icon-badges.demolab.com/badge/AWS-%23FF9900.svg?logo=aws&logoColor=white)](#) Local**: LocalStack, S3, CloudFormation / SAM
- **Base de datos**: [![Postgres](https://img.shields.io/badge/Postgres-%23316192.svg?logo=postgresql&logoColor=white)](#) SQL
- **Data Engineering**: [![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=fff)](#) scripts algorítmicos para la generación realista de histórico de ingresos y fluctuaciones del mercado.

## 🚀 Guía de Inicio Rápido

Sigue estos pasos para levantar el proyecto localmente:

1. **Activa tu entorno virtual** (necesario para tener disponibles comandos como `awslocal` de LocalStack):
   ```bash
   source venv/bin/activate
   ```

2. **Levanta los contenedores** (LocalStack y la Base de Datos).
   ```bash
   docker-compose up -d
   ```

3. **Despliega la Infraestructura y el Código** (Lambdas, API Gateway, Buckets):
   ```bash
   bash deploy-cf.sh
   ```

## 🔨 Comandos de Despliegue

- `deploy-cf.sh` por defecto carga la base de datos de prueba.

 
    **Base de datos de prueba** (sin recrear Lambdas, API Gateway y Buckets):
    ```bash
    --sql
    ```
    **Base de datos completa**:
    ```bash
    --sql-seed
    ```
    **Actualizar solo el Frontend CSR (S3)**:
    ```bash
    --frontend
    ```
    **Actualizar solo el Backend (Lambdas: SSR y API)**:
    ```bash
    --backend
    ```

## 📂 Estructura Principal del Proyecto

```text
.
├── 📁 csr-app/ & src/       # Código fuente de la SPA en React (Client-Side Rendering).
├── 📁 db/                   # Datos y estructura de inicialización de la Base de Datos
│   ├── 📄 schema.sql        # Archivo central y limpio con la estructura (DDL).
│   ├── 📄 seed_basico.sql   # Datos simulados ligeros por defecto para pruebas.
│   └── 📄 seed.sql          # Dataset de +50k registros.
├── 📁 lambda-api/           # Función Lambda encargada del procesamiento REST JSON.
├── 📁 lambda-ssr/           # Función Lambda encargada del Server-Side Rendering
                               (Dashboard Analítico).
├── 📁 scripts/              # Herramientas auxiliares operativas para testing y manipulación.
├── 📁 shared/               # Archivos compartidos entre las múltiples Lambdas
│   └── 📄 db-queries.js     # Archivo centralizado con las consultas SQL compartidas.
└── 📄 template.yaml         # Plantilla centralizada de IaC (Infrastructure as Code)
                               para CloudFormation.
```