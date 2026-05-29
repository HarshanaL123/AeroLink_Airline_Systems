resource "aws_ecr_repository" "repos" {
  for_each             = toset(var.repositories)
  name                 = "${each.value}-${var.environment}"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Environment = var.environment
    Project     = "AeroLink"
  }
}
