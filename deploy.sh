#!/bin/bash
set -e
# Local Azure CLI deploy helper
# Usage: ./deploy.sh <app-name> <resource-group>
# Requires: az login + secrets configured
APP_NAME=${1:-$AZURE_WEBAPP_NAME}
RESOURCE_GROUP=${2:-$AZURE_RESOURCE_GROUP}
if [ -z "$APP_NAME" ]; then
  echo "Usage: ./deploy.sh <app-name> <resource-group>"
  echo " or set env AZURE_WEBAPP_NAME / AZURE_RESOURCE_GROUP"
  echo ""
  echo "If you haven't created the Web App yet, run:"
  echo "  az group create -n <rg> -l eastus"
  echo "  az appservice plan create -g <rg> -n fantasy-plan --sku B1 --is-linux"
  echo "  az webapp create -g <rg> -p fantasy-plan -n <app-name> --runtime 'NODE:20-lts'"
  echo "  az webapp config set -g <rg> -n <app-name> --startup-file 'npm start'"
  echo "  az webapp config appsettings set -g <rg> -n <app-name> --settings SCM_DO_BUILD_DURING_DEPLOYMENT=true WEBSITE_NODE_DEFAULT_VERSION=20-lts WEBSITE_RUN_FROM_PACKAGE=0"
  exit 1
fi

echo "Building..."
npm ci
npm run build

echo "Creating zip..."
rm -f fantasy-gm.zip
zip -r fantasy-gm.zip package.json package-lock.json server dist index.html -x "node_modules/*" ".git/*" >/dev/null
echo "Zip size: $(du -h fantasy-gm.zip | cut -f1)"

if [ -z "$RESOURCE_GROUP" ]; then
  echo "No resource group supplied, trying to infer from webapp..."
  RESOURCE_GROUP=$(az webapp show --name $APP_NAME --query resourceGroup -o tsv 2>/dev/null || echo "")
fi

if [ -z "$RESOURCE_GROUP" ]; then
  echo "Deploying without resource group (using publish profile)..."
  az webapp deployment source config-zip --name $APP_NAME --src fantasy-gm.zip
else
  echo "Deploying to $APP_NAME in $RESOURCE_GROUP..."
  az webapp deploy --name $APP_NAME --resource-group $RESOURCE_GROUP --src-path fantasy-gm.zip --type zip
fi

echo "Done. Tailing logs..."
az webapp log tail --name $APP_NAME ${RESOURCE_GROUP:+--resource-group $RESOURCE_GROUP} 2>&1 | head -n 50 || echo "Check: https://$APP_NAME.azurewebsites.net"
