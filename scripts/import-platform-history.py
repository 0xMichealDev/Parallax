"""One-time import of reviewed, date-preserving platform history. Never force-push."""
import hashlib
import json
import os
from pathlib import Path
import subprocess

EXPECTED_HEAD = 'e0aeecdc1c517dd49181bac7a28760ad148040d2'
EXPECTED_DIGEST = '78b763b64945599ca918fbb964274a1779a59e8c0bf092f00ca62d4d1787b119'
def git(*args):
    return subprocess.check_output(['git', *args], text=True).strip()

parts = sorted(Path('history-import/parts').glob('*.part'))
if [p.name for p in parts] != [f'{i:03}.part' for i in range(30)]:
    raise RuntimeError('Unexpected bundle parts')
payload = b''.join(p.read_bytes() for p in parts)
if hashlib.sha256(payload).hexdigest() != EXPECTED_DIGEST:
    raise RuntimeError('Bundle checksum mismatch')
bundle = Path(os.environ['RUNNER_TEMP']) / 'parallax-reviewed-history.bundle'
bundle.write_bytes(payload)
git('bundle', 'verify', str(bundle))
git('fetch', str(bundle), 'refs/heads/platform-history:refs/heads/platform-history-import')
if git('rev-parse', 'platform-history-import') != EXPECTED_HEAD:
    raise RuntimeError('Unexpected history tip')
if git('rev-list', '--count', EXPECTED_HEAD) != '155':
    raise RuntimeError('Unexpected history count')
manifest = json.loads(Path('docs/history/import-manifest.json').read_text())
allowed = {'historical-platform/' + p for p in manifest['allowed_paths']}
for commit in git('rev-list', EXPECTED_HEAD).splitlines():
    paths = set(git('ls-tree', '-r', '--name-only', commit).splitlines())
    if not paths <= allowed:
        raise RuntimeError('Unexpected historical file path')
if Path('historical-platform').exists():
    raise RuntimeError('Historical directory already exists; inspect before retrying')
git('config', 'user.name', 'github-actions[bot]')
git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com')
git('merge', '--no-commit', '--no-ff', '--allow-unrelated-histories', EXPECTED_HEAD)
receipt = {'status': 'imported', 'filtered_head': EXPECTED_HEAD,
           'imported_commit_count': 155, 'bundle_sha256': EXPECTED_DIGEST,
           'original_source_head': manifest['original_source_head'],
           'attribution': 'Original Codex author and committer metadata retained; no personal contribution credit claimed.',
           'validation': 'Original dates, identities, messages and selected file blob hashes verified before upload; current developer-kit checks required before publication.'}
Path('docs/history/import-receipt.json').write_text(json.dumps(receipt, indent=2)+'\n')
Path('historical-platform/README.md').write_text('''# Historical platform source

This directory contains selected browser JavaScript, stylesheets and implementation notes from PARALLAX's original development history. Its 155 imported commits retain the original dates, Codex attribution, messages and file bytes. Paths were prefixed with `historical-platform/`; revisions without changes in selected paths were omitted. The mapping in [the import manifest](../docs/history/import-manifest.json) connects each filtered revision to its original source revision.

These files are an archival source preview, not a runnable copy of the hosted platform. Backend services, credentials, account data, HTML page shells, media assets and deployment configuration are outside this export. One browser file was excluded across all revisions to avoid publishing personal identifying text. Relative imports, asset URLs and same-origin API calls depend on the original application.

Historical notes and checks describe their original context. They may be superseded by later changes; they are not new test results or promises of current availability. Current user guides are under [docs/platform](../docs/platform/README.md), and the active, executable developer kit stays in the repository root. Existing source-preview licensing applies; no open-source license is granted by this import.

The [development history](../docs/DEVELOPMENT-HISTORY.md) explains the counts and limits. Repository commit history and a personal profile's contribution calendar are different: original attribution was not reassigned to obtain contribution credit.
''')
for file in ['README.md', 'docs/DEVELOPMENT-HISTORY.md']:
    p=Path(file)
    p.write_text(p.read_text().replace('**History import status: prepared.**', '**History import status: completed.**'))
print('Verified and merged 155 historical commits; ready for developer-kit checks.')
