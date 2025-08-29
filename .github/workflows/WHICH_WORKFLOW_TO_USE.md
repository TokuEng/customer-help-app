# Which Workflow to Use?

This directory contains multiple deployment workflows. Here's what each does:

## Active Workflows (Choose ONE):

### 1. `deploy.yml` (RECOMMENDED)
- **What it does**: Builds Docker images and deploys using Container Registry
- **When to use**: For production deployments with better caching and reliability
- **Required secret**: `DIGITALOCEAN_ACCESS_TOKEN`
- **Features**: 
  - Builds Docker images with caching
  - Tags with commit SHA for versioning
  - Handles app creation/update automatically
  - Provides detailed deployment summary

### 2. `deploy-docker.yml`
- **What it does**: Similar to deploy.yml but simpler
- **When to use**: Alternative Docker-based deployment
- **Required secret**: `DO_ACCESS_TOKEN` (different name!)
- **Note**: Recently fixed syntax error

### 3. `deploy-to-do.yml`
- **What it does**: Direct git deployment (no Docker)
- **When to use**: For simpler deployments without Docker
- **Required secret**: `DIGITALOCEAN_ACCESS_TOKEN`
- **Note**: Builds happen on DigitalOcean, not in GitHub

## Recommendation

Use `deploy.yml` as it's the most complete and well-tested workflow. It includes:
- Proper error handling
- Build caching for faster deployments
- Deployment status monitoring
- Clear summary reports

## To Disable Duplicate Workflows

If you want to use only one workflow, rename the others by adding `.disabled` to their filenames:
- `deploy-docker.yml.disabled`
- `deploy-to-do.yml.disabled`

This prevents them from running while keeping them for reference.
