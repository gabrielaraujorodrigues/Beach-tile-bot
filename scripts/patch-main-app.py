import sys
import re

if len(sys.argv) < 2:
    print("Usage: python3 patch-main-app.py <path/to/MainApplication.kt>")
    sys.exit(1)

path = sys.argv[1]

with open(path, "r") as f:
    content = f.read()

if "BotPackage" in content:
    print("MainApplication.kt already patched")
    sys.exit(0)

lines = content.split("\n")
print("Current getPackages lines:")
for i, line in enumerate(lines):
    if "getPackages" in line or "PackageList" in line:
        print(f"  Line {i+1}: {repr(line)}")

new_fn = "\n".join([
    "override fun getPackages(): List<ReactPackage> {",
    "          val packages = PackageList(this).packages",
    "          packages.add(BotPackage())",
    "          return packages",
    "        }"
])

pattern = r"override fun getPackages\(\): List<ReactPackage>\s*[=\n ]*PackageList\(this\)\.packages"

new_content, count = re.subn(pattern, new_fn, content, flags=re.DOTALL)

if count == 0:
    print("ERROR: Could not find getPackages pattern")
    print("File snippet:")
    print(content[:2000])
    sys.exit(1)

with open(path, "w") as f:
    f.write(new_content)

print(f"Successfully patched: {path}")
