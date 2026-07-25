# Self-hosted rental setup

This setup keeps the central app and photo archive on the owner's computer at home. Each rented booth is a separate kiosk with its own access link and dashboard. The kiosk's camera and printer are deliberately kept local to the event machine.

## What this release provides

- Stable HTTPS hosting through a **named Cloudflare Tunnel**.
- Separate kiosk and dashboard credentials for every rental; only SHA-256 token hashes are kept on the home server.
- Isolated live-control queue per kiosk, and tenant-filtered dashboard session history.
- A loopback-only kiosk-edge service so a remote booth can use its own digiCamControl and printer.

The current storage remains local files under `data/`. Back up that folder and `frames/` every day. This is suitable for a small owner-operated fleet, not yet a high-availability SaaS platform.

## 1. Prepare the home host

1. Reserve a stable hostname such as `booth.example.com` in Cloudflare. Do not use a `trycloudflare.com` quick tunnel: its address changes every restart.
2. Create a named Cloudflare Tunnel and route the hostname to it. A typical `config.yml` is:

   ```yaml
   tunnel: YOUR_TUNNEL_ID
   credentials-file: C:\\Users\\YOUR_USER\\.cloudflared\\YOUR_TUNNEL_ID.json
   ingress:
     - hostname: booth.example.com
       service: http://127.0.0.1:4173
     - service: http_status:404
   ```

3. Install the tunnel as a Windows service, or start it with `cloudflared tunnel run photobooth-home`. The tunnel must be the only public entry point; do not open port 4173 on your router.
4. In `.env` on the home host, set strong values:

   ```dotenv
   PHOTOBOOTH_RENTAL_MODE=true
   PHOTOBOOTH_RENTAL_ADMIN_TOKEN=use-a-long-random-secret-here
   PUBLIC_SHARE_ORIGIN=https://booth.example.com
   ```

   `PHOTOBOOTH_RENTAL_ADMIN_TOKEN` must never begin with `VITE_`, be committed, or be shared with renters.

   `npm run host` also excludes browser AI credentials by default because every `VITE_*` key becomes visible in the kiosk's downloaded JavaScript. Do not enable `PHOTOBOOTH_ALLOW_BROWSER_AI=true` unless the AI key has strict usage limits and is safe to expose.
5. Start the application:

   ```powershell
   npm run host
   ```

   The app listens only on `127.0.0.1:4173`; Cloudflare Tunnel publishes it as HTTPS. For unattended operation, run both the tunnel and `npm run host` through Task Scheduler or a service manager, and configure restart-on-failure.

## 2. Provision a rental booth

On the home host, create one record per physical kiosk:

```powershell
npm run rentals -- create --id wedding-minh-2026 --tenant minh-wedding --name "Đám cưới Minh" --origin https://booth.example.com --expires 2026-08-01T23:59:59+07:00
```

The command prints two links once:

- **Kiosk link**: only open it on the event computer connected to the camera/printer.
- **Dashboard link**: give it to the renter or operator who is allowed to monitor that kiosk.

The secret follows `#access=` in the URL fragment, which browsers do not send to the server. Still treat each link like a password. If a link is leaked or the rental ends early, revoke it:

```powershell
npm run rentals -- revoke --id wedding-minh-2026
```

## 3. Prepare the event kiosk

The browser on the event computer receives the app from the home host, but direct camera access stays in that browser. DSLR capture and silent printing use a tiny local service.

1. Install Node.js, digiCamControl (if using DSLR), printer driver, and this project on the kiosk computer.
2. Set environment variables before starting the edge service:

   ```powershell
   $env:EDGE_ALLOWED_ORIGINS='https://booth.example.com'
   $env:PRINTER_NAME='Name shown by Windows printer settings' # optional
   npm run kiosk-edge
   ```

   It listens only at `http://127.0.0.1:8787`; no router port is opened. Configure it to launch on sign-in.
3. Open the provisioned kiosk link in Edge/Chrome, grant camera permission, and test one capture and one print before handing the booth over.

The `EDGE_ALLOWED_ORIGINS` value must exactly match the stable HTTPS hostname. An empty or incorrect value intentionally prevents the hosted app from triggering hardware.

### Offline safety

If the event Internet or the home host is temporarily unavailable while a guest finishes, the kiosk saves the complete upload payload in the browser's persistent local storage first. The result screen states that it is waiting to sync; it will retry when the browser receives an `online` event and every 30 seconds thereafter. Once the home host confirms it, the kiosk creates the normal QR link.

Do not clear browser data, use private browsing, or reinstall the kiosk browser while there are pending uploads. Before packing down an event kiosk, wait until the result/status message confirms that all queued sessions have synchronized.

## Daily operations and limits

- Keep the home PC powered, prevent sleep, use a UPS, and retain a second Internet connection if events are important.
- Back up `data/saved-sessions/`, `data/guest-outputs/`, `data/frame-packages/`, `data/rental/`, and `frames/` off the home PC.
- Guest QR links expire after two hours in the current implementation. Adjust the retention policy before selling longer access.
- If the Internet fails at an event, remote dashboard/control remains unavailable, but completed photo sessions wait safely on the kiosk and synchronize automatically once connectivity returns.
