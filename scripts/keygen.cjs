// Creates a PRIVATE development signing identity. Never overwrite or publish it.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const dir = path.resolve(__dirname, '../sign');
const key = path.join(dir, 'private.pem');
const cert = path.join(dir, 'certificate.pem');
if (fs.existsSync(key) || fs.existsSync(cert)) {
  console.error('Signing files already exist. Keep them; refusing to overwrite.');
  process.exit(1);
}
fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
const r = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048',
  '-nodes', '-keyout', key, '-out', cert, '-days', '3650',
  '-subj', '/CN=Wrist Compare Development'], { stdio: 'inherit' });
if (r.error || r.status !== 0) {
  console.error(r.error ? r.error.message : 'OpenSSL failed.');
  for (const f of [key, cert]) if (fs.existsSync(f)) fs.unlinkSync(f);
  process.exit(1);
}
fs.chmodSync(key, 0o600);
console.log('Created sign/private.pem and certificate.pem. Back them up privately.');
console.log('This app signing key is NOT your Gadgetbridge Bluetooth authentication key.');
