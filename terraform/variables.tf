variable "ssh_user" {
  type        = string
  description = "Default SSH user for the AMI"
}

variable "main_domain" {
  type        = string
  description = "Primary domain name"
}

variable "cloudflare_zone_id" {
  type        = string
  description = "Cloudflare Zone ID"
  sensitive   = true
}

variable "cloudflare_api_token" {
  type        = string
  description = "Cloudflare API Token"
  sensitive   = true
}
