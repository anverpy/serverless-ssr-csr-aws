#!/usr/bin/env bash
# deployment with SAM / CloudFormation on LocalStack

set -euo pipefail

# ─── Config ──────────────────────────
REGION="us-east-1"
STAGE="dev"
LS_ENDPOINT="http://localhost:4566"
BUCKET_NAME="csr-app"
STACK_NAME="ssr-csr-stack"

# 0. Parse Arguments
DEPLOY_ALL=true
DEPLOY_SQL=false
DEPLOY_INFRA=false
DEPLOY_FRONTEND=false
DEPLOY_BACKEND=false

if [ $# -gt 0 ]; then
  DEPLOY_ALL=false
  for arg in "$@"; do
    case $arg in
      --sql) DEPLOY_SQL=true ;;
      --sql-seed) DEPLOY_SQL=true; SEED_DB=true ;;
      --infra) DEPLOY_INFRA=true ;;
      --frontend) DEPLOY_FRONTEND=true ;;
      --backend) DEPLOY_BACKEND=true ;;
      --all) DEPLOY_ALL=true ;;
      -h|--help)
        echo "Usage: ./deploy-cf.sh [options]"
        echo "Options:"
        echo "  --all       Deploy DB, Infra, Lambdas, and React CSR (default)"
        echo "  --sql       Load DB schema and basic seed data (fast)"
        echo "  --sql-seed  Load schema and generate massive seed data (50k+ rows)"
        echo "  --infra     Deploy AWS infrastructure (CloudFormation)"
        echo "  --frontend  Build and deploy React CSR to S3"
        echo "  --backend   Fast deploy for Lambda functions direct update"
        exit 0
        ;;
    esac
  done
fi

if [ "$DEPLOY_ALL" = true ]; then
  DEPLOY_SQL=true
  DEPLOY_INFRA=true
  DEPLOY_FRONTEND=true
  DEPLOY_BACKEND=false
fi

# Activate venv for awslocal (si es necesario según tu máquina)
echo "▶ Setting up awslocal command..."
# source venv/bin/activate  # <-- Puedes descomentar/cambiar esto según tu configuración de Python

if [ "$DEPLOY_SQL" = true ]; then
  echo "▶ [SQL] Creando esquema de Base de Datos..."
  cat db/schema.sql | docker exec -i postgres-db psql -U admin -d products_db -q

  if [ "${SEED_DB:-false}" = "true" ]; then
    echo "▶ [SQL-SEED] Generando e inyectando datos masivos (~50,000 logs)..."
    python3 db/generate_init_sql.py
    cat db/seed.sql | docker exec -i postgres-db psql -U admin -d products_db -q
    echo "✔ Base de datos masiva inicializada."
  else
    echo "▶ [SQL-BASIC] Inyectando datos de prueba ligeros..."
    cat db/seed_basico.sql | docker exec -i postgres-db psql -U admin -d products_db -q
    echo "✔ Base de datos ligera inicializada."
  fi
fi

if [ "$DEPLOY_INFRA" = true ]; then
  echo "▶ [INFRA] Deploying AWS Infrastructure via CloudFormation..."
  cp shared/db-queries.js lambda-api/
  cp shared/db-queries.js lambda-ssr/
  (cd lambda-api && npm install --silent)
  (cd lambda-ssr && npm install --silent)

  awslocal s3 mb s3://sam-artifacts 2>/dev/null || true

  # Bug en awscli-local interfiere pasándole --s3-endpoint-url a cloudformation package, usamos aws directo por seguridad
  AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_DEFAULT_REGION="$REGION" AWS_ENDPOINT_URL="${LS_ENDPOINT}" aws cloudformation package \
    --template-file template.yaml \
    --s3-bucket "sam-artifacts" \
    --output-template-file packaged.yaml >/dev/null

  AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_DEFAULT_REGION="$REGION" AWS_ENDPOINT_URL="${LS_ENDPOINT}" aws cloudformation deploy \
    --template-file packaged.yaml \
    --stack-name "$STACK_NAME" \
    --capabilities CAPABILITY_IAM \
    --region "$REGION" >/dev/null
  echo "✔ Infraestructura CloudFormation lista."
fi

# Load updated config
if [ "$DEPLOY_INFRA" = true ] || [ "$DEPLOY_FRONTEND" = true ]; then
  API_ID=$(awslocal cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='ApiId'].OutputValue" \
    --output text 2>/dev/null || echo "PLACEHOLDER")

  cat > .localstack-config.json << CONFIG_EOF
{
  "apiId": "${API_ID}",
  "stage": "${STAGE}",
  "bucket": "${BUCKET_NAME}",
  "port": "4566"
}
CONFIG_EOF

else
  if [ -f .localstack-config.json ]; then
    API_ID=$(grep -o '"apiId": "[^"]*' .localstack-config.json | cut -d'"' -f4)
  else
    API_ID="PLACEHOLDER"
  fi
fi

if [ "$DEPLOY_BACKEND" = true ]; then
  echo "▶ [BACKEND] Fast Deploy: Actualizando código de las Lambdas directamente..."
  cp shared/db-queries.js lambda-api/
  cp shared/db-queries.js lambda-ssr/
  (cd lambda-api && zip -qr function.zip index.js db-queries.js package.json node_modules && awslocal lambda update-function-code --function-name lambda-api --zip-file fileb://function.zip >/dev/null && rm function.zip)
  (cd lambda-ssr && zip -qr function.zip index.js db-queries.js package.json node_modules && awslocal lambda update-function-code --function-name productos-ssr --zip-file fileb://function.zip >/dev/null && rm function.zip)
  echo "✔ Lambdas actualizadas."
fi

if [ "$DEPLOY_FRONTEND" = true ]; then
  echo "▶ [FRONTEND] Building React App..."
  cd csr-app
  if [ ! -d "node_modules" ]; then
    npm install --silent
  fi
  VITE_API_URL="${LS_ENDPOINT}/restapis/${API_ID}/${STAGE}/_user_request_/api/products" npm run build --silent
  cd ..

  echo "▶ [FRONTEND] Uploading CSR App to S3..."
  awslocal s3 sync csr-app/dist/ "s3://${BUCKET_NAME}/" \
    --region "$REGION" \
    --exclude "*" \
    --include "*.html" \
    --content-type "text/html" \
    --quiet

  awslocal s3 sync csr-app/dist/ "s3://${BUCKET_NAME}/" \
    --region "$REGION" \
    --exclude "*.html" \
    --quiet
  echo "✔ Frontend subido a S3."
fi

echo "✅ Listo!"
echo ""
echo "Endpoints:"
echo " SERVER | SSR -> ${LS_ENDPOINT}/restapis/${API_ID}/${STAGE}/_user_request_/ssr"
echo " API -> ${LS_ENDPOINT}/restapis/${API_ID}/${STAGE}/_user_request_/api/products"
echo " API | CSR -> ${LS_ENDPOINT}/${BUCKET_NAME}/index.html"
