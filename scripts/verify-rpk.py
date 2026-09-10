"""Verify the exact fresh release artifact and write a portable SHA-256 sidecar."""
import argparse
import hashlib
import json
import pathlib
import subprocess
import zipfile


def verify(root, artifact, started_ms):
    root = pathlib.Path(root).resolve()
    manifest = json.loads((root / "src/manifest.json").read_text())
    expected = root / "dist" / f"{manifest['package']}.release.{manifest['versionName']}.rpk"
    artifact = pathlib.Path(artifact).resolve()
    if artifact != expected:
        raise ValueError("Unexpected release output path")
    if not artifact.is_file():
        raise ValueError("Expected release RPK is missing")
    if artifact.stat().st_mtime_ns // 1_000_000 < started_ms:
        raise ValueError("Refusing a stale RPK from before this build")
    with zipfile.ZipFile(artifact) as archive:
        if archive.testzip() is not None:
            raise ValueError("RPK ZIP integrity check failed")
        names = archive.namelist()
        if any(name.lower().endswith((".pem", ".key")) or name.lower().startswith("sign/") for name in names):
            raise ValueError("RPK contains signing files")
        packaged = json.loads(archive.read("manifest.json"))
        for key in ("package", "versionName", "versionCode", "features", "permissions", "router", "icon"):
            if packaged.get(key) != manifest.get(key):
                raise ValueError(f"Packaged manifest mismatch: {key}")
        route = manifest["router"]["entry"]
        component = manifest["router"]["pages"][route]["component"]
        for required in (f"{route}/{component}.js", manifest["icon"].lstrip("/"), "META-INF/CERT"):
            if required not in names:
                raise ValueError(f"Missing packaged resource: {required}")
    result = subprocess.run(["openssl", "x509", "-in", str(root / "sign/certificate.pem"), "-outform", "DER"], capture_output=True)
    if result.returncode or not result.stdout or result.stdout not in artifact.read_bytes():
        raise ValueError("RPK does not contain this app's signing certificate")
    digest = hashlib.sha256(artifact.read_bytes()).hexdigest()
    checksum = artifact.with_suffix(artifact.suffix + ".sha256")
    checksum.write_text(f"{digest}  {artifact.name}\n")
    return checksum


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("artifact")
    parser.add_argument("--started-ms", required=True, type=int)
    args = parser.parse_args()
    try:
        result = verify(pathlib.Path(__file__).resolve().parent.parent, args.artifact, args.started_ms)
        print(f"Verified fresh release, packaged identity, ZIP integrity and signing certificate: {result.name}")
    except (ValueError, OSError, KeyError, zipfile.BadZipFile) as error:
        parser.exit(1, f"RPK validation failed: {error}\n")
