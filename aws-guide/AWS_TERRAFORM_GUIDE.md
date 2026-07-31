# LocalLoom AWS Deployment with Terraform

This guide provisions the same Plan A infrastructure (EC2 + RDS + ALB + S3) using Terraform for repeatable, version-controlled infrastructure.

## Prerequisites

1. [Terraform installed](https://developer.hashicorp.com/terraform/install) (v1.5+)
2. AWS CLI configured (`aws configure`)
3. A registered domain name
4. Your AWS account ID

---

## Project Structure

Create this folder structure in your repo:

```
localloom-backend/
├── terraform/
│   ├── main.tf              # Provider & backend config
│   ├── variables.tf         # Input variables
│   ├── vpc.tf               # VPC, subnets, IGW, routes
│   ├── security-groups.tf   # Security groups
│   ├── rds.tf               # PostgreSQL RDS
│   ├── ec2.tf               # EC2 instance
│   ├── alb.tf               # Application Load Balancer
│   ├── s3.tf                # S3 bucket for uploads
│   ├── ecr.tf               # ECR repository
│   ├── iam.tf               # IAM roles & policies
│   ├── route53.tf           # DNS records
│   ├── outputs.tf           # Output values
│   └── terraform.tfvars     # Your variable values (DO NOT COMMIT)
```

---

## Step 1: Create the Terraform Files

### `main.tf` — Provider & Backend

```hcl
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Optional: Store state in S3 (recommended for production)
  # backend "s3" {
  #   bucket = "localloom-terraform-state"
  #   key    = "production/terraform.tfstate"
  #   region = "ap-southeast-2"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "LocalLoom"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
```

### `variables.tf` — Input Variables

```hcl
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-southeast-2"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "localloom"
}

variable "domain_name" {
  description = "Root domain name"
  type        = string
  default     = "localloom.com.au"
}

variable "api_subdomain" {
  description = "API subdomain"
  type        = string
  default     = "api"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "ec2_instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.small"
}

variable "ec2_key_name" {
  description = "EC2 key pair name (create beforehand in AWS Console)"
  type        = string
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "localloom"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "localloom_admin"
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "my_ip" {
  description = "Your IP address for SSH access (e.g., 203.0.113.50/32)"
  type        = string
}

variable "cors_origins" {
  description = "Comma-separated allowed CORS origins"
  type        = string
  default     = "https://admin.localloom.com.au,https://localloom.com.au"
}
```

### `vpc.tf` — Networking

```hcl
# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = { Name = "${var.project_name}-vpc" }
}

# Public Subnets
resource "aws_subnet" "public_1" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true

  tags = { Name = "${var.project_name}-public-1" }
}

resource "aws_subnet" "public_2" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "${var.aws_region}b"
  map_public_ip_on_launch = true

  tags = { Name = "${var.project_name}-public-2" }
}

# Private Subnets (for RDS)
resource "aws_subnet" "private_1" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = "${var.aws_region}a"

  tags = { Name = "${var.project_name}-private-1" }
}

resource "aws_subnet" "private_2" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = "${var.aws_region}b"

  tags = { Name = "${var.project_name}-private-2" }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = { Name = "${var.project_name}-igw" }
}

# Public Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "${var.project_name}-public-rt" }
}

resource "aws_route_table_association" "public_1" {
  subnet_id      = aws_subnet.public_1.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_2" {
  subnet_id      = aws_subnet.public_2.id
  route_table_id = aws_route_table.public.id
}
```

### `security-groups.tf`

```hcl
# ALB Security Group
resource "aws_security_group" "alb" {
  name        = "${var.project_name}-alb-sg"
  description = "Allow HTTP/HTTPS from internet"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-alb-sg" }
}

# EC2 Security Group
resource "aws_security_group" "ec2" {
  name        = "${var.project_name}-ec2-sg"
  description = "Allow traffic from ALB and SSH"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "App port from ALB"
    from_port       = 5000
    to_port         = 5000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description = "SSH from my IP"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ip]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-ec2-sg" }
}

# RDS Security Group
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-sg"
  description = "Allow PostgreSQL from EC2 only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from EC2"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-rds-sg" }
}
```

### `rds.tf` — PostgreSQL Database

```hcl
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet"
  subnet_ids = [aws_subnet.private_1.id, aws_subnet.private_2.id]

  tags = { Name = "${var.project_name}-db-subnet-group" }
}

resource "aws_db_instance" "main" {
  identifier     = "${var.project_name}-db"
  engine         = "postgres"
  engine_version = "16.4"
  instance_class = var.db_instance_class

  allocated_storage     = 20
  max_allocated_storage = 50
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.project_name}-db-final-snapshot"
  deletion_protection       = true

  publicly_accessible = false

  tags = { Name = "${var.project_name}-db" }
}
```

### `iam.tf` — IAM Role for EC2

```hcl
resource "aws_iam_role" "ec2" {
  name = "${var.project_name}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecr_read" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_role_policy_attachment" "secrets_read" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/SecretsManagerReadWrite"
}

resource "aws_iam_role_policy_attachment" "s3_access" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3FullAccess"
}

resource "aws_iam_role_policy_attachment" "cloudwatch" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${var.project_name}-ec2-profile"
  role = aws_iam_role.ec2.name
}
```

### `ecr.tf` — Container Registry

```hcl
resource "aws_ecr_repository" "main" {
  name                 = "${var.project_name}-backend"
  image_tag_mutability = "MUTABLE"
  force_delete         = false

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = { Name = "${var.project_name}-ecr" }
}

# Lifecycle policy to keep only last 5 images
resource "aws_ecr_lifecycle_policy" "main" {
  repository = aws_ecr_repository.main.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep only last 5 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 5
      }
      action = {
        type = "expire"
      }
    }]
  })
}
```

### `ec2.tf` — Application Server

```hcl
# Get latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "api" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.ec2_instance_type
  key_name               = var.ec2_key_name
  subnet_id              = aws_subnet.public_1.id
  vpc_security_group_ids = [aws_security_group.ec2.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
    encrypted   = true
  }

  user_data = base64encode(templatefile("${path.module}/user-data.sh.tpl", {
    aws_region     = var.aws_region
    ecr_repo_url   = aws_ecr_repository.main.repository_url
    secret_name    = "localloom/production"
  }))

  tags = { Name = "${var.project_name}-api" }

  lifecycle {
    ignore_changes = [ami, user_data]
  }
}

# Elastic IP (so IP doesn't change on stop/start)
resource "aws_eip" "api" {
  instance = aws_instance.api.id
  domain   = "vpc"

  tags = { Name = "${var.project_name}-eip" }
}
```

### `alb.tf` — Load Balancer

```hcl
resource "aws_lb" "main" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [aws_subnet.public_1.id, aws_subnet.public_2.id]

  tags = { Name = "${var.project_name}-alb" }
}

resource "aws_lb_target_group" "main" {
  name     = "${var.project_name}-tg"
  port     = 5000
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    path                = "/health"
    port                = "traffic-port"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 10
    interval            = 30
    matcher             = "200"
  }

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = true
  }

  tags = { Name = "${var.project_name}-tg" }
}

resource "aws_lb_target_group_attachment" "main" {
  target_group_arn = aws_lb_target_group.main.arn
  target_id        = aws_instance.api.id
  port             = 5000
}

# SSL Certificate
resource "aws_acm_certificate" "main" {
  domain_name       = "${var.api_subdomain}.${var.domain_name}"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = { Name = "${var.project_name}-cert" }
}

# HTTPS Listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }
}

# HTTP → HTTPS Redirect
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}
```

### `s3.tf` — Upload Storage

```hcl
resource "aws_s3_bucket" "uploads" {
  bucket = "${var.project_name}-uploads-prod"

  tags = { Name = "${var.project_name}-uploads" }
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

### `route53.tf` — DNS

```hcl
data "aws_route53_zone" "main" {
  name         = var.domain_name
  private_zone = false
}

resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "${var.api_subdomain}.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# ACM DNS validation record
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}
```

### `outputs.tf`

```hcl
output "vpc_id" {
  value = aws_vpc.main.id
}

output "ec2_public_ip" {
  value = aws_eip.api.public_ip
}

output "rds_endpoint" {
  value = aws_db_instance.main.endpoint
}

output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "ecr_repository_url" {
  value = aws_ecr_repository.main.repository_url
}

output "s3_bucket_name" {
  value = aws_s3_bucket.uploads.bucket
}

output "api_url" {
  value = "https://${var.api_subdomain}.${var.domain_name}"
}
```

---

## Step 2: Create User Data Template

Create `terraform/user-data.sh.tpl`:

```bash
#!/bin/bash
set -e

# Update system
yum update -y
yum install -y docker jq

# Start Docker
systemctl enable docker
systemctl start docker
usermod -aG docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create app directory
mkdir -p /opt/localloom
cd /opt/localloom

# Login to ECR
aws ecr get-login-password --region ${aws_region} | \
  docker login --username AWS --password-stdin ${ecr_repo_url}

# Pull secrets and create .env
SECRET=$(aws secretsmanager get-secret-value \
  --secret-id ${secret_name} \
  --region ${aws_region} \
  --query SecretString --output text)

echo "NODE_ENV=production" > .env
echo "PORT=5000" >> .env
echo "$SECRET" | jq -r 'to_entries[] | "\(.key)=\(.value)"' >> .env

# Pull and run container
docker pull ${ecr_repo_url}:latest

docker run -d \
  --name localloom-api \
  --restart unless-stopped \
  -p 5000:5000 \
  --env-file .env \
  -v /opt/localloom/uploads:/app/uploads \
  -v /opt/localloom/logs:/app/logs \
  ${ecr_repo_url}:latest
```

---

## Step 3: Create Your Variables File

Create `terraform/terraform.tfvars` (add to `.gitignore`!):

```hcl
aws_region        = "ap-southeast-2"
environment       = "production"
project_name      = "localloom"
domain_name       = "localloom.com.au"
api_subdomain     = "api"
ec2_instance_type = "t3.small"
ec2_key_name      = "localloom-key"
db_instance_class = "db.t3.micro"
db_name           = "localloom"
db_username       = "localloom_admin"
db_password       = "YOUR_STRONG_PASSWORD_HERE"
my_ip             = "YOUR.IP.ADDRESS.HERE/32"
cors_origins      = "https://admin.localloom.com.au,https://localloom.com.au"
```

---

## Step 4: Deploy Infrastructure

```bash
cd localloom-backend/terraform

# Initialize Terraform
terraform init

# Preview what will be created
terraform plan

# Apply (creates all resources)
terraform apply

# Type "yes" when prompted
```

This will take ~10-15 minutes (RDS creation is the slowest part).

---

## Step 5: Post-Terraform Steps

After `terraform apply` completes:

### 5.1 Push Docker Image to ECR

```bash
# Get ECR URL from terraform output
ECR_URL=$(terraform output -raw ecr_repository_url)

# Login to ECR
aws ecr get-login-password --region ap-southeast-2 | \
  docker login --username AWS --password-stdin $ECR_URL

# Build and push
cd ../  # back to localloom-backend root
docker build --target production -t localloom-backend:latest .
docker tag localloom-backend:latest ${ECR_URL}:latest
docker push ${ECR_URL}:latest
```

### 5.2 Create Secrets in Secrets Manager

```bash
aws secretsmanager create-secret \
  --name localloom/production \
  --region ap-southeast-2 \
  --secret-string '{
    "DB_HOST": "'$(terraform -chdir=terraform output -raw rds_endpoint | cut -d: -f1)'",
    "DB_PORT": "5432",
    "DB_NAME": "localloom",
    "DB_USER": "localloom_admin",
    "DB_PASSWORD": "YOUR_DB_PASSWORD",
    "JWT_ACCESS_SECRET": "GENERATE_64_CHAR_RANDOM_STRING",
    "JWT_REFRESH_SECRET": "GENERATE_DIFFERENT_64_CHAR_RANDOM_STRING",
    "JWT_ACCESS_EXPIRY": "15m",
    "JWT_REFRESH_EXPIRY": "7d",
    "CORS_ORIGIN": "https://admin.localloom.com.au,https://localloom.com.au",
    "BACKEND_BASE_URL": "https://api.localloom.com.au",
    "TWILIO_ACCOUNT_SID": "YOUR_SID",
    "TWILIO_AUTH_TOKEN": "YOUR_TOKEN",
    "TWILIO_VERIFY_SERVICE_SID": "YOUR_VERIFY_SID",
    "ABN_LOOKUP_GUID": "YOUR_ABN_GUID",
    "ANTHROPIC_API_KEY": "YOUR_KEY",
    "AI_MODE": "production",
    "EMAIL_HOST": "smtp.gmail.com",
    "EMAIL_PORT": "587",
    "EMAIL_USER": "your@email.com",
    "EMAIL_PASS": "your-app-password",
    "EMAIL_FROM": "LocalLoom <noreply@localloom.com.au>"
  }'
```

### 5.3 SSH In & Start the App

```bash
EC2_IP=$(terraform -chdir=terraform output -raw ec2_public_ip)
ssh -i localloom-key.pem ec2-user@$EC2_IP

# If user-data didn't run yet (first boot), wait a few minutes
# Check status:
sudo cat /var/log/cloud-init-output.log

# Run migrations
docker exec -it localloom-api npx sequelize-cli db:migrate
docker exec -it localloom-api npx sequelize-cli db:seed:all
```

### 5.4 Verify

```bash
curl https://api.localloom.com.au/health
```

---

## Step 6: Updating Infrastructure

```bash
cd terraform

# After changing any .tf files:
terraform plan    # Preview changes
terraform apply   # Apply changes
```

---

## Step 7: Deploying New App Versions

```bash
# Build and push new image
ECR_URL=$(terraform -chdir=terraform output -raw ecr_repository_url)
docker build --target production -t localloom-backend:latest .
docker tag localloom-backend:latest ${ECR_URL}:latest
docker push ${ECR_URL}:latest

# SSH in and restart
EC2_IP=$(terraform -chdir=terraform output -raw ec2_public_ip)
ssh -i localloom-key.pem ec2-user@$EC2_IP

cd /opt/localloom
aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin $ECR_URL
docker pull ${ECR_URL}:latest
docker stop localloom-api && docker rm localloom-api
docker run -d \
  --name localloom-api \
  --restart unless-stopped \
  -p 5000:5000 \
  --env-file .env \
  -v /opt/localloom/uploads:/app/uploads \
  -v /opt/localloom/logs:/app/logs \
  ${ECR_URL}:latest

# Run migrations if needed
docker exec -it localloom-api npx sequelize-cli db:migrate
```

---

## Destroying Infrastructure

If you ever need to tear everything down:

```bash
# Remove deletion protection on RDS first
terraform apply -var="..." # Set deletion_protection = false

# Then destroy
terraform destroy
```

---

## Important Notes

1. **Add to `.gitignore`**:
   ```
   terraform/terraform.tfvars
   terraform/.terraform/
   terraform/terraform.tfstate*
   *.pem
   ```

2. **State Management**: For team use, enable the S3 backend in `main.tf` to share state.

3. **Cost Savings**: After confirming everything works, purchase Reserved Instances for EC2 + RDS (1-year no upfront saves ~30-40%).

4. **ACM Certificate**: The first `terraform apply` may require you to manually validate the DNS record if Route 53 isn't yet managing your domain. Check ACM in the console.

5. **Security**: Never commit `terraform.tfvars` or `.pem` files. Use AWS Secrets Manager for all sensitive values.
