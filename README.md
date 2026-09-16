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

#### Step 3: 1-Click Updates in TrueNAS SCALE
- Whenever you push new commits or create a release on GitHub, GitHub Actions builds and updates `ghcr.io/<your-github-username>/arr-house:latest`.
- TrueNAS SCALE periodically checks the registry image digest. When an update is detected, an **"Update Available"** badge appears on the Arr House app card.
- Click **"Update"** in TrueNAS: TrueNAS downloads the new image layer and restarts the container. Your configuration and database in `/app/data` persist safely across updates.

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
