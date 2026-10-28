import {GET as projectPage} from '../../projects/gatto/route';

const projectUrl='https://parallaxlaunch.live/projects/gatto';
const shareUrl='https://parallaxlaunch.live/share/gatto-v207';
const shareImage='https://parallaxlaunch.live/assets/ecosystem/share/gatto-v207.png';

// Serve the complete public project page; a redirect would reuse the old URL.
// Give this artwork a distinct social identity and pin its preview image.
export async function GET(){
 const response=await projectPage();
 if(!response.ok)return response;
 const page=(await response.text())
  .replace('<link rel="canonical" href="'+projectUrl+'">','<link rel="canonical" href="'+shareUrl+'">')
  .replace('<meta property="og:url" content="'+projectUrl+'">','<meta property="og:url" content="'+shareUrl+'">')
  .replace(/(<meta property="og:image" content=")[^"]*(">)/,'$1'+shareImage+'$2')
  .replace(/(<meta name="twitter:image" content=")[^"]*(">)/,'$1'+shareImage+'$2');
 return new Response(page,{status:response.status,headers:new Headers(response.headers)});
}
