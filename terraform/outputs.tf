output "resource_group_name" {
  description = "Resource group containing all demo resources."
  value       = azurerm_resource_group.main.name
}

output "acr_login_server" {
  description = "ACR login server (use this as the registry host for docker push)."
  value       = azurerm_container_registry.main.login_server
}

output "acr_name" {
  description = "ACR name (use with: az acr build / az acr login)."
  value       = azurerm_container_registry.main.name
}

output "webapp_name" {
  description = "Name of the Linux web app."
  value       = azurerm_linux_web_app.main.name
}

output "webapp_url" {
  description = "Public URL of the deployed web app."
  value       = "https://${azurerm_linux_web_app.main.default_hostname}"
}
