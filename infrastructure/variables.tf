variable "resource_group_name" {
  description = "Name of the resource group that will host the email communication service resources."
  type        = string
  default     = "rg-email-communication"
}

variable "resource_group_location" {
  description = "Azure region for the resource group."
  type        = string
  default     = "westeurope"
}

variable "communication_service_name" {
  description = "Name of the Azure Communication Service instance."
  type        = string
  default     = "zpi-uniorg-communication-service"
}

variable "communication_service_data_location" {
  description = "Data location for the Azure Communication Service (must be a supported ACS data location)."
  type        = string
  default     = "Europe"
}

variable "email_service_name" {
  description = "Name of the Email Communication Service instance."
  type        = string
  default     = "zpi-uniorg-email-service"
}

variable "email_service_data_location" {
  description = "Data location for the Email Communication Service (must be a supported Email Communication data location)."
  type        = string
  default     = "Europe"
}

variable "email_domain_name" {
  description = "Name of the email domain resource. Use AzureManagedDomain when provisioning an Azure-managed domain."
  type        = string
  default     = "AzureManagedDomain"
}

variable "tags" {
  description = "Common tags applied to all provisioned resources."
  type        = map(string)
  default = {
    environment = "dev"
    managed_by  = "terraform"
  }
}
