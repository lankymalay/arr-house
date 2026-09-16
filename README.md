# Arr House

Unified dashboard for Sonarr, Radarr, Lidarr, and Prowlarr.

## Quick Start

### Docker Compose

```yaml
services:
  arr-house:
    image: arr-house:latest
    build: .
    container_name: arr-house
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - PORT=3000
      - NODE_ENV=production
```

Run:
```bash
docker compose up -d --build
```

Access at `http://<your-ip>:3000`.

---

### TrueNAS SCALE (1-Click Updates via GitHub Packages / GHCR)

To get the **"Update Available"** banner and 1-click update button in TrueNAS SCALE, TrueNAS needs to pull a compiled container image from a registry (such as GitHub Container Registry, `ghcr.io`), rather than building locally from source.

#### Step 1: Enable Automated Builds on GitHub
This repository includes `.github/workflows/docker-publish.yml`. When you push code to GitHub:
1. GitHub Actions automatically builds the multi-arch (`amd64` / `arm64`) Docker container and publishes it to `ghcr.io/<your-github-username>/arr-house:latest`.
2. Ensure the package is public so TrueNAS can pull it without authentication:
   - On GitHub, go to your repository or profile -> **Packages** -> **arr-house** -> **Package settings**.
   - Scroll to **Danger Zone** -> **Change package visibility** -> Set to **Public**.

---

#### Step 2: Install in TrueNAS SCALE

##### Option A: TrueNAS SCALE 24.10+ (Electric Eel - Docker Compose)
1. Go to **Apps** -> **Discover Apps** -> **Custom App** (or **Install via Docker Compose**).
2. Use this Compose configuration:

```yaml
services:
  arr-house:
    image: ghcr.io/<your-github-username>/arr-house:latest
    container_name: arr-house
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - /mnt/your-pool/appdata/arr-house:/app/data
    environment:
      - PORT=3000
      - NODE_ENV=production
```
*(Replace `<your-github-username>` and `/mnt/your-pool/appdata/arr-house` with your dataset path).*

##### Option B: TrueNAS SCALE 24.04 (Dragonfish / Cobia - Custom App Form)
1. Go to **Apps** -> **Discover Apps** -> **Custom App**.
2. Fill out:
   - **Application Name**: `arr-house`
   - **Image repository**: `ghcr.io/<your-github-username>/arr-house`
   - **Image tag**: `latest`
   - **Container Environment Variables**:
     - `PORT`: `3000`
     - `NODE_ENV`: `production`
   - **Port Forwarding**:
     - Container Port: `3000`
     - Host Port: `3000`
   - **Storage (Host Path)**:
     - Host Path: `/mnt/your-pool/appdata/arr-house`
     - Mount Path: `/app/data`
3. Click **Install**.

---

#### Step 3: Updating in TrueNAS SCALE

> **Note on "Check for Updates":** TrueNAS SCALE's global "Check for Updates" button is *only* displayed for official Catalog apps. For **Custom Apps** using GitHub Docker images, use either:

- **Method A (Easiest for TrueNAS SCALE 24.10+ Electric Eel):**
  Add `pull_policy: always` to your Compose YAML:
  ```yaml
  services:
    arr-house:
      image: ghcr.io/<your-github-username>/arr-house:latest
      pull_policy: always
  ```
  Whenever you push a new release to GitHub, simply click the **three dots (`⋮`)** on the Arr House card in TrueNAS -> click **Restart**. TrueNAS will query GitHub, pull the newest image layer, and restart.

- **Method B (All TrueNAS SCALE Versions via "Manage Container Images"):**
  1. Go to **Apps** in TrueNAS.
  2. Click the **three dots (`⋮`)** or **Settings** icon in the top right corner -> **Manage Container Images**.
  3. Locate `ghcr.io/<your-github-username>/arr-house`, click its menu -> **Pull** (or click **Pull Image** at top right).
  4. Go back to **Installed Apps** and click **Restart** (or **Edit** -> **Save**) on Arr House.

- **Method C (Zero-Touch):**
  Deploy **Watchtower** on TrueNAS, which automatically polls your GitHub Container Registry and updates containers with zero manual steps.

---

### Local Docker Compose (Build from Source)

### Node.js (Bare Metal)

Requires **Node.js 20+**:

```bash
git clone https://github.com/lankymalay/arr-house.git
cd arr-house
npm install
npm run build
npm start
```

---

## Configuration

1. Open `http://localhost:3000` to complete initial admin account setup.
2. Go to **Settings** and add your Sonarr, Radarr, Lidarr, and Prowlarr URLs and API keys (Settings > General > Security in each app).
3. If using Cloudflare Tunnels or a reverse proxy on standard HTTPS, toggle **Cloudflare Tunnel / Reverse Proxy (Disable Port)** for each service.
