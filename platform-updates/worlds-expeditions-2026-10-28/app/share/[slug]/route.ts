import {GET as ecosystemPage} from '../../projects/[slug]/route';
import {GET as creatorPage} from '../../world/[id]/route';
import {recoveryResponse} from '../../recovery-response';
import solhandle from '../../../public/solhandle-world.json';

const origin = 'https://parallaxlaunch.live';
const revision = 'v209';
const worlds = new Set(['solana', 'solflare', 'phantom', 'jupiter', 'bonk', 'pengu', 'wif', 'popcat', 'sheeple', 'trump', 'solhandle']);

// Versioned share pages have their own social identity and keep the complete
// project experience. A redirect would send crawlers back to an older card URL.
export async function GET(request: Request) {
  const slug = new URL(request.url).pathname.split('/').filter(Boolean).pop() || '';
  const suffix = '-' + revision;
  const id = slug.endsWith(suffix) ? slug.slice(0, -suffix.length) : '';
  if (!worlds.has(id)) {
    return recoveryResponse(404, 'This planet card is unavailable.', 'Explore the Atlas to find the current project worlds.', '/planets');
  }

  const path = id === 'solhandle' ? '/world/' + solhandle.id : '/projects/' + id;
  const projectRequest = new Request(new URL(path, request.url), {headers: request.headers});
  const response = id === 'solhandle' ? await creatorPage(projectRequest) : ecosystemPage(projectRequest);
  if (!response.ok) return response;

  const canonical = origin + path;
  const shareUrl = origin + '/share/' + slug;
  const image = origin + '/assets/ecosystem/share/' + slug + '.png';
  const html = (await response.text())
    .replace('<link rel="canonical" href="' + canonical + '">', '<link rel="canonical" href="' + shareUrl + '">')
    .replace('<meta property="og:url" content="' + canonical + '">', '<meta property="og:url" content="' + shareUrl + '">')
    .replace(/(<meta property="og:image" content=")[^"]*(">)/, '$1' + image + '$2')
    .replace(/(<meta name="twitter:image" content=")[^"]*(">)/, '$1' + image + '$2');
  return new Response(html, {status: response.status, headers: new Headers(response.headers)});
}
