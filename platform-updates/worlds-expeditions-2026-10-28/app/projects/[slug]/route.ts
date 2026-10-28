import {ecosystemProjectPage} from '../../ecosystem';
import {workspaceShell} from '../../workspace-shell';
import {recoveryResponse} from '../../recovery-response';

export function GET(req:Request){
 const id=new URL(req.url).pathname.split('/').filter(Boolean).pop()||'';
 const html=ecosystemProjectPage(id);
 if(!html)return recoveryResponse(404,'This planet is not listed.','Explore the Atlas to discover the available project worlds.','/planets');
 return new Response(workspaceShell(html,'projects'),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'}});
}
