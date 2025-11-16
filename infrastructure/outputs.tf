output "resource_group_id" {
  description = "ID of the resource group hosting the Email Communication Service resources."
  value       = azurerm_resource_group.email.id
}

output "communication_service_connection_string" {
  description = "Primary connection string for the Azure Communication Service instance."
  value       = azurerm_communication_service.email.primary_connection_string
  sensitive   = true
}

output "email_service_id" {
  description = "ID of the Email Communication Service resource."
  value       = azurerm_email_communication_service.email.id
}

output "email_domain_id" {
  description = "ID of the Azure-managed email domain resource."
  value       = azurerm_email_communication_service_domain.managed.id
}
