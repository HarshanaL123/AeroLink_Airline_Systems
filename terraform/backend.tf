terraform {
  backend "s3" {
    bucket         = "aerolink-terraform-state-012549289252"
    key            = "global/s3/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "aerolink-terraform-locks"
  }
}
