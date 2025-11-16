resource "azurerm_resource_group" "email" {
  name     = var.resource_group_name
  location = var.resource_group_location
  tags     = var.tags
}

resource "azurerm_communication_service" "email" {
  name                = var.communication_service_name
  resource_group_name = azurerm_resource_group.email.name
  data_location       = var.communication_service_data_location
  tags                = var.tags
}

resource "azurerm_email_communication_service" "email" {
  name                = var.email_service_name
  resource_group_name = azurerm_resource_group.email.name
  data_location       = var.email_service_data_location
  tags                = var.tags
}

resource "azurerm_email_communication_service_domain" "managed" {
  name              = var.email_domain_name
  email_service_id  = azurerm_email_communication_service.email.id
  domain_management = "AzureManaged"
  tags              = var.tags
}
