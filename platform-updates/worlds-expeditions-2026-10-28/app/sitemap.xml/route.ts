import {docGuides} from '../docs-content';
import {publishedEditions} from '../universe-editorial';
import ecosystemWorlds from '../../public/ecosystem-worlds.json';

export function GET(){
 const paths=['/docs',...docGuides.map(guide=>'/docs/'+guide.slug),'/','/meet','/projects','/projects/parallax','/projects/gatto',...ecosystemWorlds.map(world=>'/projects/'+world.id),'/planets','/expeditions/sheeple','/expeditions/gatto','/explore','/markets','/terminal','/studio','/observatory','/discover','/premium','/utility','/roadmap','/development','/universe',...publishedEditions().map(issue=>'/universe/'+issue.slug)];
 const escape=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]!));
 return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(path=>'<url><loc>'+escape('https://parallaxlaunch.live'+path)+'</loc></url>').join('')+'</urlset>',{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff'}});
}
