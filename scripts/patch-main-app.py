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

  print("=== File before patch (relevant lines) ===")
  for i, line in enumerate(content.split("\n")):
      if "getPackages" in line or "PackageList" in line:
          print(f"  Line {i+1}: {repr(line)}")

  new_content = content
  count = 0

  # Pattern 1: single-expression form
  # override fun getPackages(): List<ReactPackage> = PackageList(this).packages
  pattern1 = r"([ \t]*)(override fun getPackages\(\): List<ReactPackage>)\s*=\s*PackageList\(this\)\.packages"
  match1 = re.search(pattern1, content)
  if match1:
      indent = match1.group(1)
      replacement1 = (
          indent + "override fun getPackages(): List<ReactPackage> {\n" +
          indent + "  val packages = PackageList(this).packages\n" +
          indent + "  packages.add(BotPackage())\n" +
          indent + "  return packages\n" +
          indent + "}"
      )
      new_content = re.sub(pattern1, replacement1, content)
      count = 1
      print("Patched using pattern 1 (single-expression form)")

  # Pattern 2: block form - insert packages.add before "return packages"
  if count == 0:
      pattern2 = r"([ \t]*val packages = PackageList\(this\)\.packages\n)([ \t]*return packages)"
      match2 = re.search(pattern2, content)
      if match2:
          return_indent = re.match(r"([ \t]*)", match2.group(2)).group(1)
          def replacer(m):
              return m.group(1) + return_indent + "packages.add(BotPackage())\n" + m.group(2)
          new_content = re.sub(pattern2, replacer, content)
          count = 1
          print("Patched using pattern 2 (block form)")

  if count == 0:
      print("ERROR: Could not find getPackages pattern to patch")
      print("=== Full file content ===")
      print(content)
      sys.exit(1)

  with open(path, "w") as f:
      f.write(new_content)

  print(f"Successfully patched: {path}")
  print("=== Result (relevant lines) ===")
  for i, line in enumerate(new_content.split("\n")):
      if "getPackages" in line or "PackageList" in line or "BotPackage" in line:
          print(f"  Line {i+1}: {repr(line)}")
  