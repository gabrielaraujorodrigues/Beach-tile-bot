import sys
import re

if len(sys.argv) < 2:
    print('Usage: python3 patch-main-app.py <path/to/MainApplication.kt>')
    sys.exit(1)

path = sys.argv[1]

with open(path, 'r') as f:
    content = f.read()

print('Original getPackages pattern:')
m = re.search(r'override fun getPackages.*', content)
if m:
    print(' ', m.group(0))

if 'BotPackage' in content:
    print('MainApplication.kt already patched')
    sys.exit(0)

new_fn = (
    'override fun getPackages(): List<ReactPackage> {
'
    '          val packages = PackageList(this).packages
'
    '          packages.add(BotPackage())
'
    '          return packages
'
    '        }'
)

# Pattern 1: expression form with newline
pattern1 = r'override fun getPackages(): List<ReactPackage>s*=
s*PackageList(this).packages'
# Pattern 2: expression form on same line
pattern2 = r'override fun getPackages(): List<ReactPackage>s*=s*PackageList(this).packages'

new_content, count = re.subn(pattern1, new_fn, content)
if count == 0:
    new_content, count = re.subn(pattern2, new_fn, content)

if count == 0:
    print('ERROR: Could not find getPackages pattern to replace')
    print('Showing relevant lines:')
    for i, line in enumerate(content.split('
')):
        if 'getPackages' in line or 'PackageList' in line:
            print(f'  Line {i+1}: {line}')
    sys.exit(1)

with open(path, 'w') as f:
    f.write(new_content)

print(f'Successfully patched {path}')
