terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features {}

  # Optionally set via env var ARM_SUBSCRIPTION_ID or here through var.subscription_id.
  subscription_id = var.subscription_id != "" ? var.subscription_id : null
}
