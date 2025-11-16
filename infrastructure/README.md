# Email Communication Service Infrastructure

This Terraform configuration provisions the Azure resources required for the Email Communication Service:

- Azure resource group
- Azure Communication Service (ACS)
- Email Communication Service bound to the ACS instance
- Azure-managed Email Communication Service domain

The project also uses an Azure Storage-backed Terraform state so the state file is stored centrally and remote locking is enabled automatically.

## Prerequisites
Link to azure cli installation: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-windows?view=azure-cli-latest&pivots=msi

- An Azure subscription with permissions to create resource groups, storage accounts, and Communication Service resources
- [Azure CLI](https://learn.microsoft.com/cli/azure).
  - Windows example: `winget install Microsoft.AzureCLI`
- [Terraform CLI](https://developer.hashicorp.com/terraform/downloads) 1.7.0 or newer.
  - Windows example: `choco install terraform`

## 1. Authenticate with Azure

```powershell
az login
```

## 2. Prepare the Remote State Backend

Create the resource group, storage account, and container that will hold the Terraform state. The storage account name must be globally unique.

```powershell
$stateRg="tfstate-rg"
$stateAccount="zpi-uniorg-tfstate"   # change to a unique name
$stateContainer="tfstate"

az group create --name $stateRg --location westeurope
az storage account create --name $stateAccount --resource-group $stateRg --sku Standard_LRS
az storage container create --name $stateContainer --account-name $stateAccount --auth-mode login
```

az account set --subscription 01cc67d7-d796-40ed-bd84-9abd1c18fc2d

Record the values; they will be passed to `terraform init`.

## 3. Configure Deployment Settings

Adjust the defaults in `variables.tf` or create a `terraform.tfvars` file in `infrastructure/`:

```hcl
resource_group_name                  = "rg-email-communication"
resource_group_location              = "westeurope"
communication_service_name           = "acs-email-prod"
communication_service_data_location  = "UnitedStates"
email_service_name                   = "email-service-prod"
email_service_data_location          = "UnitedStates"
email_domain_name                    = "AzureManagedDomain"
```

The `communication_service_data_location` value must be one of the supported ACS data locations (for example `UnitedStates`, `Europe`, `Asia`).

The email service uses the same set of geographic `data_location` values. When provisioning an Azure-managed email domain the name must be `AzureManagedDomain`, as shown above.

## 4. Initialize Terraform

From the `infrastructure/` directory run:

```powershell
terraform init `
  -backend-config="resource_group_name=tfstate-rg" `
  -backend-config="storage_account_name=zpiemailtfstate" `
  -backend-config="container_name=tfstate" `
  -backend-config="key=email-communication/terraform.tfstate"
```

> The backend block in `terraform.tf` is intentionally empty so you can supply environment-specific values during initialization.

If the storage account requires an access key, export it before running `terraform init`:

```powershell
$env:ARM_ACCESS_KEY = (az storage account keys list --resource-group tfstate-rg --account-name zpiemailtfstate --query "[0].value" -o tsv)
```

## 5. Plan and Apply

```powershell
terraform plan -out plan.out
terraform apply plan.out
```

Terraform will create the resource group, Azure Communication Service, email service, and Azure-managed email domain. Review the outputs for connection strings and resource identifiers (the primary connection string output is marked sensitive and will be masked in the console).

## 6. Destroy (Optional)

To remove all provisioned resources:

```powershell
terraform destroy
```

This leaves the remote state storage in place so future runs can continue to use the same backend. Delete the state resource group manually if you no longer need it.

## File Reference

- `terraform.tf` – Terraform version, provider requirements, and backend declaration
- `variables.tf` – Input variables with defaults for resource names and locations
- `main.tf` – Resource definitions for the Email Communication Service stack
- `outputs.tf` – Useful identifiers and connection strings
- `terraform-backend-setup.md` – Quick command reference for backend creation

## Next Steps

- Integrate the configuration into a CI/CD pipeline using a service principal
- Secure the connection string output (for example, push it into Azure Key Vault)
- Extend the module with role assignments, monitoring, or alerting as needed
