import {siteResponse} from '../site-response';
import {ecosystemSection,ecosystemWorld} from '../ecosystem';
export async function GET(req:Request){
 const selected=new URL(req.url).searchParams.get('ecosystem'),world=ecosystemWorld(selected);
 const r=siteResponse({title:selected?`${world.name}, imagined as a planet · PARALLAX`:'Explore the universe · PARALLAX',description:selected?world.description:'Explore Solana ecosystem concepts, discover creator planets, and walk beneath the stars.',path:'/explore'});
 return new Response((await r.text())
  .replace('<link rel="stylesheet" href="/experience-premium.css?v=167">','')
  .replace('</head>','<link rel="stylesheet" href="/explore-clean.css?v=106"><link rel="stylesheet" href="/ecosystem.css?v=191"><link rel="stylesheet" href="/experience-premium.css?v=167"></head>')
  .replace(/<section id="project-atlas"[\s\S]*?<\/section>\s*(?=<dialog id="claim-planet-dialog")/,section=>'<section id="project-atlas" class="atlas-destination-entry"><div><h2>Community project worlds</h2><p>Browse published worlds and open the project page for any planet in the Atlas.</p></div><a href="/planets#community-atlas">Browse project worlds ↗</a></section>'+(section.match(/<section class="singularity-home"[\s\S]*?<\/section>/)?.[0]||''))
  .replace(/<script src="\/project-atlas\.js[^"<>]*"><\/script>/,'')
  .replace('<section class="home-overview"',ecosystemSection(selected)+'<section class="home-overview"')
  .replace('</body>','<script src="/explore-clean.js?v=262"></script><script src="/planet-renderer.js?v=209"></script><script src="/ecosystem.js?v=212"></script></body>'),{headers:r.headers});
}
