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

### TrueNAS SCALE (Custom App)

Paste directly into the Custom App Compose field:

```yaml
services:
  arr-house:
    build: https://github.com/lankymalay/arr-house.git#main
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

---

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
