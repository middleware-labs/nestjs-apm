# Terraform Deployment for Nest.js App on ECS Fargate

## Overview

This Terraform configuration provisions the necessary AWS infrastructure to deploy a Nest.js application on ECS Fargate with an Application Load Balancer (ALB) fronting the service. The key features of this configuration include:

- **VPC and Networking:**  
  - A new VPC with CIDR block `10.0.0.0/16`
  - Two public subnets in different Availability Zones
  - An Internet Gateway and a route table to allow outbound internet access

- **Security Groups:**  
  - An ALB security group that permits inbound HTTP traffic on port 3000  
  - An ECS security group that allows inbound traffic from the ALB on port 3000

- **Application Load Balancer (ALB):**  
  - An ALB deployed in the public subnets
  - A listener configured on port 3000
  - A target group with health checks targeting port 3000

- **ECS Resources:**  
  - An ECS Cluster for running the tasks
  - An ECS Task Definition with a container definition for your Nest.js app (replace `"YOUR_DOCKER_IMAGE"` with your actual Docker image)
  - An ECS Fargate Service that registers with the ALB target group

## Prerequisites

- [Terraform](https://www.terraform.io/downloads.html) installed on your machine.
- AWS credentials configured via the AWS CLI or environment variables.
- A Docker image for your Nest.js application published and accessible.

## How to Use This Script

```
terraform init
terraform plan
terraform apply
```

To delete the resources
```
terraform destroy
```

## Architecture Diagram

The diagram below outlines the key components created by this Terraform configuration:

```mermaid
flowchart TD
    subgraph VPC[10.0.0.0/16 VPC]
      IGW[Internet Gateway]
      RT[Route Table]
      subgraph Subnet1[Public Subnet 1 (us-east-1a)]
      end
      subgraph Subnet2[Public Subnet 2 (us-east-1b)]
      end
    end

    IGW --> RT
    Subnet1 --> RT
    Subnet2 --> RT

    ALB[Application Load Balancer (Port 3000)]
    Listener[ALB Listener (Port 3000)]
    TG[Target Group (Port 3000, Health Check)]
    
    Subnet1 --> ALB
    Subnet2 --> ALB

    ALB --> Listener
    Listener --> TG

    ECSCluster[ECS Cluster]
    ECSTask[Task Definition (Nest.js App)]
    ECSService[ECS Fargate Service]
    IAMRole[ecsTaskExecutionRole]
    
    TG --> ECSService
    ECSService --> ECSCluster
    ECSService --> ECSTask
    ECSTask --> IAMRole
