#!/usr/bin/env python3
"""Fail-closed native-source patch. Dry-run by default; never publishes a site."""
from pathlib import Path
import argparse, hashlib, json, os, shutil, tempfile, uuid
PACKAGE=Path(__file__).resolve().parents[1]
LOCKS={
 'public/rocket-state.js':('sha256','5d9e0af9918533bd249dc6af5691e9c73bdcaadd79dd3a31d6a4e58bd73fa65a'),
 'public/rocket-experience.js':('sha256','2623687a8018e296236f2728f25eb2f6722b711105fbc59dcaf714b362e7b4d3'),
 'public/camp-experience.js':('sha256','23cdf7bf14de19b36a8fb0cb99c33c7b4fd89997bd93f394576d8cc8418a29cd'),
 'public/universe.js':('git-blob-sha1','aa46d9905cbe2535922d8bbbf414c88649a0150e'),
 'app/site.html':('sha256','d804e5b7f69f4bbc5faaff9d075e4cea973da50781364e481f2cac86a132bd97')}
OLD_DEPART="depart:name=>{const i=destinations.findIndex(d=>d.name===name&&d.mode==='planet');if(i>=0){stopTour();leaveWalk();cancelFlight();arrive(1);go(i);}}"
NEW_DEPART="depart:name=>{const i=destinations.findIndex(d=>d.name===name&&d.mode==='planet');if(i<0)return false;stopTour();leaveWalk();cancelFlight();arrive(1);go(i);return true;}"
VERSION='20261031-telescope-1'
def digest(data,kind='sha256'):
 return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest() if kind=='git-blob-sha1' else hashlib.sha256(data).hexdigest()
def inside(root,relative):
 path=root/relative
 if not path.resolve().is_relative_to(root):raise ValueError(f'Path escapes project: {relative}')
 return path

def patch_universe(source):
 if source.count(OLD_DEPART)!=1:raise ValueError('Arrival adapter changed; review before applying.')
 return source.replace(OLD_DEPART,NEW_DEPART)
def patch_html(source):
 import re
 for name in ('rocket-state','rocket-experience','camp-experience','universe'):
  pattern=r'(src=["\']/'+re.escape(name)+r'\.js)(?:\?[^"\']*)?(["\'])'
  source,count=re.subn(pattern,lambda m:m[1]+'?v='+VERSION+m[2],source)
  if count!=1:raise ValueError(f'Expected one script reference for {name}, got {count}')
 if source.count('</head>')!=1 or '/observatory-journey.css' in source:raise ValueError('Unexpected document head.')
 return source.replace('</head>',f'<link rel="stylesheet" href="/observatory-journey.css?v={VERSION}"></head>')
def build_plan(root):
 root=root.resolve(strict=True)
 original={}
 for relative,(kind,expected) in LOCKS.items():
  data=inside(root,relative).read_bytes()
  if digest(data,kind)!=expected:raise ValueError(f'{relative} differs from reviewed v230; no files changed.')
  original[relative]=data
 # All source locks are checked before assembling or writing any replacement.
 changes={relative:(PACKAGE/relative).read_bytes() for relative in ('public/rocket-state.js','public/rocket-experience.js','public/camp-experience.js','public/observatory-journey.css')}
 css=inside(root,'public/observatory-journey.css')
 if css.exists():raise ValueError('New stylesheet already exists; review instead of overwriting.')
 changes['public/universe.js']=patch_universe(original['public/universe.js'].decode()).encode()
 changes['app/site.html']=patch_html(original['app/site.html'].decode()).encode()
 manifest=json.loads((PACKAGE/'SHA256SUMS.json').read_text())
 for relative in ('public/rocket-state.js','public/rocket-experience.js','public/camp-experience.js','public/observatory-journey.css'):
  if digest(changes[relative])!=manifest[relative]:raise ValueError(f'Package integrity mismatch: {relative}')
 return original,changes

def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--root',required=True,type=Path);parser.add_argument('--apply',action='store_true');args=parser.parse_args()
 root=args.root.resolve(strict=True);original,changes=build_plan(root)
 report={'status':'dry-run','source_version':230,'writes':list(changes),'publishes':False}
 if args.apply:
  backup=root/'.parallax-journey-backups'/uuid.uuid4().hex;backup.mkdir(parents=True)
  for name,data in original.items():
   dest=backup/name;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
  written=[]
  try:
   # Recheck before writing to avoid overwriting concurrent source changes.
   for name,data in original.items():
    if inside(root,name).read_bytes()!=data:raise ValueError(f'Concurrent edit: {name}')
   for name,data in changes.items():
    target=inside(root,name);target.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=target.parent,delete=False) as file:
     temporary=Path(file.name);file.write(data)
    os.replace(temporary,target);written.append(name)
  except Exception:
   for name in reversed(written):
    target=inside(root,name)
    if name in original:target.write_bytes(original[name])
    else:target.unlink(missing_ok=True)
   raise
  report.update(status='applied-to-working-tree',backup=str(backup),next='Run native build and full scene tests. This command does not deploy.')
 print(json.dumps(report,indent=2))
if __name__=='__main__':main()
