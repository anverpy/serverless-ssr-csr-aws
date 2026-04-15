#!/usr/bin/env bash

# open-urls.sh — Muestra y abre las URLs del proyecto en LocalStack

set -euo pipefail

BOLD='\033[1m'
RESET='\033[0m'
GREEN='\033[32m'
CYAN='\033[36m'

CONFIG_FILE=".localstack-config.json"

if [ ! -f "$CONFIG_FILE" ]; then
  echo -e "${BOLD}Error: No se encontró el archivo ${CONFIG_FILE}. Ejecuta deploy-cf.sh primero.${RESET}"
  exit 1
fi

API_ID=$(grep -o '"apiId": "[^"]*' "$CONFIG_FILE" | cut -d'"' -f4)
STAGE=$(grep -o '"stage": "[^"]*' "$CONFIG_FILE" | cut -d'"' -f4)

BUCKET=$(grep -o '"bucket": "[^"]*' "$CONFIG_FILE" | cut -d'"' -f4)

LS_ENDPOINT="http://localhost:4566"

SSR_ENDPOINT="${LS_ENDPOINT}/restapis/${API_ID}/${STAGE}/_user_request_/ssr"
API_ENDPOINT="${LS_ENDPOINT}/restapis/${API_ID}/${STAGE}/_user_request_/api/products"
CSR_ENDPOINT="${LS_ENDPOINT}/${BUCKET_NAME}/index.html"

echo -e "\n${BOLD}${CYAN}=== URLs de la Aplicación (LocalStack) ===${RESET}\n"

echo -e "  ${BOLD}1) CSR (React App en S3):${RESET}"
echo -e "     ${GREEN}${CSR_ENDPOINT}${RESET}"
echo -e "     (La aplicación cliente renderizada en tu navegador)"
echo ""

echo -e "  ${BOLD}2) SSR (Lambda pre-renderizada):${RESET}"
echo -e "     ${GREEN}${SSR_ENDPOINT}${RESET}"
echo -e "     (La versión HTML pura para los crawlers)"
echo ""

echo -e "  ${BOLD}3) API de Productos:${RESET}"
echo -e "     ${GREEN}${API_ENDPOINT}${RESET}"
echo -e "     (El backend que alimenta el CSR)"
echo ""

echo -e "${BOLD}${CYAN}==========================================${RESET}\n"

# Opción para abrir en Linux/Mac
if command -v xdg-open &> /dev/null; then
  echo "Abriendo CSR en tu navegador predeterminado..."
  xdg-open "$CSR_ENDPOINT"
elif command -v open &> /dev/null; then
  echo "Abriendo CSR en tu navegador predeterminado..."
  open "$CSR_ENDPOINT"
else
  echo "Haz Ctrl+Click en las URLs de arriba para abrirlas."
fi
