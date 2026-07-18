/**
 * Project Nexus — mDNS Server Advertiser
 *
 * Advertises the Nexus server on the local network as `_nexus._tcp`
 * so the Flutter mobile app can auto-discover it via multicast_dns,
 * regardless of which IP the server has or which access point the
 * safety officer is connected to.
 *
 * Usage: run this alongside `npm run dev`:
 *   node scripts/advertise-mdns.mjs
 *
 * Or add to dev script in package.json:
 *   "dev": "next dev --turbo -H 0.0.0.0 & node scripts/advertise-mdns.mjs"
 */

import { Bonjour } from 'bonjour-service';
import os from 'os';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Get the machine's non-loopback IPv4 addresses for logging
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const iface of Object.values(interfaces)) {
    for (const addr of iface ?? []) {
      if (addr.family === 'IPv4' && !addr.internal) {
        ips.push(addr.address);
      }
    }
  }
  return ips;
}

const bonjour = new Bonjour();

const service = bonjour.publish({
  name: 'Project Nexus Server',
  type: 'nexus',       // Becomes _nexus._tcp on the network
  port: PORT,
  txt: {
    version: '1.0',
    service: 'project-nexus',
  },
});

const ips = getLocalIPs();
console.log(`\n✅ mDNS advertisement started`);
console.log(`   Service: _nexus._tcp`);
console.log(`   Port: ${PORT}`);
console.log(`   Local IPs: ${ips.join(', ')}`);
console.log(`\n   Mobile app will auto-discover this server on the local network.\n`);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n📡 Stopping mDNS advertisement...');
  service.stop(() => {
    bonjour.destroy();
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  service.stop(() => {
    bonjour.destroy();
    process.exit(0);
  });
});

// Keep process alive
setInterval(() => {}, 60000);
