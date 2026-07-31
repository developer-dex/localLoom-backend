# LocalLoom AWS — Complete Teardown Guide

How to destroy all AWS resources so you stop getting billed. The order below is the **reverse** of the deployment guide — we delete dependent resources first, then the infrastructure they depended on.

---

## Option 1: If You Used Terraform (Fastest)

```bash
cd localloom-backend/terraform

# Step 1: Disable RDS deletion protection
# Edit rds.tf: change deletion_protection = true → false
terraform apply -target=aws_db_instance.main

# Step 2: Destroy everything
terraform destroy
# Type "yes" when prompted (~10-15 minutes)
```

After destroy, check for leftovers (skip to "Final Verification" section).

---

## Option 2: Manual Teardown (AWS Console UI + CLI)

Delete in this exact order. Each step includes both UI and CLI options.

---

### Step 1: Delete Route 53 DNS Records

> We delete DNS first because it points to the ALB. Once DNS is gone, no traffic reaches your infrastructure.

**AWS Console UI Steps:**

1. Go to AWS Console → Search **Route 53** → Click it
2. Click **Hosted zones** → Click on `localloom.com.au`
3. Find the **A record** for `api.localloom.com.au`
4. Select it (checkbox) → Click **Delete record** → Confirm
5. Also delete any CNAME records that were created for ACM certificate validation
6. (Optional) If you created this hosted zone just for LocalLoom and don't need it:
   - Delete ALL records except the NS and SOA records (those can't be deleted manually)
   - Then click **Delete hosted zone** → Confirm

**CLI Alternative:**

```bash
# Find hosted zone ID
aws route53 list-hosted-zones \
  --query 'HostedZones[?Name==`localloom.com.au.`].Id' \
  --output text

# List all records to find the one to delete
aws route53 list-resource-record-sets --hosted-zone-id <zone-id>

# Delete the A record
aws route53 change-resource-record-sets \
  --hosted-zone-id <zone-id> \
  --change-batch '{
    "Changes": [{
      "Action": "DELETE",
      "ResourceRecordSet": {
        "Name": "api.localloom.com.au",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "<alb-zone-id>",
          "DNSName": "<alb-dns-name>",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'

# (Optional) Delete hosted zone entirely
aws route53 delete-hosted-zone --id <zone-id>
```

---

### Step 2: Delete HTTPS Listener & HTTP Listener from ALB

> Listeners must be removed before the ALB and target group can be deleted.

**AWS Console UI Steps:**

1. Go to **EC2** → Left sidebar → **Load Balancers**
2. Click on **localloom-alb**
3. Go to **Listeners** tab
4. Select the **HTTPS:443** listener → Click **Delete** → Confirm
5. Select the **HTTP:80** listener → Click **Delete** → Confirm

**CLI Alternative:**

```bash
# List listeners
aws elbv2 describe-listeners \
  --load-balancer-arn <alb-arn> \
  --query 'Listeners[].ListenerArn' --output text

# Delete each listener
aws elbv2 delete-listener --listener-arn <listener-arn-1>
aws elbv2 delete-listener --listener-arn <listener-arn-2>
```

---

### Step 3: Delete Application Load Balancer (ALB)

> ALB must be deleted before its security group can be removed.

**AWS Console UI Steps:**

1. Go to **EC2** → **Load Balancers**
2. Select **localloom-alb** (checkbox)
3. Click **Actions** → **Delete load balancer**
4. Type `confirm` → Click **Delete**
5. Wait ~1-2 minutes for it to disappear

**CLI Alternative:**

```bash
aws elbv2 delete-load-balancer --load-balancer-arn <alb-arn>
aws elbv2 wait load-balancers-deleted --load-balancer-arns <alb-arn>
```

---

### Step 4: Delete Target Group

> Target group can only be deleted after the ALB that references it is gone.

**AWS Console UI Steps:**

1. Go to **EC2** → Left sidebar → **Target Groups**
2. Select **localloom-tg** (checkbox)
3. Click **Actions** → **Delete** → Confirm

**CLI Alternative:**

```bash
aws elbv2 delete-target-group --target-group-arn <target-group-arn>
```

---

### Step 5: Delete ACM Certificate

> Certificate can only be deleted after the ALB listener that uses it is gone.

**AWS Console UI Steps:**

1. Go to AWS Console → Search **Certificate Manager** → Click it
2. Find the certificate for `api.localloom.com.au`
3. Click on it → Click **Delete** → Type `delete` → Confirm

**CLI Alternative:**

```bash
aws acm list-certificates --region ap-southeast-2 \
  --query 'CertificateSummaryList[?DomainName==`api.localloom.com.au`].CertificateArn' --output text

aws acm delete-certificate --certificate-arn <cert-arn> --region ap-southeast-2
```

---

### Step 6: Terminate EC2 Instance

> EC2 must be terminated before its security group and subnet can be deleted.

**AWS Console UI Steps:**

1. Go to **EC2** → Left sidebar → **Instances**
2. Find **localloom-api** instance
3. Select it (checkbox)
4. Click **Instance state** → **Terminate instance** → Confirm
5. Wait for state to show "Terminated" (~1-2 minutes)

**CLI Alternative:**

```bash
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=localloom-api" \
  --query 'Reservations[].Instances[].InstanceId' --output text

aws ec2 terminate-instances --instance-ids <instance-id>
aws ec2 wait instance-terminated --instance-ids <instance-id>
```

---

### Step 7: Release Elastic IP (if you allocated one)

> Unattached Elastic IPs cost $3.65/month. Release it after EC2 is terminated.

**AWS Console UI Steps:**

1. Go to **EC2** → Left sidebar → **Elastic IPs**
2. If you see one tagged with `localloom`:
   - Select it → Click **Actions** → **Release Elastic IP address** → Confirm

**CLI Alternative:**

```bash
aws ec2 describe-addresses \
  --filters "Name=tag:Name,Values=localloom*" \
  --query 'Addresses[].AllocationId' --output text

aws ec2 release-address --allocation-id <allocation-id>
```

---

### Step 8: Delete Key Pair

**AWS Console UI Steps:**

1. Go to **EC2** → Left sidebar → **Key Pairs**
2. Find **localloom-key**
3. Select it → Click **Actions** → **Delete** → Type `Delete` → Confirm
4. Also delete the local `.pem` file: `rm -f localloom-key.pem`

**CLI Alternative:**

```bash
aws ec2 delete-key-pair --key-name localloom-key
rm -f localloom-key.pem
```

---

### Step 9: Delete RDS Database

> RDS deletion takes ~5-10 minutes. Must disable deletion protection first.

**AWS Console UI Steps:**

1. Go to AWS Console → Search **RDS** → Click it
2. Click on **localloom-db**
3. Click **Modify** (top right)
4. Scroll to bottom → **Uncheck** "Enable deletion protection"
5. Click **Continue** → Select **Apply immediately** → Click **Modify DB instance**
6. Wait for status to return to "Available"
7. Now select **localloom-db** → Click **Actions** → **Delete**
8. Uncheck "Create final snapshot" (unless you want a backup)
9. Check "I acknowledge that upon instance deletion, automated backups, including system snapshots and point-in-time recovery, will no longer be available"
10. Type `delete me` → Click **Delete**
11. Wait ~5-10 minutes for it to disappear

**After RDS is deleted, delete the subnet group:**

12. Go to **RDS** → Left sidebar → **Subnet groups**
13. Select **localloom-db-subnet** → Click **Delete** → Confirm

**CLI Alternative:**

```bash
# Disable deletion protection
aws rds modify-db-instance \
  --db-instance-identifier localloom-db \
  --no-deletion-protection --apply-immediately

aws rds wait db-instance-available --db-instance-identifier localloom-db

# Delete (skip final snapshot)
aws rds delete-db-instance \
  --db-instance-identifier localloom-db \
  --skip-final-snapshot --delete-automated-backups

aws rds wait db-instance-deleted --db-instance-identifier localloom-db

# Delete subnet group
aws rds delete-db-subnet-group --db-subnet-group-name localloom-db-subnet
```

---

### Step 10: Delete S3 Bucket

> Bucket must be emptied before it can be deleted.

**AWS Console UI Steps:**

1. Go to AWS Console → Search **S3** → Click it
2. Click on **localloom-uploads-prod**
3. Click **Empty** → Type `permanently delete` → Click **Empty**
4. Wait for emptying to complete
5. Go back to bucket list → Select **localloom-uploads-prod** (checkbox)
6. Click **Delete** → Type bucket name → Click **Delete bucket**

**CLI Alternative:**

```bash
# Empty bucket (including versioned objects)
aws s3 rm s3://localloom-uploads-prod --recursive

# Delete versions if versioning was enabled
aws s3api list-object-versions --bucket localloom-uploads-prod \
  --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}' --output json > /tmp/versions.json
aws s3api delete-objects --bucket localloom-uploads-prod --delete file:///tmp/versions.json

aws s3api list-object-versions --bucket localloom-uploads-prod \
  --query '{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}' --output json > /tmp/markers.json
aws s3api delete-objects --bucket localloom-uploads-prod --delete file:///tmp/markers.json

# Delete bucket
aws s3 rb s3://localloom-uploads-prod
```

---

### Step 11: Delete ECR Repository

**AWS Console UI Steps:**

1. Go to AWS Console → Search **ECR** → Click it
2. Select **localloom-backend** repository (checkbox)
3. Click **Delete** → Type `delete` → Confirm

> This also deletes all Docker images stored in the repository.

**CLI Alternative:**

```bash
aws ecr delete-repository \
  --repository-name localloom-backend \
  --force --region ap-southeast-2
```

---

### Step 12: Delete Secrets Manager Secret

**AWS Console UI Steps:**

1. Go to AWS Console → Search **Secrets Manager** → Click it
2. Click on **localloom/production**
3. Click **Actions** → **Delete secret**
4. Set waiting period to **7 days** (minimum) or check "Delete without waiting period" if available
5. Click **Delete**

**CLI Alternative:**

```bash
aws secretsmanager delete-secret \
  --secret-id localloom/production \
  --force-delete-without-recovery \
  --region ap-southeast-2
```

---

### Step 13: Delete Security Groups

> Delete in reverse dependency order: RDS SG → EC2 SG → ALB SG

**AWS Console UI Steps:**

1. Go to **VPC** → Left sidebar → **Security Groups**
2. Find and delete in this order:
   - Select **localloom-rds-sg** → Click **Actions** → **Delete security groups** → Confirm
   - Select **localloom-ec2-sg** → Click **Actions** → **Delete security groups** → Confirm
   - Select **localloom-alb-sg** → Click **Actions** → **Delete security groups** → Confirm

> If deletion fails with "has a dependent object", wait a few minutes for EC2/RDS/ALB to fully terminate.

**CLI Alternative:**

```bash
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=localloom-*" \
  --query 'SecurityGroups[].{Name:GroupName,Id:GroupId}' --output table

aws ec2 delete-security-group --group-id <rds-sg-id>
aws ec2 delete-security-group --group-id <ec2-sg-id>
aws ec2 delete-security-group --group-id <alb-sg-id>
```

---

### Step 14: Delete VPC & Networking

> If you used the "VPC and more" wizard, deleting the VPC from the console will also delete subnets, route tables, and the internet gateway automatically.

**AWS Console UI Steps:**

1. Go to **VPC** → Left sidebar → **Your VPCs**
2. Select **localloom-vpc** (checkbox)
3. Click **Actions** → **Delete VPC**
4. It will show all associated resources that will be deleted (subnets, route tables, IGW)
5. Type `delete` → Click **Delete**

> If it fails, manually delete in this order:
> - Subnets (VPC → Subnets → select each localloom subnet → Delete)
> - Route Tables (VPC → Route Tables → select localloom-public-rt → Delete)
> - Internet Gateway (VPC → Internet Gateways → select localloom-igw → Detach → Delete)
> - Then try deleting VPC again

**CLI Alternative:**

```bash
# Delete subnets
aws ec2 delete-subnet --subnet-id <public-subnet-1-id>
aws ec2 delete-subnet --subnet-id <public-subnet-2-id>
aws ec2 delete-subnet --subnet-id <private-subnet-1-id>
aws ec2 delete-subnet --subnet-id <private-subnet-2-id>

# Disassociate and delete route table
aws ec2 describe-route-tables \
  --filters "Name=tag:Name,Values=localloom*" \
  --query 'RouteTables[].{Id:RouteTableId,Assoc:Associations[].RouteTableAssociationId}' --output json

aws ec2 disassociate-route-table --association-id <assoc-id>
aws ec2 delete-route-table --route-table-id <rtb-id>

# Detach and delete internet gateway
aws ec2 detach-internet-gateway --internet-gateway-id <igw-id> --vpc-id <vpc-id>
aws ec2 delete-internet-gateway --internet-gateway-id <igw-id>

# Delete VPC
aws ec2 delete-vpc --vpc-id <vpc-id>
```

---

### Step 15: Delete IAM Role & Instance Profile

> IAM is global (not region-specific), so this works from any region.

**AWS Console UI Steps:**

1. Go to **IAM** → Left sidebar → **Roles**
2. Search for `localloom-ec2-role`
3. Click on it → Click **Delete**
4. Type the role name → Confirm

> This automatically detaches policies and removes it from the instance profile.

**CLI Alternative:**

```bash
# Detach all policies
aws iam detach-role-policy --role-name localloom-ec2-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
aws iam detach-role-policy --role-name localloom-ec2-role \
  --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite
aws iam detach-role-policy --role-name localloom-ec2-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
aws iam detach-role-policy --role-name localloom-ec2-role \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy

# Remove from instance profile and delete
aws iam remove-role-from-instance-profile \
  --instance-profile-name localloom-ec2-role --role-name localloom-ec2-role
aws iam delete-instance-profile --instance-profile-name localloom-ec2-role
aws iam delete-role --role-name localloom-ec2-role
```

---

### Step 16: Delete CloudWatch Log Group

**AWS Console UI Steps:**

1. Go to **CloudWatch** → Left sidebar → **Log groups**
2. Select `/localloom/api` (checkbox)
3. Click **Actions** → **Delete log group(s)** → Confirm

**CLI Alternative:**

```bash
aws logs delete-log-group --log-group-name /localloom/api
```

---

## Final Verification

Run these commands to confirm nothing is left (make sure you're in the correct region):

```bash
echo "=== Checking for remaining LocalLoom resources ==="

echo "EC2 instances:"
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=localloom*" "Name=instance-state-name,Values=running,stopped" \
  --query 'Reservations[].Instances[].{Id:InstanceId,State:State.Name}' --output table

echo "RDS instances:"
aws rds describe-db-instances \
  --query 'DBInstances[?starts_with(DBInstanceIdentifier,`localloom`)].DBInstanceIdentifier' --output text

echo "Load Balancers:"
aws elbv2 describe-load-balancers \
  --query 'LoadBalancers[?starts_with(LoadBalancerName,`localloom`)].LoadBalancerName' --output text

echo "S3 Buckets:"
aws s3 ls | grep localloom

echo "ECR Repos:"
aws ecr describe-repositories \
  --query 'repositories[?starts_with(repositoryName,`localloom`)].repositoryName' --output text

echo "Secrets:"
aws secretsmanager list-secrets \
  --query 'SecretList[?starts_with(Name,`localloom`)].Name' --output text

echo "Elastic IPs:"
aws ec2 describe-addresses \
  --filters "Name=tag:Name,Values=localloom*" \
  --query 'Addresses[].PublicIp' --output text

echo "VPCs:"
aws ec2 describe-vpcs \
  --filters "Name=tag:Name,Values=localloom*" \
  --query 'Vpcs[].VpcId' --output text

echo "Security Groups:"
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=localloom-*" \
  --query 'SecurityGroups[].GroupName' --output text

echo "=== Done ==="
```

If all outputs are empty, you're clean. No more billing.

---

## Things That Still Might Bill You (Easy to Miss)

| Resource | How to check | Why it bills |
|----------|-------------|--------------|
| EBS Snapshots | `aws ec2 describe-snapshots --owner-ids self` | RDS automated backups create snapshots |
| RDS Final Snapshot | `aws rds describe-db-snapshots` | If you chose "create final snapshot" during deletion |
| Elastic IP (unattached) | `aws ec2 describe-addresses` | $3.65/month if not attached to running instance |
| Route 53 hosted zone | `aws route53 list-hosted-zones` | $0.50/month per zone |
| CloudWatch log storage | `aws logs describe-log-groups` | Charges for stored log data |
| S3 versioned objects | Check bucket versioning | Old versions still take space |

### Clean up leftover snapshots:

```bash
# List RDS snapshots
aws rds describe-db-snapshots \
  --query 'DBSnapshots[?starts_with(DBSnapshotIdentifier,`localloom`)].DBSnapshotIdentifier' --output text

# Delete each one
aws rds delete-db-snapshot --db-snapshot-identifier <snapshot-id>

# List EBS snapshots
aws ec2 describe-snapshots --owner-ids self \
  --query 'Snapshots[].{Id:SnapshotId,Desc:Description}' --output table

# Delete if related to localloom
aws ec2 delete-snapshot --snapshot-id <snap-id>
```

---

## Deletion Order Summary

Here's the order at a glance (reverse of deployment):

| Step | Resource | Why this order |
|------|----------|---------------|
| 1 | Route 53 DNS records | Points to ALB — remove first to stop traffic |
| 2 | ALB Listeners | Must be removed before ALB deletion |
| 3 | ALB (Load Balancer) | References target group and security group |
| 4 | Target Group | Referenced by ALB |
| 5 | ACM Certificate | Referenced by ALB listener |
| 6 | EC2 Instance | Uses security group, subnet, IAM role |
| 7 | Elastic IP | Attached to EC2 |
| 8 | Key Pair | Used by EC2 |
| 9 | RDS Database + Subnet Group | Uses security group, private subnets |
| 10 | S3 Bucket | Independent but might have data |
| 11 | ECR Repository | Independent — stores Docker images |
| 12 | Secrets Manager | Independent — stores env vars |
| 13 | Security Groups | Referenced by EC2, RDS, ALB (all gone now) |
| 14 | VPC + Subnets + IGW + Routes | Everything lived inside this network |
| 15 | IAM Role + Instance Profile | Was attached to EC2 (now terminated) |
| 16 | CloudWatch Log Group | Independent — stores logs |

---

## Nuclear Option: Close the AWS Account

If this was a dedicated AWS account for LocalLoom and you want zero risk of surprise bills:

1. Go to AWS Console → Click your account name (top right) → **Account**
2. Scroll to bottom → Click **Close Account**
3. AWS gives you 90 days to reopen if you change your mind

This is the only 100% guarantee of no future charges.
