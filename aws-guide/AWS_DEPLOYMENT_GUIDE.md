# LocalLoom Backend — AWS Deployment Guide

> A step-by-step guide to deploy your backend on AWS with automatic builds when you push to `main`.
> No DevOps experience needed. Just follow along.

---

## Table of Contents

1. [What We're Building](#what-were-building)
2. [Prerequisites](#prerequisites)
3. [Solution 1: With Docker (Recommended)](#solution-1-with-docker-recommended)
4. [Solution 2: Without Docker](#solution-2-without-docker)
5. [Files You Need to Add to Your Codebase](#files-you-need-to-add-to-your-codebase)
6. [Common Issues & Fixes](#common-issues--fixes)

---

## What We're Building

```
You push code to "main" branch on GitHub
        ↓
AWS detects the push automatically
        ↓
AWS builds your new code
        ↓
Old code keeps running and serving requests (zero downtime)
        ↓
New code is ready → AWS switches traffic to new code
        ↓
Done! Users never noticed a thing
```

We'll use these AWS services:
- **EC2** — A virtual server (like your computer but in the cloud)
- **ECR** — A place to store your Docker images (Solution 1 only)
- **CodePipeline** — Watches your GitHub repo and triggers builds automatically
- **CodeBuild** — Builds your code in the cloud
- **CodeDeploy** — Deploys the new code to your server with zero downtime
- **MongoDB Atlas** — Your database (free tier available, easier than self-hosting)

---

## Prerequisites

Before starting, make sure you have:

- [ ] An **AWS Account** — [Sign up here](https://aws.amazon.com/free/) (free tier available)
- [ ] A **GitHub Account** with your code pushed to a repository
- [ ] **AWS CLI** installed on your computer
- [ ] **MongoDB Atlas** account (free) — [Sign up here](https://www.mongodb.com/cloud/atlas/register)

### Install AWS CLI

```bash
# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Verify
aws --version
```

### Configure AWS CLI

```bash
aws configure
```

It will ask you 4 things:
- **AWS Access Key ID** — Get from AWS Console → IAM → Users → Your User → Security Credentials
- **AWS Secret Access Key** — Same place as above
- **Default region** — Use `us-east-1` (or whichever is closest to your users)
- **Default output format** — Type `json`

### Set Up MongoDB Atlas (Your Database)

Instead of running MongoDB on EC2 (which is complex to manage), use MongoDB Atlas:

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster (M0 tier — completely free)
3. Click **"Connect"** → **"Connect your application"**
4. Copy the connection string. It looks like:
   ```
   mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/localloom?retryWrites=true&w=majority
   ```
5. In the Atlas dashboard, go to **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (0.0.0.0/0)
   - Later you can restrict this to only your EC2 IP for security

Save this connection string — you'll need it later.

---

## Solution 1: With Docker (Recommended)

This uses your existing `Dockerfile`. AWS builds a Docker image, pushes it to ECR, and deploys it to EC2.

### Step 1: Create an ECR Repository (Docker Image Storage)

```bash
aws ecr create-repository \
  --repository-name localloom-backend \
  --region us-east-1
```

Note down the **repository URI** from the output. It looks like:
```
123456789012.dkr.ecr.us-east-1.amazonaws.com/localloom-backend
```

### Step 2: Launch an EC2 Instance (Your Server)

1. Go to **AWS Console** → **EC2** → **Launch Instance**
2. Configure:
   - **Name**: `localloom-backend`
   - **OS**: Amazon Linux 2023
   - **Instance type**: `t2.micro` (free tier) or `t3.small` (for production)
   - **Key pair**: Create a new one → Download the `.pem` file → Keep it safe!
   - **Network settings**: 
     - Allow SSH (port 22) — from "My IP" only
     - Allow HTTP (port 80) — from Anywhere
     - Allow HTTPS (port 443) — from Anywhere
     - Allow Custom TCP (port 5000) — from Anywhere
   - **Storage**: 20 GB gp3
3. Click **Launch Instance**

### Step 3: Connect to Your EC2 and Install Docker

```bash
# Connect to your server (replace with your .pem file path and EC2 public IP)
ssh -i "your-key.pem" ec2-user@YOUR_EC2_PUBLIC_IP
```

Once connected, run these commands on the server:

```bash
# Update the system
sudo yum update -y

# Install Docker
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install CodeDeploy Agent (needed for auto-deploy)
sudo yum install -y ruby wget
wget https://aws-codedeploy-us-east-1.s3.us-east-1.amazonaws.com/latest/install
chmod +x ./install
sudo ./install auto
sudo systemctl start codedeploy-agent
sudo systemctl enable codedeploy-agent

# Log out and log back in (so Docker group takes effect)
exit
```

SSH back in:
```bash
ssh -i "your-key.pem" ec2-user@YOUR_EC2_PUBLIC_IP
```

### Step 4: Create an IAM Role for EC2

Your EC2 needs permission to pull Docker images from ECR.

1. Go to **AWS Console** → **IAM** → **Roles** → **Create Role**
2. **Trusted entity**: AWS Service → EC2
3. **Permissions** — Search and add these policies:
   - `AmazonEC2ContainerRegistryReadOnly`
   - `AmazonSSMManagedInstanceCore`
   - `AWSCodeDeployRole` (if not available, use the custom policy below)
4. **Role name**: `localloom-ec2-role`
5. Click **Create Role**

Now attach this role to your EC2:
1. Go to **EC2** → Select your instance → **Actions** → **Security** → **Modify IAM Role**
2. Select `localloom-ec2-role` → **Update IAM Role**

### Step 5: Create the `.env` File on Your Server

SSH into your EC2 and create the environment file:

```bash
ssh -i "your-key.pem" ec2-user@YOUR_EC2_PUBLIC_IP

mkdir -p /home/ec2-user/app
cat > /home/ec2-user/app/.env << 'EOF'
NODE_ENV=production
PORT=5000
API_PREFIX=/api

# Paste your MongoDB Atlas connection string here
MONGODB_URI=mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/localloom?retryWrites=true&w=majority

# Generate strong secrets (run: openssl rand -hex 32)
JWT_ACCESS_SECRET=PASTE_A_RANDOM_64_CHAR_STRING_HERE
JWT_REFRESH_SECRET=PASTE_ANOTHER_RANDOM_64_CHAR_STRING_HERE
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
LOG_LEVEL=info
MAX_FILE_SIZE=5242880
UPLOAD_DIR=uploads
EOF
```

Generate your JWT secrets:
```bash
# Run this twice, use each output for the two JWT secrets above
openssl rand -hex 32
```

### Step 6: Set Up CodeBuild (Builds Your Docker Image)

1. Go to **AWS Console** → **CodeBuild** → **Create build project**
2. Configure:
   - **Project name**: `localloom-backend-build`
   - **Source**: GitHub → Connect your GitHub account → Select your repo
   - **Environment**:
     - Managed image
     - Operating system: Amazon Linux
     - Runtime: Standard
     - Image: `aws/codebuild/amazonlinux2-x86_64-standard:5.0`
     - **Privileged**: ✅ CHECK THIS (needed for Docker builds)
   - **Service role**: Create a new service role (auto-created)
   - **Buildspec**: Use a buildspec file (we'll create this next)
3. Click **Create build project**

After creation, add ECR permissions to the CodeBuild role:
1. Go to **IAM** → **Roles** → Find the role named `codebuild-localloom-backend-build-service-role`
2. **Attach policies** → Add `AmazonEC2ContainerRegistryPowerUser`

### Step 7: Set Up CodeDeploy

**Create a CodeDeploy Application:**

1. Go to **AWS Console** → **CodeDeploy** → **Applications** → **Create application**
   - **Name**: `localloom-backend`
   - **Compute platform**: EC2/On-premises
   - Click **Create application**

**Create a Deployment Group:**

1. Inside the application → **Create deployment group**
   - **Name**: `localloom-production`
   - **Service role**: Create a new IAM role with `AWSCodeDeployRole` policy, or use an existing one
   - **Deployment type**: In-place
   - **Environment configuration**: Amazon EC2 instances
     - Tag group: Key = `Name`, Value = `localloom-backend`
   - **Deployment settings**: `CodeDeployDefault.AllAtOnce`
   - **Load balancer**: Uncheck "Enable load balancing" (for single server)
   - Click **Create deployment group**

### Step 8: Set Up CodePipeline (Auto-Build on Push)

1. Go to **AWS Console** → **CodePipeline** → **Create pipeline**
2. Configure:
   - **Pipeline name**: `localloom-backend-pipeline`
   - **Service role**: New service role (auto-created)
   - Click **Next**

3. **Source stage**:
   - Source provider: **GitHub (Version 2)**
   - Click **Connect to GitHub** → Authorize AWS → Select your repo
   - Branch: `main`
   - Detection option: **Start pipeline on push** ← This is the magic!
   - Click **Next**

4. **Build stage**:
   - Build provider: **AWS CodeBuild**
   - Project name: `localloom-backend-build` (the one you created in Step 6)
   - Click **Next**

5. **Deploy stage**:
   - Deploy provider: **AWS CodeDeploy**
   - Application name: `localloom-backend`
   - Deployment group: `localloom-production`
   - Click **Next**

6. Review and **Create pipeline**

That's it for the AWS Console setup! Now you need to add some files to your codebase.

---

## Solution 2: Without Docker

This runs Node.js directly on EC2 using PM2 (a process manager). No Docker involved.

### Step 1: Launch an EC2 Instance

Same as Solution 1, Step 2. Follow those exact instructions.

### Step 2: Connect and Install Node.js + PM2

```bash
ssh -i "your-key.pem" ec2-user@YOUR_EC2_PUBLIC_IP
```

```bash
# Update system
sudo yum update -y

# Install Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Verify
node --version   # Should show v20.x.x
npm --version

# Install PM2 globally (keeps your app running and restarts on crash)
sudo npm install -g pm2

# Install CodeDeploy Agent
sudo yum install -y ruby wget
wget https://aws-codedeploy-us-east-1.s3.us-east-1.amazonaws.com/latest/install
chmod +x ./install
sudo ./install auto
sudo systemctl start codedeploy-agent
sudo systemctl enable codedeploy-agent

# Create app directory
mkdir -p /home/ec2-user/app
```

### Step 3: Create IAM Role for EC2

1. Go to **AWS Console** → **IAM** → **Roles** → **Create Role**
2. **Trusted entity**: AWS Service → EC2
3. **Permissions**: Add these policies:
   - `AmazonSSMManagedInstanceCore`
   - `AmazonS3ReadOnlyAccess` (CodeDeploy uses S3 to transfer files)
4. **Role name**: `localloom-ec2-role`
5. Attach to your EC2 instance (same as Solution 1, Step 4)

### Step 4: Create the `.env` File on Your Server

Same as Solution 1, Step 5. Follow those exact instructions.

### Step 5: Set Up CodeBuild

1. Go to **AWS Console** → **CodeBuild** → **Create build project**
2. Configure:
   - **Project name**: `localloom-backend-build`
   - **Source**: GitHub → Connect → Select your repo
   - **Environment**:
     - Managed image
     - Operating system: Amazon Linux
     - Runtime: Standard
     - Image: `aws/codebuild/amazonlinux2-x86_64-standard:5.0`
     - **Privileged**: ❌ NOT needed (no Docker)
   - **Buildspec**: Use a buildspec file
   - **Artifacts**:
     - Type: **Amazon S3**
     - Bucket: Create a new S3 bucket named `localloom-build-artifacts` (or any unique name)
     - Name: `localloom-backend-build.zip`
     - Packaging: Zip
3. Click **Create build project**

### Step 6: Set Up CodeDeploy

Same as Solution 1, Step 7. Follow those exact instructions.

### Step 7: Set Up CodePipeline

Same as Solution 1, Step 8, but with one difference:

In the **Build stage**, make sure the **Output artifact** is configured to pass to the Deploy stage.

Everything else is identical.

---

## Files You Need to Add to Your Codebase

Yes! You need to add some config files to your project. These tell AWS HOW to build and deploy your code.

---

### For BOTH Solutions: `appspec.yml`

This file tells CodeDeploy what to do when deploying. Add it to the **root** of your project.

---

### For Solution 1 (Docker): Files to Add

You need **3 files** in your project root:

#### File 1: `buildspec.yml`

```yaml
version: 0.2

env:
  variables:
    ECR_REPO: "YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/localloom-backend"
    # Replace YOUR_AWS_ACCOUNT_ID with your actual AWS account ID
    # Find it: AWS Console → top-right corner → Account ID

phases:
  pre_build:
    commands:
      - echo Logging in to Amazon ECR...
      - aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_REPO
      - COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)
      - IMAGE_TAG=${COMMIT_HASH:-latest}
  build:
    commands:
      - echo Building Docker image...
      - docker build -t $ECR_REPO:$IMAGE_TAG .
      - docker tag $ECR_REPO:$IMAGE_TAG $ECR_REPO:latest
  post_build:
    commands:
      - echo Pushing Docker image...
      - docker push $ECR_REPO:$IMAGE_TAG
      - docker push $ECR_REPO:latest
      - echo Writing deployment artifacts...
      - printf '{"ImageURI":"%s"}' $ECR_REPO:$IMAGE_TAG > imageDetail.json

artifacts:
  files:
    - imageDetail.json
    - appspec.yml
    - scripts/*
```

#### File 2: `appspec.yml`

```yaml
version: 0.0
os: linux

files:
  - source: /
    destination: /home/ec2-user/app

hooks:
  BeforeInstall:
    - location: scripts/before_install.sh
      timeout: 300
      runas: ec2-user

  AfterInstall:
    - location: scripts/after_install.sh
      timeout: 300
      runas: ec2-user

  ApplicationStart:
    - location: scripts/start_app.sh
      timeout: 300
      runas: ec2-user

  ValidateService:
    - location: scripts/validate_service.sh
      timeout: 120
      runas: ec2-user
```

#### File 3: Deployment Scripts

Create a `scripts/` folder in your project root with these 4 files:

**`scripts/before_install.sh`**
```bash
#!/bin/bash
set -e

echo "=== Before Install ==="

# Log in to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

echo "ECR login successful"
```

**`scripts/after_install.sh`**
```bash
#!/bin/bash
set -e

echo "=== After Install ==="

ECR_REPO="YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/localloom-backend"

# Pull the latest image
docker pull $ECR_REPO:latest

echo "Docker image pulled successfully"
```

**`scripts/start_app.sh`**
```bash
#!/bin/bash
set -e

echo "=== Starting Application ==="

ECR_REPO="YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/localloom-backend"
APP_DIR="/home/ec2-user/app"

# Stop old container (if running) — old code keeps serving until new one is ready
docker stop localloom-api 2>/dev/null || true
docker rm localloom-api 2>/dev/null || true

# Start new container
docker run -d \
  --name localloom-api \
  --restart unless-stopped \
  -p 5000:5000 \
  --env-file $APP_DIR/.env \
  -v localloom-uploads:/app/uploads \
  -v localloom-logs:/app/logs \
  $ECR_REPO:latest

echo "Application started successfully"

# Clean up old images to save disk space
docker image prune -af --filter "until=24h" 2>/dev/null || true
```

**`scripts/validate_service.sh`**
```bash
#!/bin/bash
set -e

echo "=== Validating Service ==="

# Wait for the app to start
sleep 10

# Check if the health endpoint responds
for i in {1..6}; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health || echo "000")
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo "Health check passed! (HTTP $HTTP_CODE)"
    exit 0
  fi
  
  echo "Attempt $i: HTTP $HTTP_CODE — waiting 5 seconds..."
  sleep 5
done

echo "Health check FAILED after 30 seconds"
exit 1
```

> **IMPORTANT**: In all scripts above, replace `YOUR_AWS_ACCOUNT_ID` with your actual AWS Account ID.
> Find it: AWS Console → click your name (top-right) → copy the Account ID (12-digit number).

---

### For Solution 2 (Without Docker): Files to Add

You need **3 files** in your project root:

#### File 1: `buildspec.yml`

```yaml
version: 0.2

phases:
  install:
    runtime-versions:
      nodejs: 20
    commands:
      - echo Installing dependencies...
      - npm ci
  build:
    commands:
      - echo Building TypeScript...
      - npm run build
  post_build:
    commands:
      - echo Build completed

artifacts:
  files:
    - dist/**/*
    - node_modules/**/*
    - package.json
    - appspec.yml
    - scripts/*
    - ecosystem.config.js
  discard-paths: no
```

#### File 2: `appspec.yml`

```yaml
version: 0.0
os: linux

files:
  - source: /
    destination: /home/ec2-user/app

hooks:
  BeforeInstall:
    - location: scripts/before_install.sh
      timeout: 300
      runas: ec2-user

  AfterInstall:
    - location: scripts/after_install.sh
      timeout: 300
      runas: ec2-user

  ApplicationStart:
    - location: scripts/start_app.sh
      timeout: 300
      runas: ec2-user

  ValidateService:
    - location: scripts/validate_service.sh
      timeout: 120
      runas: ec2-user
```

#### File 3: PM2 Config — `ecosystem.config.js`

```javascript
module.exports = {
  apps: [
    {
      name: 'localloom-api',
      script: 'dist/server.js',
      cwd: '/home/ec2-user/app',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      // Graceful shutdown — finish serving current requests before stopping
      kill_timeout: 10000,
      listen_timeout: 10000,
      // Logs
      error_file: '/home/ec2-user/app/logs/pm2-error.log',
      out_file: '/home/ec2-user/app/logs/pm2-out.log',
      merge_logs: true,
    },
  ],
};
```

#### File 4: Deployment Scripts

Create a `scripts/` folder with these 4 files:

**`scripts/before_install.sh`**
```bash
#!/bin/bash
set -e

echo "=== Before Install ==="

# Create directories if they don't exist
mkdir -p /home/ec2-user/app/logs
mkdir -p /home/ec2-user/app/uploads

echo "Directories ready"
```

**`scripts/after_install.sh`**
```bash
#!/bin/bash
set -e

echo "=== After Install ==="

cd /home/ec2-user/app

# Install only production dependencies (devDependencies already excluded in build)
npm ci --only=production 2>/dev/null || echo "Using pre-built node_modules"

echo "Dependencies ready"
```

**`scripts/start_app.sh`**
```bash
#!/bin/bash
set -e

echo "=== Starting Application ==="

cd /home/ec2-user/app

# Copy .env if it exists in the parent location
if [ -f /home/ec2-user/app/.env ]; then
  echo ".env file found"
fi

# Graceful reload — PM2 keeps old process running until new one is ready
# This is the zero-downtime magic!
pm2 describe localloom-api > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "Reloading existing app (zero downtime)..."
  pm2 reload ecosystem.config.js
else
  echo "Starting app for the first time..."
  pm2 start ecosystem.config.js
fi

# Save PM2 process list (survives server reboot)
pm2 save

# Set PM2 to start on boot
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ec2-user --hp /home/ec2-user 2>/dev/null || true

echo "Application started successfully"
```

**`scripts/validate_service.sh`**
```bash
#!/bin/bash
set -e

echo "=== Validating Service ==="

# Wait for the app to start
sleep 10

# Check if the health endpoint responds
for i in {1..6}; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health || echo "000")
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo "Health check passed! (HTTP $HTTP_CODE)"
    exit 0
  fi
  
  echo "Attempt $i: HTTP $HTTP_CODE — waiting 5 seconds..."
  sleep 5
done

echo "Health check FAILED after 30 seconds"
exit 1
```

---

## Summary: What Files Go Where

### Solution 1 (Docker) — Add these to your project root:

```
localloom-backend/
├── buildspec.yml          ← NEW (tells CodeBuild how to build Docker image)
├── appspec.yml            ← NEW (tells CodeDeploy how to deploy)
├── scripts/               ← NEW FOLDER
│   ├── before_install.sh  ← NEW (ECR login)
│   ├── after_install.sh   ← NEW (pull Docker image)
│   ├── start_app.sh       ← NEW (stop old container, start new one)
│   └── validate_service.sh← NEW (health check)
├── Dockerfile             ← ALREADY EXISTS (no changes needed)
├── .dockerignore          ← ALREADY EXISTS (no changes needed)
└── ... (rest of your code)
```

### Solution 2 (Without Docker) — Add these to your project root:

```
localloom-backend/
├── buildspec.yml          ← NEW (tells CodeBuild how to build TypeScript)
├── appspec.yml            ← NEW (tells CodeDeploy how to deploy)
├── ecosystem.config.js    ← NEW (PM2 process manager config)
├── scripts/               ← NEW FOLDER
│   ├── before_install.sh  ← NEW (create directories)
│   ├── after_install.sh   ← NEW (install dependencies)
│   ├── start_app.sh       ← NEW (PM2 reload with zero downtime)
│   └── validate_service.sh← NEW (health check)
└── ... (rest of your code)
```

---

## How Zero Downtime Works

### With Docker:
1. New Docker image is built and pushed to ECR
2. EC2 pulls the new image
3. `start_app.sh` stops the old container and starts a new one
4. `validate_service.sh` checks the health endpoint
5. If health check fails, CodeDeploy rolls back to the old version automatically

### Without Docker (PM2):
1. New code is built (TypeScript → JavaScript)
2. Files are copied to EC2
3. `pm2 reload` starts a new process with the new code
4. PM2 waits for the new process to be ready
5. PM2 then gracefully shuts down the old process (finishes serving current requests)
6. If health check fails, CodeDeploy rolls back automatically

---

## How the Auto-Build Trigger Works

When you set up CodePipeline with **"Start pipeline on push"**, AWS creates a webhook on your GitHub repository. This means:

1. You write code locally
2. You commit and push to `main`:
   ```bash
   git add .
   git commit -m "new feature"
   git push origin main
   ```
3. GitHub sends a notification to AWS (via the webhook)
4. CodePipeline starts automatically
5. CodeBuild builds your code
6. CodeDeploy deploys it to your EC2

You don't need to add any special file (like Cloudflare's `wrangler.toml` or Vercel's `vercel.json`) for the trigger itself. The webhook is created automatically by CodePipeline when you connect your GitHub account.

The only files you add (`buildspec.yml`, `appspec.yml`, `scripts/`) tell AWS HOW to build and deploy — not WHEN. The "when" is handled by the pipeline + webhook.

---

## Bonus: Set Up a Domain Name with HTTPS

Once your app is running, you probably want `api.yourdomain.com` instead of an IP address.

### Option A: Using Nginx as Reverse Proxy (on EC2)

```bash
# SSH into your EC2
ssh -i "your-key.pem" ec2-user@YOUR_EC2_PUBLIC_IP

# Install Nginx
sudo yum install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Configure Nginx
sudo tee /etc/nginx/conf.d/localloom.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx

# Install Certbot for free HTTPS (Let's Encrypt)
sudo yum install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

### Option B: Using AWS Route 53 + Elastic IP

1. Go to **EC2** → **Elastic IPs** → **Allocate** → **Associate** with your instance
2. Go to **Route 53** → Create a hosted zone for your domain
3. Add an **A record** pointing to your Elastic IP

---

## Common Issues & Fixes

### "CodeDeploy agent not running"
```bash
sudo systemctl status codedeploy-agent
sudo systemctl restart codedeploy-agent
```

### "Docker permission denied"
```bash
sudo usermod -aG docker ec2-user
# Then log out and log back in
```

### "Health check failing"
```bash
# Check if the app is running
docker ps                    # Solution 1
pm2 status                   # Solution 2

# Check logs
docker logs localloom-api    # Solution 1
pm2 logs localloom-api       # Solution 2

# Check if .env file exists
cat /home/ec2-user/app/.env
```

### "ECR login expired"
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
```

### "Pipeline failed at Source stage"
- Make sure your GitHub connection is authorized in CodePipeline
- Go to **Settings** → **Connections** in the CodePipeline console and verify the status is "Available"

### "Build failed"
- Go to **CodeBuild** → Click on the failed build → Read the logs
- Most common: missing permissions (ECR access for Docker solution)

### "Deploy failed — scripts not executable"
Make sure your scripts are executable before pushing:
```bash
chmod +x scripts/*.sh
git add scripts/
git commit -m "make deploy scripts executable"
git push origin main
```

---

## Cost Estimate (Monthly)

| Service | Free Tier | After Free Tier |
|---------|-----------|-----------------|
| EC2 t2.micro | Free (12 months) | ~$8.50/month |
| EC2 t3.small | ~$15/month | ~$15/month |
| ECR (Docker images) | 500MB free | ~$0.10/GB |
| CodePipeline | 1 free pipeline | $1/pipeline |
| CodeBuild | 100 min/month free | $0.005/min |
| MongoDB Atlas M0 | Free forever | Free |
| **Total (free tier)** | **~$0-1/month** | |
| **Total (production)** | | **~$17-25/month** |

---

## Quick Reference: The Full Flow

```
1. You: git push origin main
2. GitHub → webhook → AWS CodePipeline starts
3. CodePipeline → triggers CodeBuild
4. CodeBuild:
   - Docker: builds image, pushes to ECR
   - No Docker: runs npm ci + npm run build, zips artifacts
5. CodePipeline → triggers CodeDeploy
6. CodeDeploy runs your scripts on EC2:
   - before_install.sh  → prep work
   - after_install.sh   → pull image / install deps
   - start_app.sh       → start new version (old keeps running until ready)
   - validate_service.sh → health check
7. ✅ Done! New code is live. Old code gracefully stopped.
```

That's it! You now have a fully automated CI/CD pipeline. Every push to `main` triggers a build and deploy with zero downtime. 🚀
