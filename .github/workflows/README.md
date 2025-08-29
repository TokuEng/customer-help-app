# GitHub Actions Deployment Setup

This workflow automatically builds and deploys your Customer Help Center application to DigitalOcean on every push to the main branch.

## Prerequisites

1. DigitalOcean account with:
   - Container Registry enabled
   - An existing registry named `workco`
   - Database cluster (if not already created)
   - Spaces bucket for image storage (if not already created)

2. The app specification file (`.do/app.yaml`) already configured with your environment variables

## Required GitHub Secrets

You need to configure the following secret in your GitHub repository:

### `DIGITALOCEAN_ACCESS_TOKEN`

This is your DigitalOcean personal access token that allows GitHub Actions to:
- Push Docker images to your container registry
- Deploy and update your DigitalOcean App

**To create this token:**

1. Go to [DigitalOcean API Tokens](https://cloud.digitalocean.com/account/api/tokens)
2. Click "Generate New Token"
3. Give it a name like "GitHub Actions Deploy"
4. Select **Write** scope (this includes read permissions)
5. Click "Generate Token"
6. Copy the token immediately (you won't see it again!)

**To add it to GitHub:**

1. Go to your GitHub repository
2. Click on Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `DIGITALOCEAN_ACCESS_TOKEN`
5. Value: Paste your DigitalOcean token
6. Click "Add secret"

## Workflow Features

- **Automatic Builds**: Builds both web and API Docker images
- **Container Registry**: Pushes images to DigitalOcean Container Registry
- **Smart Deployment**: Updates existing app or creates new one if needed
- **Build Caching**: Uses Docker layer caching for faster builds
- **Status Monitoring**: Waits for deployment to complete and reports status
- **Deployment Summary**: Provides links and image tags in GitHub Actions summary

## Manual Deployment

You can also trigger the deployment manually:
1. Go to Actions tab in your GitHub repository
2. Select "Deploy to DigitalOcean" workflow
3. Click "Run workflow"
4. Select the branch and click "Run workflow"

## Monitoring Deployments

- **GitHub Actions**: Check the Actions tab for build/deploy logs
- **DigitalOcean**: Monitor at https://cloud.digitalocean.com/apps
- **App URL**: The workflow outputs your app URL in the summary

## Troubleshooting

### Build Failures
- Check Docker build logs in GitHub Actions
- Ensure Dockerfile paths are correct
- Verify all required files are committed

### Registry Push Failures
- Ensure the registry `workco` exists in DigitalOcean
- Check that the access token has write permissions
- Verify registry login is successful

### Deployment Failures
- Check the app spec file (`.do/app.yaml`) is valid
- Ensure all environment variables are properly configured
- Verify database and other resources exist
- Check DigitalOcean app logs for runtime errors

### Common Issues

1. **"App not found"**: Normal on first deployment, the workflow will create it
2. **"Registry login failed"**: Check your DIGITALOCEAN_ACCESS_TOKEN secret
3. **"Deployment phase: ERROR"**: Check DigitalOcean app logs for details
4. **Build timeout**: Consider optimizing Dockerfile or increasing timeout
