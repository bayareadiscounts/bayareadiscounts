# Bay Navigator Tor Hidden Service

This directory contains infrastructure to deploy a dedicated `.onion` address for Bay Navigator, allowing users to access the site directly through the Tor network.

## Architecture

```
Tor Network → .onion address → Azure B1s VM (Tor + nginx) → https://baynavigator.org
```

- **VM**: Azure B1s (1 vCPU, 1GB RAM) - ~$4-7/month
- **OS**: Ubuntu 22.04 LTS
- **Services**: Tor hidden service + nginx reverse proxy
- **Backend**: Proxies all requests to `https://baynavigator.org`

## Prerequisites

Before deploying, you need to set up these GitHub secrets:

### 1. Generate SSH Key Pair

```bash
# Generate a new SSH key pair for the Tor VM
ssh-keygen -t ed25519 -C "tor-vm" -f tor-vm-key -N ""

# Display the public key (add to TOR_VM_SSH_PUBLIC_KEY secret)
cat tor-vm-key.pub

# Display the private key (add to TOR_VM_SSH_PRIVATE_KEY secret)
cat tor-vm-key
```

### 2. Add GitHub Secrets

| Secret                   | Description                                              |
| ------------------------ | -------------------------------------------------------- |
| `TOR_VM_SSH_PUBLIC_KEY`  | Contents of `tor-vm-key.pub`                             |
| `TOR_VM_SSH_PRIVATE_KEY` | Contents of `tor-vm-key` (for retrieving .onion address) |

The workflow also uses existing Azure OIDC secrets:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`

## Deployment

### Deploy the VM

1. Go to **Actions** → **Deploy Tor Hidden Service VM**
2. Click **Run workflow**
3. Select action: **deploy**
4. Click **Run workflow**

The deployment takes ~5 minutes. Cloud-init will:

- Install Tor and nginx
- Configure the hidden service
- Generate your unique .onion address
- Start all services

### Get Your .onion Address

After deployment completes, wait 2-3 minutes, then:

**Option A: Via GitHub Actions**

1. Go to **Actions** → **Deploy Tor Hidden Service VM**
2. Click **Run workflow**
3. Select action: **get-onion-address**
4. Check the workflow summary for your address

**Option B: Via SSH**

```bash
# SSH to the VM
ssh azureuser@baynavigator-tor-<unique-id>.westus2.cloudapp.azure.com

# Get the .onion address
sudo cat /var/lib/tor/baynavigator/hostname
```

## Testing

1. Open **Tor Browser**
2. Navigate to your `.onion` address (e.g., `http://abc123...xyz.onion`)
3. You should see Bay Navigator!

## Security Notes

- The VM only exposes SSH (port 22) to the internet
- Tor hidden services don't require inbound ports - all traffic is outbound through Tor
- The private key for your .onion address is stored at `/var/lib/tor/baynavigator/`
- Consider backing up `/var/lib/tor/baynavigator/hs_ed25519_secret_key` to preserve your .onion address

## Backup Your .onion Address

Your .onion address is derived from a private key. If you lose it, you lose the address forever.

```bash
# SSH to the VM and backup the key
ssh azureuser@<vm-fqdn>
sudo cat /var/lib/tor/baynavigator/hs_ed25519_secret_key | base64

# Store this base64 string securely (e.g., Azure Key Vault)
```

## Cost

| Resource            | Monthly Cost     |
| ------------------- | ---------------- |
| B1s VM              | ~$4-7            |
| Managed Disk (30GB) | ~$1.20           |
| Public IP           | ~$3              |
| **Total**           | **~$8-11/month** |

## Maintenance

The VM runs unattended with automatic security updates via Ubuntu's `unattended-upgrades`.

To check service status:

```bash
ssh azureuser@<vm-fqdn>
sudo systemctl status tor
sudo systemctl status nginx
```

To view Tor logs:

```bash
sudo journalctl -u tor -f
```

## Removing the Hidden Service

To tear down the infrastructure:

```bash
az group delete --name baynavigator-tor-rg --yes
```

**Warning**: This permanently deletes your .onion address unless you've backed up the private key.
