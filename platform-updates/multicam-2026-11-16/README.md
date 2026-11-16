# PARALLAX Multicam — v264

PARALLAX Multicam lets creators align two recordings by sound, cut between cameras and export a highlight on their own device.

Hosted version 264 uses native source commit `0177febbbc00fee34bf0fe8ebe7ad5dc6c783ab5`.

[Release notes](../../docs/updates/multicam-2026-11-16.md)

Run `npm run check:multicam` from the public repository root for the focused checks.

## Preview the editor locally

With Python 3 available, run the following from this snapshot directory and open [the preview](http://localhost:8000/). The editor runs on your device. The hosted site supplies the dashboard and other navigation destinations.

```sh
python -c "import functools,http.server,pathlib,shutil,tempfile; t=tempfile.TemporaryDirectory(); shutil.copytree('public',t.name,dirs_exist_ok=True); shutil.copyfile('app/multicam.html',pathlib.Path(t.name)/'index.html'); http.server.ThreadingHTTPServer(('127.0.0.1',8000),functools.partial(http.server.SimpleHTTPRequestHandler,directory=t.name)).serve_forever()"
```
