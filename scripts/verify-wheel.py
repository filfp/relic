import sys
from pathlib import Path
from zipfile import ZipFile


def fail(message):
    raise SystemExit(f"wheel verification failed: {message}")


if len(sys.argv) != 3:
    fail("usage: verify-wheel.py <wheel> <platform-tag>")

wheel = Path(sys.argv[1])
platform_tag = sys.argv[2]
expected_tag = f"py3-none-{platform_tag}"
if not wheel.name.endswith(f"-{expected_tag}.whl"):
    fail(f"filename does not end in -{expected_tag}.whl: {wheel.name}")

with ZipFile(wheel) as archive:
    names = archive.namelist()
    wheel_metadata_paths = [name for name in names if name.endswith(".dist-info/WHEEL")]
    if len(wheel_metadata_paths) != 1:
        fail("wheel must contain exactly one .dist-info/WHEEL file")

    metadata = archive.read(wheel_metadata_paths[0]).decode("utf8")
    if "Root-Is-Purelib: false" not in metadata:
        fail("WHEEL metadata does not declare platform-specific installation")
    if f"Tag: {expected_tag}" not in metadata:
        fail(f"WHEEL metadata does not declare Tag: {expected_tag}")

    binary_name = "relic/relic.exe" if platform_tag.startswith("win") else "relic/relic"
    if binary_name not in names:
        fail(f"wheel does not contain {binary_name}")
    unexpected = "relic/relic" if binary_name.endswith(".exe") else "relic/relic.exe"
    if unexpected in names:
        fail(f"wheel unexpectedly contains {unexpected}")

    if not any(name.endswith(".dist-info/licenses/LICENSE") for name in names):
        fail("wheel does not contain the project license")
    if not any(
        name.endswith(".dist-info/licenses/THIRD_PARTY_NOTICES.md")
        for name in names
    ):
        fail("wheel does not contain third-party notices")

    if not platform_tag.startswith("win"):
        mode = archive.getinfo(binary_name).external_attr >> 16
        if mode & 0o111 == 0:
            fail("bundled binary is not executable")

print(f"Verified native wheel: {wheel.name}")
