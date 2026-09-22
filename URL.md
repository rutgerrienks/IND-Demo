# URL & toegang — IND-Demo

**Versie:** 1.26
**Deploy-datum:** 2026-08-20 22:03
**Subscription:** NL-TT-AZU-SBX-0001513 (`5785b050-ea92-4259-978b-410437073ed4`)

## Live app
- **URL:** https://inddemo-web-nfbguv.azurewebsites.net
- **Health:** https://inddemo-web-nfbguv.azurewebsites.net/healthz
- **Inhoud:** IND document review demo (upload, analyse, preview, export)

## Gotenberg
- **URL:** https://cvbuilder-gotenberg-87b234.azurewebsites.net
- **Gebruik:** PDF-preview voor geüploade `.docx`-documenten

## Login credentials
Niet opgenomen in deze publieke repository. Gebruik de lokaal beheerde demo-credentials
uit `.env` of een apart beveiligd overdrachtskanaal.

## Azure-resources
| Resource | Naam |
|----------|------|
| Resource group | `rg-ind-demo` (westeurope) |
| Container Registry | `inddemoacrnfbguv` (`inddemoacrnfbguv.azurecr.io`) |
| App Service Plan | `inddemo-plan` (Linux, B1) |
| Web App | `inddemo-web-nfbguv` |
| Image | `inddemoacrnfbguv.azurecr.io/ind-demo-placeholder:v1.1.13` |
| Azure OpenAI | `cvbuilder-openai-4e6046` (bestaand deployment uit `rg-cvbuilder-openai`) |

## ACR admin-credentials
De App Service pullt de image met de ACR **admin-credentials**. Ophalen met:
```bash
az acr credential show --name inddemoacrnfbguv
```
> Niet in version control zetten. Voor productie: managed identity + AcrPull.

## Nieuwe versie uitrollen
```bash
az acr build --registry inddemoacrnfbguv --image ind-demo-placeholder:v1.1.13 .
az webapp config container set --name inddemo-web-nfbguv --resource-group rg-ind-demo --container-image-name inddemoacrnfbguv.azurecr.io/ind-demo-placeholder:v1.1.13 --container-registry-url https://inddemoacrnfbguv.azurecr.io
az webapp restart --name inddemo-web-nfbguv --resource-group rg-ind-demo
```
