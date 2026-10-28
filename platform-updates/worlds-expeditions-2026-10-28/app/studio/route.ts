import {workspaceShell} from '../workspace-shell';
import html from '../studio.html?raw';
import {withProjectPresentations} from '../project-presentations';
export function GET(){return new Response(workspaceShell(withProjectPresentations(html),'studio'),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
