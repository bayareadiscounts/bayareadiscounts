# GitHub IP Sync Scripts

This directory contains scripts to keep Azure Storage firewall rules synchronized with GitHub Actions IP ranges.

## Problem

GitHub Actions runners use a large pool of IP addresses (5,000+) that change periodically. To allow GitHub Actions deployments while keeping storage locked down, we need to maintain an up-to-date firewall allowlist.

## Solution

The `sync-github-ips.sh` script:

- Fetches current GitHub Actions IP ranges from `https://api.github.com/meta`
- Prioritizes the top 200 ranges by CIDR coverage (smaller CIDR = broader coverage)
- Updates Azure Storage firewall rules
- Should be run weekly via cron to catch changes

## Usage

### Manual Run

```bash
cd /path/to/baynavigator
./scripts/sync-github-ips.sh
```

### Automated (Recommended)

**Option 1: Local cron job**

```bash
# Edit crontab
crontab -e

# Add this line (runs every Sunday at 3 AM):
0 3 * * 0 cd /Users/steven/Documents/Github/baynavigator && ./scripts/sync-github-ips.sh >> /tmp/github-ip-sync.log 2>&1
```

**Option 2: GitHub Actions (self-updating)**

Create `.github/workflows/sync-github-ips.yml`:

```yaml
name: Sync GitHub IPs to Storage

on:
  schedule:
    - cron: '0 3 * * 0' # Every Sunday at 3 AM
  workflow_dispatch: # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Sync GitHub IPs
        run: ./scripts/sync-github-ips.sh
```

## Configuration

Edit the script to change:

- `RESOURCE_GROUP`: Azure resource group name
- `STORAGE_ACCOUNT`: Storage account name
- `MAX_RULES`: Maximum IP rules to add (Azure limit is ~200)

## How It Works

1. **Fetch**: Gets all GitHub Actions IP ranges from GitHub API
2. **Prioritize**: Sorts by CIDR size (e.g., /15 before /24 = broader coverage)
3. **Select**: Takes top 200 ranges (Azure Storage limit)
4. **Update**: Removes old rules and adds new ones

## Monitoring

Check sync logs:

```bash
tail -f /tmp/github-ip-sync.log
```

Verify current rules:

```bash
az storage account network-rule list \
  -g baynavigator-rg \
  --account-name badfuncstoragepe \
  --query "ipRules[].value"
```

## Alternative: Keep Storage Open During Deployment

If managing 200 IP rules becomes burdensome, consider the automated workflow approach instead:

```yaml
- name: Unlock storage
  run: az storage account update -g baynavigator-rg -n badfuncstoragepe --default-action Allow

- name: Deploy
  # ... deploy steps

- name: Lock storage
  run: az storage account update -g baynavigator-rg -n badfuncstoragepe --default-action Deny
```

## Notes

- GitHub's IP ranges change periodically (every few months)
- The script adds the broadest ranges first (better coverage with fewer rules)
- Some IPs may fail to add if they're duplicates or invalid (this is normal)
- Total coverage: ~200 out of 5,000+ ranges (prioritized for maximum coverage)
