import os
import re
from pathlib import Path

from hatchling.builders.hooks.plugin.interface import BuildHookInterface


PLATFORM_TAG = re.compile(r"^[a-z0-9]+(?:[._][a-z0-9]+)*$")


class CustomBuildHook(BuildHookInterface):
    def initialize(self, version, build_data):
        platform_tag = os.environ.get("RELIC_WHEEL_PLATFORM", "")
        if not PLATFORM_TAG.fullmatch(platform_tag):
            raise RuntimeError(
                "RELIC_WHEEL_PLATFORM must contain the target wheel platform tag"
            )

        binary_name = "relic.exe" if platform_tag.startswith("win") else "relic"
        binary = Path(self.root, "relic", binary_name)
        if not binary.is_file():
            raise RuntimeError(f"native Relic binary is missing: {binary}")
        if binary_name != "relic.exe" and not os.access(binary, os.X_OK):
            raise RuntimeError(f"native Relic binary is not executable: {binary}")

        build_data["force_include"] = {
            str(binary): f"relic/{binary_name}",
        }
        build_data["tag"] = f"py3-none-{platform_tag}"
        build_data["pure_python"] = False
