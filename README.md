# Arr House

A clean, unified dashboard and management interface for the **\*arr** media stack — including **Sonarr**, **Radarr**, **Lidarr**, and **Prowlarr**.

---

## Features

- **Unified Search**: Search across movies, TV series, and music simultaneously from a single bar.
- **Smart Calendar**: Responsive schedule and agenda view for upcoming episodes, movies, and album releases.
- **Queue & Activity**: Monitor download clients, live transfer progress, download speeds, and queue health.
- **Library Management**: Browse your media library with rich artwork and metadata.
- **Role-Based Accounts**: Multi-user support with admin and standard user permissions.
- **Dark Mode Aesthetic**: Refined, eye-safe high-contrast dark interface crafted for desktop and mobile.

---

## Deployment & Installation Guides

### 1. Docker Compose (Recommended)

Save the following as `docker-compose.yml`:

```yaml
services:
  arr-house:
    image: ghcr.io/<your-github-or-registry-username>/arr-house:latest
    container_name: arr-house
    restart: unless-stopped
    pull_policy: always
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - NODE_ENV=production
      - ARR_DATA_DIR=/app/data
    volumes:
      - ./data:/app/data
```

Start the container:
```bash
docker compose up -d
```

Access the interface at `http://<server-ip>:3000`.

---

### 2. TrueNAS SCALE Installation

#### TrueNAS SCALE 24.10+ (Electric Eel)
1. In TrueNAS SCALE, navigate to **Apps** &rarr; **Discover Apps** &rarr; click **Custom App** (or **Install via Docker Compose**).
2. Paste the `docker-compose.yml` snippet above into the configuration field.
3. Replace `./data` with your ZFS dataset mount path (e.g., `/mnt/tank/appdata/arr-house:/app/data`).
4. Click **Save & Install**.

#### TrueNAS SCALE 24.04 / 23.10 (Dragonfish & Cobia)
1. Go to **Apps** &rarr; **Discover Apps** &rarr; click **Custom App**.
2. Fill out the application form:
   - **Application Name**: `arr-house`
   - **Image Repository**: `ghcr.io/<your-registry-username>/arr-house`
   - **Image Tag**: `latest`
   - **Container Environment Variables**:
     - `PORT`: `3000`
     - `NODE_ENV`: `production`
     - `ARR_DATA_DIR`: `/app/data`
   - **Port Forwarding**:
     - Host Port: `3000`
     - Container Port: `3000`
   - **Storage (Host Path)**:
     - Host Path: `/mnt/tank/appdata/arr-house` (your dataset)
     - Mount Path: `/app/data`
3. Click **Install**.

---

### 3. Container Updates

Because TrueNAS Custom Apps utilize container images from registries rather than official catalog catalogs:

- **1-Click Updates (Compose):** If you deployed with `pull_policy: always`, click the **three dots (`⋮`)** on the Arr House card in TrueNAS &rarr; click **Restart**. TrueNAS will query the registry, pull the updated image layers, and restart.
- **Manual Image Pull:** In TrueNAS, go to **Apps** &rarr; **Manage Container Images** (top-right menu) &rarr; find the image and click **Pull**. Then restart or edit-save the app.
- **Automated Hands-Free Updates:** Deploy **Watchtower** on your Docker host or TrueNAS instance to automatically update containers whenever a new image is published.

---

### 4. Build from Source (Node.js Bare Metal)

Requires **Node.js 20+** and **npm**:

```bash
git clone https://github.com/<username>/arr-house.git
cd arr-house
npm install
npm run build
npm start
```

---

## Initial Configuration

1. Open `http://<your-server>:3000` to create your initial administrator account.
2. Navigate to **Settings &rarr; Services** to connect your applications:
   - **Sonarr**: Base URL & API Key (found in Sonarr under *Settings &rarr; General &rarr; Security*)
   - **Radarr**: Base URL & API Key (found in Radarr under *Settings &rarr; General &rarr; Security*)
   - **Lidarr**: Base URL & API Key (found in Lidarr under *Settings &rarr; General &rarr; Security*)
   - **Prowlarr**: Base URL & API Key (found in Prowlarr under *Settings &rarr; General &rarr; Security*)
3. If connecting through Cloudflare Tunnels or a reverse proxy without exposed ports, toggle **Cloudflare Tunnel / Reverse Proxy (Disable Port)** on the respective service card.
