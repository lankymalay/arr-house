# Arr House

A clean, unified dashboard, discovery radar, and management interface for the **\*arr** media stack — bringing **Sonarr**, **Radarr**, **Lidarr**, and **Prowlarr** into a single, high-performance web experience.

---

## Key Features

### 1. Unified Omnisearch & Instant Media Import
- **Universal Multi-Service Search**: Query TV shows, movies, and music simultaneously from a single search interface.
- **Library State Detection**: Automatically detects whether an item is already monitored, downloading, or in your library.
- **Deep Addition Modal**:
  - **Quality Profiles**: Dynamically loads quality profiles directly from your respective Sonarr/Radarr/Lidarr instances.
  - **Root Folders**: Select target library disk paths per download.
  - **Selective TV Monitoring**: Choose to monitor All Seasons, Future Seasons, Missing, Latest Season, First Season, or selectively pick specific episodes.
  - **Music Monitor Rules**: Select complete discographies, future albums, or studio albums only.
  - **Search on Add**: Trigger immediate Prowlarr/indexer searches upon adding media.

### 2. Complete Library & Catalog Management
- **Unified Library Explorer**: Browse your entire movie collection, series library, and artist discographies in responsive grid or compact list views.
- **Filter & Search**: Filter by media type (TV, Movie, Music) or download status (*Downloaded*, *Downloading*, *Missing*).
- **Interactive Media Modals**:
  - **TV Series**: View season breakdown, air dates, episode overviews, toggle monitoring per episode, or trigger targeted searches.
  - **Movies**: Overview, release dates, file metadata, and quick delete/unmonitor controls.
  - **Music & Artists (Lidarr)**: Comprehensive artist view featuring studio album grids, release years, track counts, album monitoring switches, and high-resolution artist backdrop artwork.
- **Instant Library Rescan & Refresh**: Trigger manual re-scans directly from the UI.

### 3. Queue, Waitlist & Indexer Health
- **Live Download Queue**: Real-time monitoring of all active downloads across your download clients (qBittorrent, Transmission, SABnzbd, NZBGet, Deluge, etc.).
- **Detailed Progress Metrics**: Live progress bars, transfer speeds, downloaded size, and estimated time of completion (ETA).
- **Queue Actions**: Cancel or remove downloads from the queue with an optional blocklist flag.
- **Waitlist / Missing Media**: Dedicated view highlighting missing episodes, unreleased movies, or incomplete discographies with 1-click "Search All" actions.
- **Download History**: Comprehensive timeline of completed, imported, or failed media transfers.
- **Prowlarr Indexer Monitor**: Inspect all configured Usenet and torrent indexers, priority levels, response latencies, and failure alerts.

### 4. Smart Calendar
- **Unified Schedule**: Consolidated schedule view for TV episode air dates, cinema/digital movie releases, and album drops across all your connected services.
- **Multiple Views**: Switch between day agenda, multi-day, and month calendar perspectives.
- **Status Indicators**: Visual cues for premiered episodes, season finales, and monitored releases.

### 5. Forthcoming Releases & Industry Radar
- **External Discovery Radar**: Discover upcoming media releases across the entertainment industry powered by external metadata (TMDB, TVMaze, and MusicBrainz).
- **Spotlight Highlights**: Curated spotlight carousel showcasing the most anticipated movies, series premieres, and studio albums over the next 90 days.
- **Filtered Categories**: Quickly toggle between All Releases, Theatrical/Streaming Movies, TV Shows, and Music Albums.
- **1-Click Import**: Found something you like? Click to instantly search and queue it in your Sonarr, Radarr, or Lidarr instance before it premieres.

### 6. Intelligent Media Artwork & Asset Engine
- **Universal MediaPoster**: Gracefully handles missing, unloaded, or rate-limited artwork with custom-styled typography, category icons, and theme gradients.
- **Artist Artwork Resolver**: Multi-tier artist imagery pipeline querying Fanart.tv, MusicBrainz, and Last.fm for high-resolution artist photography.
- **Asset Prefetching & Idle Warming**: Concurrency-limited background image preloading and route prefetching for seamless navigation.

### 7. Multi-User Access & Role-Based Security
- **Role-Based Accounts**: Built-in support for **Administrator** and **Standard User** accounts.
  - *Admins*: Full configuration control, service management, user administration, and system controls.
  - *Standard Users*: Access to unified search, library browsing, queues, calendars, and media requests without exposure to backend settings or API tokens.
- **Secure Password Hashing**: Passwords stored using industry-standard `scrypt` hashing with unique cryptographic salts.
- **Stateless JWT Sessions**: Authenticated via JSON Web Tokens stored securely in the browser.

### 8. Enterprise & Homelab Network Compatibility
- **Cloudflare Tunnels & Reverse Proxies**: Dedicated toggle per service to disable port-specific appending for setups using hostname-based subdomains or path routing (e.g. `https://sonarr.yourdomain.com`).
- **Custom Base URLs & URL Paths**: Supports custom subpaths (e.g. `/sonarr`, `/radarr`).
- **Connection Health Checks**: Real-time ping testing displaying connection status, service versions, and roundtrip latency.

### 9. Privacy & Safe Git Practices
- **Zero-Leak Local Database**: All configuration, user databases, and API keys are stored in a standalone local data folder (`data/arr-hub.json`).
- **Protected Secrets**: `data/` and `.env` files are strictly `.gitignore`d, ensuring your private service URLs and API keys are never published to GitHub.

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
4. Click **Test & Save** on each service card to verify connectivity.

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite
- **Backend Server**: Node.js, Express, TypeScript (compiled via esbuild)
- **Data Persistence**: Local JSON / SQLite document database with atomic writes
- **Security**: Scrypt password hashing, Stateless JWTs, input validation
- **Containerization**: Docker multi-stage build, Docker Compose, TrueNAS SCALE ready
