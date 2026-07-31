import sys
import subprocess
from pathlib import Path


def main():
    here = Path(__file__).parent
    binary = here / ("relic.exe" if sys.platform == "win32" else "relic")

    if not binary.exists():
        print(
            "relic: binary not found. Re-install the package for your platform.",
            file=sys.stderr,
        )
        sys.exit(1)

    result = subprocess.run([str(binary)] + sys.argv[1:])
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
