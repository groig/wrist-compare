// Release preparation only. This module is not bundled into the band application.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

function metadata(root, tag) {
  assert.match(tag || '', /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/, 'Use a stable vMAJOR.MINOR.PATCH tag');
  const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
  const pkg = read('package.json');
  const lock = read('package-lock.json');
  const manifest = read('src/manifest.json');
  assert.match(pkg.name, /^wrist-(calc|dice|convert|compare)$/);
  assert.equal(manifest.package, 'org.roig.' + pkg.name.replace('-', ''), 'Unexpected app identity');
  assert.equal(pkg.version, tag.slice(1), 'Tag must match package.json version');
  assert.equal(manifest.versionName, pkg.version, 'Manifest version must match package.json');
  assert.equal(lock.version, pkg.version, 'Update package-lock.json version metadata');
  assert.equal(lock.packages[''].version, pkg.version, 'Update the lockfile root package version');
  assert.ok(Number.isSafeInteger(manifest.versionCode) && manifest.versionCode > 0, 'versionCode must be a positive integer');
  const filename = `${manifest.package}.release.${pkg.version}.rpk`;
  return { package: manifest.package, version: pkg.version, version_code: manifest.versionCode,
    rpk: `dist/${filename}`, checksum: `dist/${filename}.sha256` };
}

function validateSigningPair(privatePem, certificatePem) {
  if (!privatePem || !certificatePem) throw Error('Configure both RPK_PRIVATE_KEY and RPK_CERTIFICATE repository secrets');
  try {
    const key = crypto.createPrivateKey(privatePem);
    const cert = new crypto.X509Certificate(certificatePem);
    if (key.asymmetricKeyType !== 'rsa' || key.asymmetricKeyDetails.modulusLength < 2048 || !cert.checkPrivateKey(key)) {
      throw Error('Invalid pair');
    }
  } catch {
    throw Error('Signing secrets must contain a matching RSA private key (2048+ bits) and X.509 certificate in PEM format');
  }
}

function restoreSigning(root, env) {
  validateSigningPair(env.RPK_PRIVATE_KEY, env.RPK_CERTIFICATE);
  const dir = path.join(root, 'sign');
  const key = path.join(dir, 'private.pem');
  const cert = path.join(dir, 'certificate.pem');
  if (fs.existsSync(key) || fs.existsSync(cert)) throw Error('Refusing to overwrite an existing signing file');
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.chmodSync(dir, 0o700);
  const created = [];
  try {
    for (const [file, value] of [[key, env.RPK_PRIVATE_KEY], [cert, env.RPK_CERTIFICATE]]) {
      fs.writeFileSync(file, value, { flag: 'wx', mode: 0o600 });
      created.push(file);
    }
  } catch (error) {
    for (const file of created) fs.unlinkSync(file);
    throw error;
  }
}

if (require.main === module) {
  try {
    const root = path.resolve(__dirname, '..');
    const command = process.argv[2];
    if (command === 'metadata') {
      const data = { ...metadata(root, process.env.RELEASE_TAG), started_ms: Date.now() };
      if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(data).map(([key, value]) => `${key}=${value}\n`).join(''));
      }
      console.log(`Validated ${data.package} ${data.version} (versionCode ${data.version_code})`);
    } else if (command === 'sign') {
      restoreSigning(root, process.env);
      console.log('Restored and validated the existing app signing pair.');
    } else throw Error('Usage: node scripts/ci-release.cjs metadata|sign');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { metadata, validateSigningPair, restoreSigning };
