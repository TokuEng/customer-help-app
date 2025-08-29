# Deployment Status Badge

Add this badge to your main README.md to show the deployment status:

```markdown
[![Deploy to DigitalOcean](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/deploy.yml/badge.svg)](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/deploy.yml)
```

Replace `YOUR_USERNAME` and `YOUR_REPO` with your actual GitHub username and repository name.

For example, if your repository is at `https://github.com/TokuEng/customer-help-center`, use:

```markdown
[![Deploy to DigitalOcean](https://github.com/TokuEng/customer-help-center/actions/workflows/deploy.yml/badge.svg)](https://github.com/TokuEng/customer-help-center/actions/workflows/deploy.yml)
```

This badge will show:
- ✅ Green when deployment is successful
- 🟡 Yellow when deployment is in progress
- ❌ Red when deployment fails

Click on the badge to see detailed deployment logs.
