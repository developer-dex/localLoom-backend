# LocalLoom AWS Deployment Guide — Plan A (EC2 + RDS)

## Architecture Overview

```
Internet → Route 53 (DNS) → ALB (HTTPS/WSS) → EC2 (t3.small, Docker) → RDS PostgreSQL
                                                                       → S3 (uploads)
                                                                       → ECR (images)
```

**Estimated Monthly Cost: ~$55–60 USD**

---

## Prerequisites

1. An AWS account (with billing enabled)
2. AWS CLI installed locally (`brew install awscli` or download from https://aws.amazon.com/cli/)
3. A registered domain name (e.g., `localloom.com.au`)
4. Docker installed locally
5. Your LocalLoom backend code ready to build

---

## Step 1: Set Up AWS CLI & IAM User

> **What is IAM?** IAM (Identity and Access Management) is how AWS manages who can access what. Think of it like creating a user account with specific permissions. You create a "deployer" user that has permission to create servers, databases, etc. — rather than using your root account (which has unlimited access and is risky to use daily).
>
> **Why do we need this?** The AWS CLI on your laptop needs credentials to talk to AWS. The IAM user's access key is like a username+password that your terminal uses to create resources on your behalf.

### 1.1 Create an IAM User for deployment

**AWS Console UI Steps:**

1. Sign in to AWS Console at https://console.aws.amazon.com
2. In the top search bar, type **IAM** and click on "IAM" service
3. In the left sidebar, click **Users**
4. Click the **Create user** button (top right)
5. Enter User name: `localloom-deployer`
6. Do NOT check "Provide user access to the AWS Management Console"
7. Click **Next**
8. On "Set permissions" page:
   - Select **Attach policies directly**
   - Search and check each of these policies:
     - `AmazonEC2FullAccess`
     - `AmazonRDSFullAccess`
     - `AmazonS3FullAccess`
     - `AmazonVPCFullAccess`
     - `ElasticLoadBalancingFullAccess`
     - `AmazonRoute53FullAccess`
     - `AmazonEC2ContainerRegistryFullAccess`
     - `SecretsManagerReadWrite`
9. Click **Next** → Review → **Create user**

### 1.2 Create Access Key

**AWS Console UI Steps:**

1. Click on user name `localloom-deployer` from the Users list
2. Click the **Security credentials** tab
3. Scroll down to **Access keys** section
4. Click **Create access key**
5. Select use case: **Command Line Interface (CLI)**
6. Check the confirmation checkbox at bottom
7. Click **Next**
8. (Optional) Add description: `localloom-deployment-key`
9. Click **Create access key**
10. You'll see:
    - **Access key ID** (e.g., `AKIAIOSFODNN7EXAMPLE`)
    - **Secret access key** (e.g., `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`)
11. Click **Download .csv file** — save somewhere safe
12. Click **Done**

> WARNING: Secret access key is shown ONLY ONCE. If lost, create a new one.

### 1.3 Configure AWS CLI

```bash
aws configure
# AWS Access Key ID: <your-key-from-step-above>
# AWS Secret Access Key: <your-secret-from-step-above> 
# Default region: ap-southeast-2  (Sydney)
# Default output format: json
```

---

## Step 2: Create VPC & Networking

> **What is a VPC?** VPC (Virtual Private Cloud) is your own private network inside AWS. It's like having your own isolated section of the internet where only your services live. Nothing from outside can reach your servers unless you explicitly allow it.
>
> **What are Subnets?** Subnets divide your VPC into smaller sections. **Public subnets** can be reached from the internet (for your EC2 and Load Balancer). **Private subnets** are hidden from the internet (for your database — you don't want anyone from the internet connecting directly to your PostgreSQL).
>
> **What is an Internet Gateway?** It's the "door" that connects your VPC to the public internet. Without it, nothing in your VPC can reach the outside world or be reached from it.
>
> **Why 2 Availability Zones?** AWS requires at least 2 AZs for the Load Balancer and RDS. AZs are physically separate data centers in the same region — if one goes down, the other keeps running.

### AWS Console UI Steps:

1. Go to AWS Console → Search **VPC** → Click "VPC" service
2. Click **Create VPC** button
3. Select **VPC and more** (this creates VPC + subnets + IGW + route tables automatically)
4. Fill in:
   - Name tag auto-generation: `localloom`
   - IPv4 CIDR block: `10.0.0.0/16`
   - Number of Availability Zones: **2**
   - Number of public subnets: **2**
   - Number of private subnets: **2**
   - NAT gateways: **None** (saves ~$32/month)
   - VPC endpoints: **None**
5. Click **Create VPC**
6. Wait for it to complete — note down:
   - VPC ID (e.g., `vpc-0abc123...`)
   - Public Subnet 1 ID (in AZ `ap-southeast-2a`)
   - Public Subnet 2 ID (in AZ `ap-southeast-2b`)
   - Private Subnet 1 ID (in AZ `ap-southeast-2a`)
   - Private Subnet 2 ID (in AZ `ap-southeast-2b`)

> The "VPC and more" wizard auto-creates the Internet Gateway, route tables, and subnet associations for you.

### CLI Alternative:

```bash
# Create VPC
aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=localloom-vpc}]'

# Enable DNS hostnames
aws ec2 modify-vpc-attribute --vpc-id <vpc-id> --enable-dns-hostnames

# Create Public Subnet 1
aws ec2 create-subnet \
  --vpc-id <vpc-id> \
  --cidr-block 10.0.1.0/24 \
  --availability-zone ap-southeast-2a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=localloom-public-1}]'

# Create Public Subnet 2
aws ec2 create-subnet \
  --vpc-id <vpc-id> \
  --cidr-block 10.0.2.0/24 \
  --availability-zone ap-southeast-2b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=localloom-public-2}]'

# Create Private Subnet 1
aws ec2 create-subnet \
  --vpc-id <vpc-id> \
  --cidr-block 10.0.10.0/24 \
  --availability-zone ap-southeast-2a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=localloom-private-1}]'

# Create Private Subnet 2
aws ec2 create-subnet \
  --vpc-id <vpc-id> \
  --cidr-block 10.0.11.0/24 \
  --availability-zone ap-southeast-2b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=localloom-private-2}]'

# Create Internet Gateway
aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=localloom-igw}]'

# Attach IGW to VPC
aws ec2 attach-internet-gateway --internet-gateway-id <igw-id> --vpc-id <vpc-id>

# Create public route table
aws ec2 create-route-table \
  --vpc-id <vpc-id> \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=localloom-public-rt}]'

# Add internet route
aws ec2 create-route \
  --route-table-id <rtb-id> \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id <igw-id>

# Associate public subnets
aws ec2 associate-route-table --route-table-id <rtb-id> --subnet-id <public-subnet-1-id>
aws ec2 associate-route-table --route-table-id <rtb-id> --subnet-id <public-subnet-2-id>

# Enable auto-assign public IP on public subnets
aws ec2 modify-subnet-attribute --subnet-id <public-subnet-1-id> --map-public-ip-on-launch
aws ec2 modify-subnet-attribute --subnet-id <public-subnet-2-id> --map-public-ip-on-launch
```

---

## Step 3: Create Security Groups

> **What are Security Groups?** Security Groups are firewalls for your AWS resources. They define which traffic is allowed IN and OUT. Think of them as bouncers at a door — they check where traffic is coming from and only let approved traffic through.
>
> **Why 3 separate groups?**
> - **ALB SG**: Allows HTTP/HTTPS from the entire internet (because users need to access your API)
> - **EC2 SG**: Only allows traffic from the ALB (not directly from the internet) + SSH from your IP for debugging
> - **RDS SG**: Only allows PostgreSQL connections from the EC2 instance (database is completely hidden from the internet)
>
> This layered approach means: Internet → ALB → EC2 → RDS. A hacker can't bypass the ALB to hit EC2 directly, and can't reach your database at all.

### AWS Console UI Steps:

1. Go to **VPC** → Left sidebar → **Security Groups**
2. Click **Create security group**

**Security Group 1: ALB (localloom-alb-sg)**

3. Name: `localloom-alb-sg`
4. Description: `ALB - allow HTTP/HTTPS from internet`
5. VPC: Select `localloom-vpc`
6. Inbound rules → Add rule:
   - Type: **HTTP** | Source: **Anywhere-IPv4** (0.0.0.0/0)
   - Type: **HTTPS** | Source: **Anywhere-IPv4** (0.0.0.0/0)
7. Outbound rules: Keep default (All traffic, 0.0.0.0/0)
8. Click **Create security group**

**Security Group 2: EC2 (localloom-ec2-sg)**

9. Click **Create security group** again
10. Name: `localloom-ec2-sg`
11. Description: `EC2 - allow traffic from ALB + SSH`
12. VPC: Select `localloom-vpc`
13. Inbound rules → Add rules:
    - Type: **Custom TCP** | Port: `5000` | Source: Select **localloom-alb-sg** (type its name)
    - Type: **SSH** | Port: `22` | Source: **My IP** (auto-fills your current IP)
14. Outbound: Keep default
15. Click **Create security group**

**Security Group 3: RDS (localloom-rds-sg)**

16. Click **Create security group** again
17. Name: `localloom-rds-sg`
18. Description: `RDS - allow PostgreSQL from EC2 only`
19. VPC: Select `localloom-vpc`
20. Inbound rules → Add rule:
    - Type: **PostgreSQL** | Port: `5432` | Source: Select **localloom-ec2-sg**
21. Outbound: Keep default
22. Click **Create security group**

### CLI Alternative:

```bash
# ALB Security Group
aws ec2 create-security-group \
  --group-name localloom-alb-sg \
  --description "ALB - allow HTTP/HTTPS from internet" \
  --vpc-id <vpc-id>

aws ec2 authorize-security-group-ingress --group-id <alb-sg-id> --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id <alb-sg-id> --protocol tcp --port 443 --cidr 0.0.0.0/0

# EC2 Security Group
aws ec2 create-security-group \
  --group-name localloom-ec2-sg \
  --description "EC2 - allow traffic from ALB + SSH" \
  --vpc-id <vpc-id>

aws ec2 authorize-security-group-ingress --group-id <ec2-sg-id> --protocol tcp --port 5000 --source-group <alb-sg-id>
aws ec2 authorize-security-group-ingress --group-id <ec2-sg-id> --protocol tcp --port 22 --cidr <your-ip>/32

# RDS Security Group
aws ec2 create-security-group \
  --group-name localloom-rds-sg \
  --description "RDS - allow PostgreSQL from EC2 only" \
  --vpc-id <vpc-id>

aws ec2 authorize-security-group-ingress --group-id <rds-sg-id> --protocol tcp --port 5432 --source-group <ec2-sg-id>
```

---

## Step 4: Create RDS PostgreSQL Instance

> **What is RDS?** RDS (Relational Database Service) is a managed PostgreSQL database. Instead of installing PostgreSQL on a server yourself (and dealing with backups, updates, failover), AWS handles all of that for you.
>
> **Why RDS instead of PostgreSQL on EC2?** RDS gives you automatic daily backups (7-day retention), automatic security patches, encryption at rest, and one-click restore if something goes wrong. If your EC2 dies, your data is still safe in RDS.
>
> **Why db.t3.micro?** It's the smallest/cheapest instance (~$15/month) that's sufficient for an early-stage app with <1000 users. You can resize later without downtime.
>
> **Why private subnet + no public access?** Your database should NEVER be accessible from the internet. Only your EC2 (application server) should be able to connect to it.

### AWS Console UI Steps:

1. Go to AWS Console → Search **RDS** → Click "RDS" service
2. Click **Create database**
3. Choose method: **Standard create**
4. Engine options:
   - Engine type: **PostgreSQL**
   - Engine version: **PostgreSQL 16.4**
5. Templates: **Free tier** (if eligible) or **Production**
6. Settings:
   - DB instance identifier: `localloom-db`
   - Master username: `z``
   - Master password: Choose a strong password and SAVE IT
7. Instance configuration:
   - DB instance class: **db.t3.micro** (Burstable, 1 vCPU, 1 GB RAM)
8. Storage:
   - Storage type: **gp3**
   - Allocated storage: `20` GB
   - Enable storage autoscaling: Check it, max `50` GB
9. Connectivity:
   - VPC: Select **localloom-vpc**
   - DB subnet group: Click "Create new" → name: `localloom-db-subnet` → select both private subnets
   - Public access: **No**
   - VPC security group: Choose existing → Select **localloom-rds-sg** (remove default)
   - Availability Zone: No preference
10. Database authentication: **Password authentication**
11. Additional configuration:
    - Initial database name: `localloom`
    - Backup retention period: `7` days
    - Enable encryption: **Yes**
    - Enable deletion protection: **Yes**
12. Click **Create database**
13. Wait ~5-10 minutes for status to become "Available"
14. Click on the DB instance → Note the **Endpoint** (e.g., `localloom-db.abc123.ap-southeast-2.rds.amazonaws.com`)

### CLI Alternative:

```bash
# Create subnet group
aws rds create-db-subnet-group \
  --db-subnet-group-name localloom-db-subnet \
  --db-subnet-group-description "Private subnets for RDS" \
  --subnet-ids <private-subnet-1-id> <private-subnet-2-id>

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier localloom-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 16.4 \
  --master-username localloom_admin \
  --master-user-password '<STRONG_PASSWORD>' \
  --allocated-storage 20 \
  --storage-type gp3 \
  --vpc-security-group-ids <rds-sg-id> \
  --db-subnet-group-name localloom-db-subnet \
  --db-name localloom \
  --backup-retention-period 7 \
  --no-publicly-accessible \
  --storage-encrypted \
  --deletion-protection

# Wait for it
aws rds wait db-instance-available --db-instance-identifier localloom-db

# Get endpoint
aws rds describe-db-instances \
  --db-instance-identifier localloom-db \
  --query 'DBInstances[0].Endpoint.Address' --output text
```

---

## Step 5: Create S3 Bucket for File Uploads

> **What is S3?** S3 (Simple Storage Service) is AWS's file storage service. It's like a hard drive in the cloud that never runs out of space, automatically backs up your files, and costs fractions of a cent per GB.
>
> **Why use S3 for uploads?** Your EC2 instance has limited disk space (30GB). If the EC2 dies or you need to replace it, files stored locally on EC2 would be lost. S3 is separate from your server — files persist regardless of what happens to EC2. It also handles unlimited file sizes and concurrent uploads without slowing your server.
>
> **Why block public access?** User uploads (profile photos, work photos) should be served through your API (which checks authentication), not directly accessible to anyone with the URL.

### AWS Console UI Steps:

1. Go to AWS Console → Search **S3** → Click "S3" service
2. Click **Create bucket**
3. Bucket name: `localloom-uploads-prod`
4. Region: **Asia Pacific (Sydney) ap-southeast-2**
5. Object Ownership: **ACLs disabled**
6. Block Public Access: **Check all boxes** (block all public access)
7. Bucket Versioning: **Enable** (for data safety)
8. Encryption: **SSE-S3** (default)
9. Click **Create bucket**

### CLI Alternative:

```bash
aws s3 mb s3://localloom-uploads-prod --region ap-southeast-2

aws s3api put-public-access-block \
  --bucket localloom-uploads-prod \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

> Note: For launch, you can keep using local `/uploads` on EC2. Migrate to S3 later.

---

## Step 6: Store Secrets in AWS Secrets Manager

> **What is Secrets Manager?** It's AWS's secure vault for storing sensitive data like database passwords, API keys, and tokens. Instead of putting secrets in a `.env` file on your server (which could be leaked), you store them encrypted in AWS and your app fetches them at startup.
>
> **Why not just use a .env file on EC2?** Secrets Manager encrypts secrets at rest, provides audit logs of who accessed what, allows you to rotate secrets without redeploying, and means secrets never exist in your git repo or deployment pipeline. If your EC2 gets compromised, the attacker doesn't have permanent access to your secrets.
>
> **How does your app use it?** The EC2 user-data script fetches secrets at boot time and writes them to a local `.env` file that the Docker container reads.

### AWS Console UI Steps:

1. Go to AWS Console → Search **Secrets Manager** → Click it
2. Click **Store a new secret**
3. Secret type: **Other type of secret**
4. Key/value pairs — Click "Plaintext" tab and paste:


```json
{
  "NODE_ENV": "production",
  "PORT": "5000",
  "API_PREFIX": "/api",
  "DB_HOST": "<YOUR-RDS-ENDPOINT>.ap-southeast-2.rds.amazonaws.com",
  "DB_PORT": "5432",
  "DB_NAME": "localloom",
  "DB_USER": "localloom_admin",
  "DB_PASSWORD": "<YOUR-RDS-PASSWORD>",
  "JWT_ACCESS_SECRET": "<GENERATE-WITH: openssl rand -hex 32>",
  "JWT_REFRESH_SECRET": "<GENERATE-WITH: openssl rand -hex 32>",
  "JWT_ACCESS_EXPIRY": "15m",
  "JWT_REFRESH_EXPIRY": "7d",
  "CORS_ORIGIN": "https://admin.localloom.com.au,https://localloom.com.au",
  "RATE_LIMIT_WINDOW_MS": "900000",
  "RATE_LIMIT_MAX": "100",
  "LOG_LEVEL": "info",
  "MAX_FILE_SIZE": "5242880",
  "UPLOAD_DIR": "uploads",
  "SERVER_HOST": "",
  "BACKEND_BASE_URL": "https://api.localloom.com.au",
  "TWILIO_ACCOUNT_SID": "<YOUR-TWILIO-ACCOUNT-SID>",
  "TWILIO_AUTH_TOKEN": "<YOUR-TWILIO-AUTH-TOKEN>",
  "TWILIO_VERIFY_SERVICE_SID": "<YOUR-TWILIO-VERIFY-SERVICE-SID>",
  "TWILIO_MESSAGING_SERVICE_SID": "<YOUR-TWILIO-MESSAGING-SERVICE-SID>",
  "OTP_EXPIRY_MINUTES": "5",
  "OTP_MAX_ATTEMPTS": "3",
  "OTP_DEV_CODE": "123456",
  "EMAIL_HOST": "smtp.gmail.com",
  "EMAIL_PORT": "587",
  "EMAIL_USER": "<YOUR-PRODUCTION-EMAIL>",
  "EMAIL_PASS": "<YOUR-EMAIL-APP-PASSWORD>",
  "EMAIL_FROM": "<YOUR-PRODUCTION-EMAIL>",
  "ABN_LOOKUP_GUID": "<YOUR-ABN-LOOKUP-GUID>",
  "AI_MODE": "production",
  "ANTHROPIC_API_KEY": "<YOUR-ANTHROPIC-API-KEY>",
  "ANTHROPIC_CLASSIFIER_MODEL": "claude-haiku-4-5",
  "AI_CLASSIFIER_MAX_TOKENS": "256",
  "AI_CLASSIFIER_TEMPERATURE": "0",
  "AI_CLASSIFIER_TIMEOUT_MS": "15000",
  "AI_CLASSIFIER_RATE_LIMIT_MAX": "20",
  "AI_CLASSIFIER_RATE_LIMIT_WINDOW_MS": "60000",
  "AI_CLASSIFIER_CATALOG_CACHE_TTL_MS": "300000",
  "AI_CLASSIFIER_DEBUG_LOG_PROMPT": "false"
}
```

5. Click **Next**
6. Secret name: `localloom/production`
7. Description: `LocalLoom production environment variables`
8. Click **Next** → **Next** → **Store**

> To generate random strings for JWT secrets, run: `openssl rand -hex 32`

### CLI Alternative:

```bash
aws secretsmanager create-secret \
  --name localloom/production \
  --description "LocalLoom production environment variables" \
  --secret-string '{ ... paste the JSON above ... }'
```

---

## Step 7: Create ECR Repository & Push Docker Image

> **What is ECR?** ECR (Elastic Container Registry) is AWS's private Docker image storage. It's like Docker Hub but private to your AWS account. You push your built Docker images here, and your EC2 pulls them when deploying.
>
> **Why use ECR?** Your LocalLoom backend has a multi-stage Dockerfile that builds a production image. ECR stores these images securely, scans them for vulnerabilities, and provides fast pulls within the same AWS region (no internet download needed). It also handles versioning so you can roll back to a previous image if a deploy goes wrong.
>
> **Why not just build on EC2?** Building Docker images requires lots of RAM and CPU. Your small EC2 would struggle. Instead, you build on your powerful local machine (or CI/CD), push the ready-made image, and EC2 just pulls and runs it.

### AWS Console UI Steps:

1. Go to AWS Console → Search **ECR** (Elastic Container Registry) → Click it
2. Click **Create repository**
3. Visibility: **Private**
4. Repository name: `localloom-backend`
5. Image tag mutability: **Mutable**
6. Scan on push: **Enabled**
7. Click **Create repository**
8. Click on the repository name → Click **View push commands** (top right) — this shows exact commands for your account

### Push Docker Image (from your local machine):

```bash
# Get your AWS account ID
aws sts get-caller-identity --query Account --output text
# Example output: 123456789012

# Login to ECR
aws ecr get-login-password --region ap-southeast-2 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-southeast-2.amazonaws.com

# Build production image (run from localloom-backend/ folder)
docker build --target production -t localloom-backend:latest .

# Tag for ECR
docker tag localloom-backend:latest \
  <account-id>.dkr.ecr.ap-southeast-2.amazonaws.com/localloom-backend:latest

# Push to ECR
docker push <account-id>.dkr.ecr.ap-southeast-2.amazonaws.com/localloom-backend:latest
```

---

## Step 8: Create IAM Role for EC2

> **What is an IAM Role for EC2?** When your EC2 instance needs to talk to other AWS services (pull images from ECR, read secrets, write to S3), it needs permission. An IAM Role is like giving your server a badge that says "I'm allowed to do these specific things." Without it, your EC2 can't access any other AWS service.
>
> **Why not just put access keys on EC2?** Putting access keys directly on a server is a security risk — if the server is compromised, those keys can be used from anywhere. IAM Roles are tied to the instance itself and can't be stolen and used elsewhere. AWS automatically rotates the temporary credentials behind the scenes.

The EC2 instance needs permissions to pull Docker images from ECR and read secrets.

### AWS Console UI Steps:

1. Go to **IAM** → Left sidebar → **Roles**
2. Click **Create role**
3. Trusted entity type: **AWS service**
4. Use case: **EC2**
5. Click **Next**
6. Search and attach these policies:
   - `AmazonEC2ContainerRegistryReadOnly`
   - `SecretsManagerReadWrite`
   - `AmazonS3FullAccess`
   - `CloudWatchAgentServerPolicy`
7. Click **Next**
8. Role name: `localloom-ec2-role`
9. Click **Create role**

### CLI Alternative:

```bash
aws iam create-role \
  --role-name localloom-ec2-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]
  }'

aws iam attach-role-policy --role-name localloom-ec2-role --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
aws iam attach-role-policy --role-name localloom-ec2-role --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite
aws iam attach-role-policy --role-name localloom-ec2-role --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
aws iam attach-role-policy --role-name localloom-ec2-role --policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy

aws iam create-instance-profile --instance-profile-name localloom-ec2-role
aws iam add-role-to-instance-profile --instance-profile-name localloom-ec2-role --role-name localloom-ec2-role
```

---

## Step 9: Launch EC2 Instance

> **What is EC2?** EC2 (Elastic Compute Cloud) is a virtual server in the cloud. It's the machine that actually runs your LocalLoom Node.js backend. Think of it as renting a computer in AWS's data center that's always on, always connected to the internet.
>
> **Why t3.small?** It has 2 vCPUs and 2GB RAM — enough to run your Docker container, handle Socket.IO connections for real-time chat, serve API requests, and process AI classifications concurrently. It can comfortably handle 500-1000 concurrent users.
>
> **What is User Data?** It's a startup script that runs automatically when the EC2 first boots. It installs Docker, pulls your image from ECR, fetches secrets, and starts your app — so the server is fully operational without you needing to SSH in.
>
> **Why Amazon Linux 2023?** It's lightweight, optimized for AWS, gets free security updates, and has the AWS CLI pre-installed.

### AWS Console UI Steps:

1. Go to AWS Console → Search **EC2** → Click "EC2" service
2. Click **Launch instances**
3. Name: `localloom-api`
4. Application and OS Images:
   - Select **Amazon Linux 2023 AMI** (Free tier eligible, 64-bit x86)
5. Instance type: **t3.small** (2 vCPU, 2 GB RAM)
6. Key pair:
   - Click **Create new key pair**
   - Name: `localloom-key`
   - Type: **RSA**
   - Format: **.pem** (for Linux/Mac) or **.ppk** (for Windows/PuTTY)
   - Click **Create key pair** — file downloads automatically
   - **Keep this file safe!** Move it somewhere secure and run: `chmod 400 localloom-key.pem`
7. Network settings → Click **Edit**:
   - VPC: Select **localloom-vpc**
   - Subnet: Select **localloom-public-1**
   - Auto-assign public IP: **Enable**
   - Security group: Select existing → **localloom-ec2-sg**
8. Configure storage:
   - Root volume: `30` GiB, **gp3**
9. Advanced details:
   - IAM instance profile: Select **localloom-ec2-role**
   - User data: Paste the script below
10. Click **Launch instance**

### User Data Script (paste in Advanced details → User data):

```bash
#!/bin/bash
yum update -y
yum install -y docker jq
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
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=ap-southeast-2
aws ecr get-login-password --region $REGION | \
  docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com

# Pull secrets and create .env file
SECRET=$(aws secretsmanager get-secret-value --secret-id localloom/production --region $REGION --query SecretString --output text)
echo "NODE_ENV=production" > .env
echo "PORT=5000" >> .env
echo "$SECRET" | jq -r 'to_entries[] | "\(.key)=\(.value)"' >> .env

# Pull and run container
docker pull ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/localloom-backend:latest

docker run -d \
  --name localloom-api \
  --restart unless-stopped \
  -p 5000:5000 \
  --env-file .env \
  -v /opt/localloom/uploads:/app/uploads \
  -v /opt/localloom/logs:/app/logs \
  ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/localloom-backend:latest
```

### After Launch — Verify EC2 is Running:

```bash
# SSH into your instance
ssh -i localloom-key.pem ec2-user@<ec2-public-ip>

# Check if Docker container is running
docker ps

# Check container logs
docker logs localloom-api
```

---

## Step 10: Set Up Application Load Balancer (ALB)

> **What is an ALB?** ALB (Application Load Balancer) sits between the internet and your EC2. It receives all incoming requests, terminates SSL (handles HTTPS encryption), and forwards traffic to your app on port 5000.
>
> **Why do we need it?** Three main reasons:
> 1. **SSL/HTTPS** — ALB handles the SSL certificate so your app doesn't need to. Users connect via `https://api.localloom.com.au` securely.
> 2. **WebSocket support** — ALB natively supports WebSocket connections (needed for your Socket.IO chat).
> 3. **Health checks** — ALB continuously pings your `/health` endpoint. If your app crashes, ALB returns a 503 instead of a connection timeout.
>
> **What is a Target Group?** It tells the ALB where to send traffic. In your case: "send HTTP requests to EC2 instance on port 5000." It also defines health check rules.
>
> **Why sticky sessions?** Socket.IO uses polling as a fallback transport. Sticky sessions ensure repeated requests from the same client go to the same backend (important for WebSocket handshake).

### AWS Console UI Steps:

1. Go to **EC2** → Left sidebar → **Load Balancers**
2. Click **Create Load Balancer**
3. Select **Application Load Balancer** → Click **Create**
4. Basic configuration:
   - Name: `localloom-alb`
   - Scheme: **Internet-facing**
   - IP address type: **IPv4**
5. Network mapping:
   - VPC: Select **localloom-vpc**
   - Mappings: Check both AZs and select the **public subnets**:
     - ap-southeast-2a → localloom-public-1
     - ap-southeast-2b → localloom-public-2
6. Security groups: Select **localloom-alb-sg** (remove default)
7. Listeners and routing:
   - Keep HTTP:80 listener for now (we'll add HTTPS after certificate)
   - Click **Create target group** (opens new tab):

### Create Target Group (in the new tab):

8. Target type: **Instances**
9. Target group name: `localloom-tg`
10. Protocol: HTTP, Port: `5000`
11. VPC: **localloom-vpc**
12. Health check path: `/health`
13. Advanced health check settings:
    - Healthy threshold: `2`
    - Unhealthy threshold: `3`
    - Timeout: `10` seconds
    - Interval: `30` seconds
    - Success codes: `200`
14. Click **Next**
15. Register targets: Select your EC2 instance → Set port to `5000` → Click **Include as pending below**
16. Click **Create target group**

### Back in ALB creation tab:

17. Refresh target groups and select **localloom-tg**
18. Click **Create load balancer**
19. Note the ALB DNS name (e.g., `localloom-alb-123456.ap-southeast-2.elb.amazonaws.com`)

### CLI Alternative:

```bash
aws elbv2 create-load-balancer \
  --name localloom-alb \
  --subnets <public-subnet-1-id> <public-subnet-2-id> \
  --security-groups <alb-sg-id> \
  --scheme internet-facing --type application

aws elbv2 create-target-group \
  --name localloom-tg --protocol HTTP --port 5000 \
  --vpc-id <vpc-id> --target-type instance \
  --health-check-path /health --health-check-interval-seconds 30

aws elbv2 register-targets \
  --target-group-arn <tg-arn> \
  --targets Id=<ec2-instance-id>,Port=5000
```

---

## Step 11: Request SSL Certificate (ACM)

> **What is ACM?** ACM (AWS Certificate Manager) provides free SSL/TLS certificates for your domain. SSL is what makes `https://` work — it encrypts all data between your users' devices and your server.
>
> **Why do we need SSL?** Without it, user data (passwords, OTP codes, chat messages, personal info) would be sent in plain text that anyone on the network could read. App stores also reject apps that communicate over unencrypted HTTP.
>
> **Why DNS validation?** It proves you own the domain by asking you to add a specific DNS record. Once validated, the certificate auto-renews forever (no manual renewal needed).
>
> **Cost?** Completely free when used with ALB.

### AWS Console UI Steps:

1. Go to AWS Console → Search **Certificate Manager** (ACM) → Click it
2. Click **Request a certificate**
3. Certificate type: **Request a public certificate** → **Next**
4. Domain names: `api.localloom.com.au`
   - (Optional) Add `*.localloom.com.au` for wildcard
5. Validation method: **DNS validation**
6. Click **Request**
7. Click on the certificate → Status will be "Pending validation"
8. Under "Domains" section, you'll see a CNAME record like:
   - Name: `_abc123.api.localloom.com.au`
   - Value: `_xyz789.acm-validations.aws`

### Add the CNAME record in GoDaddy (for domain validation):

9. Log in to https://dcc.godaddy.com (GoDaddy Domain Control Center)
10. Click on your domain (e.g., `localloom.com.au`)
11. Click **DNS** tab (or "Manage DNS")
12. Click **Add New Record**
13. Fill in:
    - Type: **CNAME**
    - Name: Copy the "Name" from ACM but **remove your domain part**
      - Example: ACM shows `_abc123.api.localloom.com.au` → you enter `_abc123.api`
      - (GoDaddy automatically appends `.localloom.com.au`)
    - Value: Copy the full "Value" from ACM (e.g., `_xyz789.acm-validations.aws.`)
    - TTL: **Default** or **600**
14. Click **Save**
15. Go back to AWS ACM → Wait 5-30 minutes → Status changes to **"Issued"**

### CLI Alternative:

```bash
aws acm request-certificate \
  --domain-name api.localloom.com.au \
  --validation-method DNS \
  --region ap-southeast-2
```

---

## Step 12: Add HTTPS Listener to ALB

> **What is a Listener?** A listener is a rule on the ALB that says "when traffic arrives on port X with protocol Y, do Z." You need two:
> 1. **HTTPS on port 443** — Accepts encrypted traffic and forwards to your app
> 2. **HTTP on port 80** — Automatically redirects to HTTPS (so users who type `http://` still get encrypted)
>
> **Why redirect HTTP to HTTPS?** If someone bookmarks or links to `http://api.localloom.com.au`, they'd get an error without this redirect. The redirect ensures all traffic ends up encrypted regardless of how users arrive.

### AWS Console UI Steps:

1. Go to **EC2** → **Load Balancers** → Click **localloom-alb**
2. Go to **Listeners** tab
3. Click **Add listener**:
   - Protocol: **HTTPS**
   - Port: `443`
   - Default action: Forward to **localloom-tg**
   - Default SSL/TLS certificate: Select **api.localloom.com.au** (from ACM)
   - Security policy: `ELBSecurityPolicy-TLS13-1-2-2021-06`
4. Click **Add**
5. Now edit the HTTP:80 listener:
   - Select the HTTP:80 listener → Click **Edit**
   - Change default action to: **Redirect to HTTPS, port 443, status 301**
   - Click **Save changes**

### CLI Alternative:

```bash
# HTTPS listener
aws elbv2 create-listener \
  --load-balancer-arn <alb-arn> \
  --protocol HTTPS --port 443 \
  --certificates CertificateArn=<cert-arn> \
  --default-actions Type=forward,TargetGroupArn=<tg-arn>

# HTTP redirect listener
aws elbv2 create-listener \
  --load-balancer-arn <alb-arn> \
  --protocol HTTP --port 80 \
  --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}'
```

---

## Step 13: Configure DNS (GoDaddy)

> **Why GoDaddy instead of Route 53?** Since your domain is already purchased and managed in GoDaddy, you can point it directly to your ALB from there. This skips Route 53 entirely and saves you $0.50/month. The result is the same — `api.localloom.com.au` points to your load balancer.
>
> **What is a CNAME record?** It's a DNS record that says "this subdomain points to that other address." You're telling GoDaddy: "when someone asks for `api.localloom.com.au`, send them to my ALB address."

### GoDaddy UI Steps:

1. Log in to https://dcc.godaddy.com
2. Click on your domain (e.g., `localloom.com.au`)
3. Click **DNS** tab (or "Manage DNS")
4. Click **Add New Record**
5. Fill in:
   - Type: **CNAME**
   - Name: `api`
   - Value: Your ALB DNS name (e.g., `localloom-alb-123456.ap-southeast-4.elb.amazonaws.com`)
   - TTL: **600**
6. Click **Save**
7. Wait 5-10 minutes for DNS to propagate
8. Test: `curl https://api.localloom.com.au/health`

> Note: You do NOT need AWS Route 53. GoDaddy handles DNS for free as part of your domain purchase. This saves $0.50/month.

---

## Step 14: Run Database Migrations

SSH into your EC2 and run migrations:

```bash
ssh -i localloom-key.pem ec2-user@<ec2-public-ip>

# Inside EC2:
docker exec -it localloom-api npx sequelize-cli db:migrate
docker exec -it localloom-api npx sequelize-cli db:seed:all
```

---

## Step 15: Verify Deployment

```bash
# Health check (should return 200 with JSON)
curl https://api.localloom.com.au/health

# Expected:
# {"success":true,"message":"LocalLoom backend is running","timestamp":"...","environment":"production"}
```

Also test WebSocket by connecting your frontend app.

---

## Step 16: Set Up CloudWatch Monitoring

> **What is CloudWatch?** CloudWatch is AWS's monitoring and logging service. It collects logs from your application, tracks metrics (CPU usage, memory, request counts), and can alert you if something goes wrong (e.g., server CPU > 90% for 5 minutes).
>
> **Why do we need it?** In production, you can't just `docker logs` every time something breaks. CloudWatch stores your logs centrally so you can search them, set up alarms, and debug issues even if your EC2 instance dies and gets replaced.
>
> **What does it cost?** Basic monitoring is free. Log ingestion costs ~$0.50/GB. For a small app, expect $3-5/month.

### AWS Console UI Steps:

1. Go to **CloudWatch** → Left sidebar → **Log groups**
2. Click **Create log group**
3. Name: `/localloom/api`
4. Retention: `14 days`
5. Click **Create**

Then SSH into EC2 and install the agent:

```bash
ssh -i localloom-key.pem ec2-user@<ec2-public-ip>

sudo yum install -y amazon-cloudwatch-agent

# Create config
sudo tee /opt/aws/amazon-cloudwatch-agent/etc/config.json << 'EOF'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/opt/localloom/logs/*.log",
            "log_group_name": "/localloom/api",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 14
          }
        ]
      }
    }
  }
}
EOF

# Start the agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json
```

---

## Deploying New Versions

When you push code changes:

```bash
# 1. Build and push new image (from your local machine)
docker build --target production -t localloom-backend:latest .
docker tag localloom-backend:latest <account-id>.dkr.ecr.ap-southeast-2.amazonaws.com/localloom-backend:latest
aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-southeast-2.amazonaws.com
docker push <account-id>.dkr.ecr.ap-southeast-2.amazonaws.com/localloom-backend:latest

# 2. SSH in and restart
ssh -i localloom-key.pem ec2-user@<ec2-public-ip>
cd /opt/localloom
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.ap-southeast-2.amazonaws.com
docker pull ${ACCOUNT_ID}.dkr.ecr.ap-southeast-2.amazonaws.com/localloom-backend:latest
docker stop localloom-api && docker rm localloom-api
docker run -d \
  --name localloom-api \
  --restart unless-stopped \
  -p 5000:5000 \
  --env-file .env \
  -v /opt/localloom/uploads:/app/uploads \
  -v /opt/localloom/logs:/app/logs \
  ${ACCOUNT_ID}.dkr.ecr.ap-southeast-2.amazonaws.com/localloom-backend:latest

# 3. Run migrations if needed
docker exec -it localloom-api npx sequelize-cli db:migrate
```

---

## Production Hardening Checklist

Before going live, fix these in your codebase:

- [ ] **Enable rate limiting** — Uncomment `app.use(apiLimiter)` in `app.ts` and `authLimiter` in auth routes
- [ ] **Remove hardcoded OTP** — In `auth.service.ts`, replace `const emailCode = '123456'` with `generateOTP(6)`
- [ ] **Lock CORS origins** — Set `CORS_ORIGIN` to actual domains only
- [ ] **Set proper JWT expiry** — Change access token from 365d to 15m
- [ ] **Enable ABN lookup** — Uncomment real ABR API call in `abn-lookup.service.ts`
- [ ] **Remove console.log statements** — Clean up debug logs
- [ ] **Set NODE_ENV=production** — Ensures SSL on DB, disables dev OTP bypass

---

## Cost Breakdown (Monthly)

| Service | Cost |
|---------|------|
| EC2 t3.small (on-demand) | ~$15.33 |
| RDS db.t3.micro (20GB gp3) | ~$14.98 |
| ALB (fixed + LCU) | ~$16.43 |
| ECR (500MB images) | ~$0.05 |
| CloudWatch (basic) | ~$3-5 |
| Data transfer (10GB/mo) | ~$0.90 |
| S3 (5GB, optional) | ~$0.12 |
| DNS (GoDaddy) | $0 (included with domain) |
| **Total** | **~$51–53** |

> Tip: Purchase 1-year Reserved Instances for EC2 + RDS to save ~40% (~$30/month total).


---

## Bonus: Reserved Instances Explained & How to Purchase

### What Are Reserved Instances?

Think of it like renting vs. leasing a car:

- **On-Demand (what you're using now)** = Renting a car daily. Pay by the hour, cancel anytime, but it's the most expensive option. Your EC2 t3.small costs ~$15.33/month on-demand.

- **Reserved Instance (RI)** = Signing a 1-year or 3-year lease. You commit to using the server for that duration, and in return AWS gives you a massive discount (30-60% off). The server is the exact same — same specs, same performance — you just pay less because AWS knows you're sticking around.

### Simple Analogy

Imagine you go to a gym:
- Monthly membership (no contract) = $50/month → This is **On-Demand**
- 1-year contract = $35/month → This is **1-year Reserved (No Upfront)**
- 1-year contract, pay full year now = $30/month → This is **1-year Reserved (All Upfront)**

Same gym, same equipment, just cheaper because you committed.

### How Much You Save (Your Setup)

| Resource | On-Demand (monthly) | 1-Year RI No Upfront | 1-Year RI All Upfront | Savings |
|----------|---------------------|----------------------|-----------------------|---------|
| EC2 t3.small | ~$15.33 | ~$10.73 | ~$9.20 | 30-40% |
| RDS db.t3.micro | ~$14.98 | ~$9.49 | ~$8.54 | 37-43% |
| **Combined** | **~$30.31** | **~$20.22** | **~$17.74** | **33-42%** |

So instead of paying ~$30/month for EC2+RDS, you'd pay ~$18-20/month. That's ~$120 saved per year.

### Payment Options Explained

| Option | How it works | Discount |
|--------|-------------|----------|
| **No Upfront** | Pay nothing now, reduced monthly price for 1 year. You're locked in but pay monthly. | ~30% off |
| **Partial Upfront** | Pay ~50% now, rest as reduced monthly payments. | ~35% off |
| **All Upfront** | Pay entire year upfront in one lump sum. Biggest discount. | ~40% off |

### When Should You Buy Reserved Instances?

**DO buy RIs when:**
- Your app has been running on-demand for 1-2 months and you're sure you'll keep it running
- You've confirmed t3.small is the right size (not too small, not too big)
- You're committed to keeping this project live for at least a year

**DON'T buy RIs when:**
- You just launched and aren't sure the project will survive 12 months
- You might need to change instance size soon (upgrade or downgrade)
- You're still testing/experimenting

### My Recommendation for LocalLoom

1. **Month 1-2**: Run on-demand (full price). Verify everything works, confirm instance sizes are correct.
2. **Month 3**: If the app is stable and you're keeping it, buy 1-year Reserved Instances with **No Upfront** payment. This way you save 30% without paying a big lump sum.

---

### How to Purchase EC2 Reserved Instance

**AWS Console UI Steps:**

1. Go to AWS Console → Search **EC2** → Click it
2. In the left sidebar, scroll down to **Reserved Instances** (under "Instances")
3. Click **Purchase Reserved Instances**
4. Fill in the search:
   - Platform: **Linux/UNIX**
   - Instance Type: **t3.small**
   - Tenancy: **Default**
   - Offering Class: **Standard**
   - Term: **1 year**
   - Payment Option: **No Upfront** (recommended to start)
5. Click **Search**
6. You'll see available offerings with the monthly/hourly price
7. Select the offering → Set Quantity: **1**
8. Click **Add to Cart** → **Purchase**

> Note: The RI is tied to the instance type and region, NOT to a specific EC2 instance. As long as you have a t3.small running in ap-southeast-2, the discount applies automatically. You don't need to do anything special to "connect" the RI to your instance.

---

### How to Purchase RDS Reserved Instance

**AWS Console UI Steps:**

1. Go to AWS Console → Search **RDS** → Click it
2. In the left sidebar, click **Reserved Instances**
3. Click **Purchase Reserved DB Instance**
4. Fill in:
   - DB Engine: **postgresql**
   - DB Instance Class: **db.t3.micro**
   - Multi-AZ: **No** (single-AZ is what we set up)
   - Term: **1 year**
   - Offering Type: **No Upfront**
5. Click **Submit**
6. Review pricing → **Purchase**

> Same as EC2 — the discount auto-applies to your existing RDS instance. No restart or migration needed.

---

### Important Rules About Reserved Instances

1. **Non-refundable** — Once purchased, you pay for the full term even if you delete your server. (You can sell unused RIs on the AWS Marketplace, but it's a hassle.)

2. **Same specs only** — If you buy a t3.small RI and later upgrade to t3.medium, the RI discount no longer applies. You'd be paying for both the unused RI AND the new on-demand instance.

3. **Region-locked** — An RI for ap-southeast-2 won't apply to an instance in us-east-1.

4. **Auto-applies** — You don't need to "attach" the RI to anything. As long as a matching instance is running, AWS automatically applies the discounted rate to your bill.

5. **Convertible RIs** (more expensive, more flexible) — Can be exchanged for different instance types. Only worth it if you expect to resize frequently.

---

### Quick Summary

| Question | Answer |
|----------|--------|
| Do I need to restart my server? | No. Nothing changes on the server. |
| Do I need to reconfigure anything? | No. It's purely a billing change. |
| Can I cancel? | No. You're committed for 1 or 3 years. |
| When does the discount start? | Immediately after purchase. |
| What if my server is off? | You still pay. RI = reservation, not usage-based. |
| Should I buy it on Day 1? | No. Wait 1-2 months to confirm everything is stable first. |
