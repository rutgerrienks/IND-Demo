# Deploy — IND-Demo (Docker → ACR → Azure App Service)

Placeholder-app die via een container op **Azure App Service for Containers** draait.
Infra wordt met **Terraform** aangemaakt (Resource Group, ACR, App Service Plan, Linux Web App).

> Bewust **App Service** (geen Container Apps), conform projectregels.

## Vereisten
- Azure CLI (`az`), ingelogd: `az login`
- Docker (voor lokale build) of gebruik `az acr build` (bouwt in de cloud)
- Terraform >= 1.5

## 1. Infra aanmaken
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars   # pas eventueel waarden aan
terraform init
terraform apply
```
Noteer de outputs: `acr_name`, `acr_login_server`, `webapp_name`, `webapp_url`.

## 2. Image bouwen en naar ACR pushen
Optie A — bouwen in de cloud (geen lokale Docker nodig):
```bash
az acr build --registry <acr_name> --image ind-demo-placeholder:latest .
```

Optie B — lokaal bouwen en pushen:
```bash
az acr login --name <acr_name>
docker build -t <acr_login_server>/ind-demo-placeholder:latest .
docker push <acr_login_server>/ind-demo-placeholder:latest
```

## 3. Web app de nieuwe image laten oppakken
De web app pullt `ind-demo-placeholder:latest` uit ACR. Na een nieuwe push:
```bash
az webapp restart --name <webapp_name> --resource-group rg-ind-demo
```
Open daarna `webapp_url`.

## Lokaal draaien (zonder Azure)
```bash
cp .env.example .env   # vul lokale secrets in; .env blijft buiten version control
docker compose up --build   # http://localhost:8081
```

## Opruimen
```bash
cd terraform && terraform destroy
```

## Opmerkingen
- Authenticatie ACR → App Service loopt via **ACR admin-credentials** (eenvoud voor demo).
  Voor productie: overstappen op managed identity + `AcrPull`-roltoewijzing.
- Secrets (bijv. Azure OpenAI-sleutels) horen **niet** in version control; zet ze via
  `app_settings` in `terraform.tfvars` (gitignored) of via `az webapp config appsettings set`.
