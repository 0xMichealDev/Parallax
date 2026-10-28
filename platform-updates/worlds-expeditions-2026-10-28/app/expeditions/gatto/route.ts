import html from '../../gatto-expedition.html?raw';
import {gattoProjectInfo,gattoWelcomeStory} from '../../gatto-profile';

export function GET() {
 const page = html.replace('__GATTO_WELCOME_STORY__',gattoWelcomeStory()).replace('__GATTO_PROFILE__',gattoProjectInfo('gatto-landing'));
 return new Response(page,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'}});
}
