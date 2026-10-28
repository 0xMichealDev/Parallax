import solhandle from '../public/solhandle-world.json';

type Project = {id?: unknown; wallet?: unknown; url?: unknown};

// Presentation belongs to this original published record. It grants no access,
// changes no creator data, and never matches an arbitrary name or ticker.
export function projectPresentation(project: Project) {
  if (project.id !== solhandle.id || project.wallet !== solhandle.creatorWallet) return null;
  try {
    const url = new URL(String(project.url));
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !['solhandle.io','www.solhandle.io'].includes(url.hostname)) return null;
  } catch { return null; }
  return solhandle;
}

export function decorateAtlasProject<T extends Project & {profile: Record<string, unknown>; style?: unknown}>(project: T) {
  const presentation = projectPresentation(project);
  if (!presentation) return project;
  if (project.style) return {...project, shareUrl: presentation.shareUrl};
  return {...project, shareUrl: presentation.shareUrl, color: presentation.design, style: presentation.style, label: presentation.label,
    profile: {...project.profile, image: presentation.image, imageAlt: presentation.imageAlt}};
}

export function withProjectPresentations(html: string) {
  return html.replace('</head>', '<script id="project-presentations" type="application/json">' +
    JSON.stringify([solhandle]).replaceAll('<', '\\u003c') + '</script></head>');
}
