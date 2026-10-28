import {workspaceShell} from '../../workspace-shell';
import html from '../../gatto-preview.html?raw';
import gattoWorld from '../../../public/gatto-world.json';
import {gattoProjectInfo} from '../../gatto-profile';
export function GET(){
 const page=html.replace('__GATTO_PROFILE__',gattoProjectInfo()).replace('__GATTO_WORLD_DATA__',JSON.stringify(gattoWorld).replaceAll('<','\\u003c'));
 return new Response(workspaceShell(page,'projects'),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
