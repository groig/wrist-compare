const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { metadata, validateSigningPair, restoreSigning } = require('../scripts/ci-release.cjs');
const project = path.resolve(__dirname, '..');

function temporary(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wrist-release-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
function fixture(t) {
  const root = temporary(t);
  fs.mkdirSync(path.join(root, 'src'));
  const pkg = { name: 'wrist-dice', version: '1.2.3' };
  const manifest = { package: 'org.roig.wristdice', versionName: '1.2.3', versionCode: 9,
    features: [{ name: 'system.storage' }], permissions: [], icon: '/common/icon.png',
    router: { entry: 'pages/dice', pages: { 'pages/dice': { component: 'index' } } } };
  const lock = { version: '1.2.3', packages: { '': { version: '1.2.3' } } };
  function write() {
    for (const [name, value] of [['package.json', pkg], ['package-lock.json', lock], ['src/manifest.json', manifest]]) {
      fs.writeFileSync(path.join(root, name), JSON.stringify(value));
    }
  }
  write();
  return { root, pkg, manifest, lock, write };
}
let credentials;
test.before(() => {
  // Ephemeral fixtures only; no developer signing files are read or replaced.
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wrist-test-certificate-'));
  try {
    const result = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes',
      '-keyout', path.join(root, 'key'), '-out', path.join(root, 'cert'), '-days', '1', '-subj', '/CN=Ephemeral CI Test'], { stdio: 'ignore' });
    assert.equal(result.status, 0, 'OpenSSL must generate the ephemeral fixture');
    credentials = { RPK_PRIVATE_KEY: fs.readFileSync(path.join(root, 'key'), 'utf8'), RPK_CERTIFICATE: fs.readFileSync(path.join(root, 'cert'), 'utf8') };
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('release tag, package, lockfile and manifest agree; future versions work', t => {
  const f = fixture(t);
  assert.equal(metadata(f.root, 'v1.2.3').rpk, 'dist/org.roig.wristdice.release.1.2.3.rpk');
  const pkg = require('../package.json');
  assert.equal(metadata(project, 'v' + pkg.version).version, pkg.version);
});
test('mismatched, malformed and prerelease tags fail', t => {
  const f = fixture(t);
  for (const tag of ['', '1.2.3', 'v1.2.4', 'v01.2.3', 'v1.2.3-beta', 'v1.2.3\nanything']) assert.throws(() => metadata(f.root, tag));
});
test('invalid version codes and stale version metadata fail', t => {
  const f = fixture(t);
  for (const value of [0, -1, 1.5, '9', null]) { f.manifest.versionCode = value; f.write(); assert.throws(() => metadata(f.root, 'v1.2.3')); }
  f.manifest.versionCode = 9; f.lock.version = '1.2.2'; f.write(); assert.throws(() => metadata(f.root, 'v1.2.3'));
  f.lock.version = '1.2.3'; f.lock.packages[''].version = '1.2.2'; f.write(); assert.throws(() => metadata(f.root, 'v1.2.3'));
  f.lock.packages[''].version = '1.2.3'; f.manifest.versionName = '1.2.2'; f.write(); assert.throws(() => metadata(f.root, 'v1.2.3'));
});
test('missing, malformed and mismatched signing secrets fail without exposing values', () => {
  assert.throws(() => validateSigningPair('', ''), /Configure both/);
  assert.throws(() => validateSigningPair('private secret marker', 'certificate marker'), error => !error.message.includes('marker') && /matching RSA/.test(error.message));
  const wrong = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' });
  assert.throws(() => validateSigningPair(wrong, credentials.RPK_CERTIFICATE), /matching RSA/);
});
test('signing pair restores privately and neither complete nor partial files can be overwritten', t => {
  const root = temporary(t);
  restoreSigning(root, credentials);
  assert.equal(fs.statSync(path.join(root, 'sign')).mode & 0o777, 0o700);
  assert.equal(fs.statSync(path.join(root, 'sign/private.pem')).mode & 0o777, 0o600);
  assert.throws(() => restoreSigning(root, credentials), /overwrite/);
  fs.unlinkSync(path.join(root, 'sign/certificate.pem'));
  assert.throws(() => restoreSigning(root, credentials), /overwrite/);
  assert.ok(fs.readFileSync(path.join(root, 'sign/private.pem'), 'utf8') === credentials.RPK_PRIVATE_KEY, 'Existing signing key changed');
});

function artifactCase(t, mode) {
  const f = fixture(t);
  restoreSigning(f.root, credentials);
  const script = String.raw`
import importlib.util,json,pathlib,sys,time,zipfile,subprocess,os
root=pathlib.Path(sys.argv[1]);mode=sys.argv[3]
spec=importlib.util.spec_from_file_location('verify_rpk',sys.argv[2]);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
manifest=json.loads((root/'src/manifest.json').read_text());(root/'dist').mkdir()
artifact=root/'dist/org.roig.wristdice.release.1.2.3.rpk'
if mode!='missing':
 packed=dict(manifest)
 if mode=='identity':packed['package']='org.other.app'
 cert=subprocess.check_output(['openssl','x509','-in',str(root/'sign/certificate.pem'),'-outform','DER'])
 with zipfile.ZipFile(artifact,'w') as z:
  z.writestr('manifest.json',json.dumps(packed));z.writestr('pages/dice/index.js','fixture');z.writestr('common/icon.png','icon');z.writestr('META-INF/CERT','fixture')
  if mode=='secret':z.writestr('sign/private.pem','must never ship')
  if mode!='certificate':z.comment=cert
 if mode=='corrupt':
  raw=artifact.read_bytes();artifact.write_bytes(raw.replace(b'fixture',b'Fixture',1))
 if mode=='stale':os.utime(artifact,(1,1))
module.verify(root,artifact, int(time.time()*1000)-5000)
`;
  const result = spawnSync('python3', ['-c', script, f.root, path.join(project, 'scripts/verify-rpk.py'), mode], { encoding: 'utf8' });
  return { ...f, result };
}
test('fresh RPK passes integrity/identity/certificate checks and gets a checksum', t => {
  const f = artifactCase(t, 'valid');
  assert.equal(f.result.status, 0, f.result.stderr);
  const file = path.join(f.root, 'dist/org.roig.wristdice.release.1.2.3.rpk');
  assert.equal(fs.readFileSync(file + '.sha256', 'utf8'), crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') + '  ' + path.basename(file) + '\n');
});
for (const mode of ['missing', 'stale', 'identity', 'corrupt', 'secret', 'certificate']) {
  test('reject ' + mode + ' RPK before publication', t => {
    const f = artifactCase(t, mode);
    assert.notEqual(f.result.status, 0);
    assert.ok(!fs.existsSync(path.join(f.root, 'dist/org.roig.wristdice.release.1.2.3.rpk.sha256')));
  });
}

function publish(t, mode) {
  const root = temporary(t), bin = path.join(root, 'bin'), log = path.join(root, 'calls');
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'gh'), `#!/usr/bin/env node
const fs=require('node:fs'),a=process.argv.slice(2),mode=process.env.MOCK_MODE;
fs.appendFileSync(process.env.MOCK_LOG,JSON.stringify(a)+'\\n');
if(a[1]==='view'){if(mode==='fresh'||mode==='create-failure')process.exit(1);console.log(JSON.stringify({isDraft:mode!=='published'}));}
if(a[1]==='upload'&&mode==='upload-failure')process.exit(1);
if(a[1]==='create'&&mode==='create-failure')process.exit(1);
`, { mode: 0o700 });
  const rpk = path.join(root, 'release file.rpk'), checksum = rpk + '.sha256';
  if (mode !== 'missing') { fs.writeFileSync(rpk, 'rpk'); fs.writeFileSync(checksum, 'checksum'); }
  const result = spawnSync('bash', [path.join(project, 'scripts/publish-release.sh')], { encoding: 'utf8', env: {
    ...process.env, PATH: bin + path.delimiter + process.env.PATH, MOCK_MODE: mode, MOCK_LOG: log,
    GH_REPO: 'example/test', RELEASE_TAG: 'v1.2.3', RUNNER_TEMP: root, RPK_PATH: rpk, CHECKSUM_PATH: checksum, GITHUB_STEP_SUMMARY: path.join(root, 'summary')
  } });
  return { result, calls: fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n').map(JSON.parse) : [] };
}
test('new releases remain drafts until both validated files are uploaded', t => {
  const { result, calls } = publish(t, 'fresh');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(calls.map(a => a[1]), ['view', 'create', 'edit']);
  assert.ok(calls[1].includes('--draft') && calls[1].includes('--verify-tag'));
  assert.ok(calls[2].includes('--draft=false'));
});
test('draft retry uploads assets before publishing', t => {
  const { result, calls } = publish(t, 'draft');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(calls.map(a => a[1]), ['view', 'upload', 'edit']);
});
for (const mode of ['published', 'upload-failure', 'create-failure', 'missing']) {
  test('publication stops for ' + mode, t => {
    const { result, calls } = publish(t, mode);
    assert.notEqual(result.status, 0);
    assert.ok(!calls.some(a => a[1] === 'edit'));
    if (mode === 'published') assert.deepEqual(calls.map(a => a[1]), ['view']);
  });
}
