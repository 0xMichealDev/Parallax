import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const shellCode = ts.transpile(fs.readFileSync('app/workspace-shell.ts', 'utf8'), {target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022});
const {workspaceShell} = await import('data:text/javascript;base64,' + Buffer.from(shellCode).toString('base64'));
for (const page of ['pro','control','assistant']) {
  const html = workspaceShell(fs.readFileSync(`app/${page}.html`, 'utf8'), page);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, `${page}: duplicate IDs would break form bindings`);
  assert.equal((html.match(/aria-label="Gold research workspace"/g)||[]).length, 1);
  for (const [, path] of html.matchAll(/(?:src|href)="(\/[^"?#]+\.(?:css|js|png|webp|svg))(?:[?#][^"]*)?"/g)) {
    assert(fs.existsSync('public' + path), `${page}: missing asset ${path}`);
  }
  for (const [, target] of html.matchAll(/(?:aria-controls|for)="([^"]+)"/g)) {
    assert(ids.includes(target), `${page}: missing control or label target ${target}`);
  }
}
const otherPage = workspaceShell(fs.readFileSync('app/terminal.html', 'utf8'), 'terminal');
assert(!otherPage.includes('aria-label="Gold research workspace"'), 'Gold navigation is limited to its three routes');

const code = fs.readFileSync('public/gold-workspace.js', 'utf8');
function client(page, view = null) {
  const links = ['pro','wallet','snapshots','assistant'].map(key => ({dataset:{goldView:key},attrs:{},setAttribute(name,value){this.attrs[name]=value;},removeAttribute(name){delete this.attrs[name];}}));
  const selected = view ? {dataset:{tab:view}} : null;
  const tabs = view ? {} : null;
  const breadcrumb = {textContent:''};
  const events = {};
  let observe;
  const location = {hash:view ? '#' + view : ''};
  vm.runInNewContext(code, {
    document:{body:{dataset:{workspacePage:page}},querySelectorAll:()=>links,querySelector:selector=>selector.startsWith('[data-tab]')?selected:selector.startsWith('.tabs')?tabs:breadcrumb},
    window:{addEventListener(name,handler){events[name]=handler;}}, location,
    MutationObserver:class {constructor(callback){observe=callback;}observe(target,options){assert.equal(target,tabs);assert(options.attributeFilter.includes('aria-selected'));}}
  });
  return {breadcrumb,current:()=>links.filter(link=>link.attrs['aria-current']==='page').map(link=>link.dataset.goldView),switchTab(next){selected.dataset.tab=next;location.hash='#'+next;observe();},events,location};
}
assert.deepEqual(client('pro').current(), ['pro']);
assert.deepEqual(client('assistant').current(), ['assistant']);
const research = client('control', 'wallet');
assert.deepEqual(research.current(), ['wallet']);
research.switchTab('compare');
assert.deepEqual(research.current(), ['snapshots'], 'replaceState-only tab changes update suite selection');
assert.equal(research.breadcrumb.textContent, 'Snapshot comparisons', 'the visible page label follows local tab changes');
research.switchTab('wallet');
assert.deepEqual(research.current(), ['wallet']);
for (const view of ['vault','passport','verify']) {
  research.switchTab(view);
  assert.deepEqual(research.current(), ['snapshots']);
}
console.log('PASS Gold workspace: rendered assets, unique controls, label targets, route isolation, and research-tab navigation synchronization.');
