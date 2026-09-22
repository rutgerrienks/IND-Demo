variable "subscription_id" {
  description = "Azure subscription ID. Leave empty to use the ARM_SUBSCRIPTION_ID env var or the az CLI default."
  type        = string
  default     = ""
}

variable "location" {
  description = "Azure region for all resources."
  type        = string
  default     = "westeurope"
}

variable "resource_group_name" {
  description = "Name of the resource group to create."
  type        = string
  default     = "rg-ind-demo"
}

variable "name_prefix" {
  description = "Short prefix used to build resource names (lowercase, alphanumeric)."
  type        = string
  default     = "inddemo"
}

variable "acr_sku" {
  description = "SKU for the Azure Container Registry."
  type        = string
  default     = "Basic"
}

variable "app_service_sku" {
  description = "SKU for the Linux App Service Plan (e.g. B1, S1, P1v3)."
  type        = string
  default     = "B1"
}

variable "image_name" {
  description = "Container image repository name in ACR."
  type        = string
  default     = "ind-demo-placeholder"
}

variable "image_tag" {
  description = "Container image tag to deploy."
  type        = string
  default     = "latest"
}

variable "app_settings" {
  description = "Extra app settings (environment variables) for the web app. Do not put secrets in version control."
  type        = map(string)
  default     = {}
}

variable "tags" {
  description = "Tags applied to all resources."
  type        = map(string)
  default = {
    project = "IND-Demo"
    env     = "demo"
  }
}
