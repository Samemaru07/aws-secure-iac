variable "ssh_user" {
  type        = string
  description = "Default SSH user for the AMI"
}

variable "main_domain" {
  type        = string
  description = "Primary domain name"
}

variable "test_domain" {
  type        = string
  description = "Subdomain for testing purposes"
}
