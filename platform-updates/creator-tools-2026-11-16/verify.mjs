import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {workspaceShell} from './app/workspace-shell.ts';

function template(name) {
  return readFileSync(new URL('./app/' + name + '.html', import.meta.url), 'utf8');
}

for (const page of ['home', 'dashboard']) {
  const html = workspaceShell(template(page), 'overview');
  const main = html.match(/<main\b[^>]*>[\s\S]*?<\/main>/i)?.[0];
  assert.ok(main, page + ' must have main content');
  assert.doesNotMatch(main, /href="\/multicam"|\/assets\/multicam\//, page + ' contains a Multicam spotlight');
  const directory = html.match(/<section class="tool-category"><h3>Creator tools<\/h3>([\s\S]*?)<\/section>/)?.[1];
  assert.match(directory || '', /href="\/multicam"/, page + ' must offer Multicam in the Creator tools directory');
}
const studio = workspaceShell(template('studio'), 'studio');
const creatorTools = studio.match(/<nav\b[^>]*id="creator-tools"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
assert.match(creatorTools || '', /href="\/multicam"[^>]*>Multicam/);
assert.match(template('multicam'), /href="\/studio#creator-tools"/);
assert.match(template('site'), /href="\/multicam"[^>]*>Edit a clip in Multicam/);
console.log('Verified Creator Tools placement, directory discovery, launch kit and return navigation.');
