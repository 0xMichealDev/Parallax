import content from './universe-editions.json';

export type Edition = typeof content.editions[number];
const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const base = 'https://parallaxlaunch.live';
const issue = (edition: Edition) => String(edition.number).padStart(3, '0');
const date = (edition: Edition) => new Intl.DateTimeFormat('en-US', {month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(edition.publishedOn+'T12:00:00Z'));
const project = (edition: Edition) => content.builders.find(b => b.id === edition.projectId)!;
const path = (edition: Edition) => '/universe/'+edition.slug;
export const publishedEditions = () => content.editions.filter(e => e.status === 'published' && content.builders.some(b => b.id === e.projectId)).sort((a,b) => b.publishedOn.localeCompare(a.publishedOn) || b.number-a.number);
export const findEdition = (slug: string) => publishedEditions().find(e => e.slug === slug);

function share(edition: Edition) {
 const url = base+path(edition), text = `Solana Universe / ${issue(edition)}\n\n${edition.title}\n${edition.standfirst}`;
 const x = 'https://twitter.com/intent/tweet?'+new URLSearchParams({text:`Solana Universe / ${issue(edition)}\n\n${edition.title}\nExplore ${project(edition).name} in Parallax.`,url});
 const telegram = 'https://t.me/share/url?'+new URLSearchParams({url,text});
 return `<div class="universe-story-share" data-story-share><span>SHARE THIS STORY</span><div><button type="button" data-copy-story="${esc(url)}" hidden>Copy link</button><a href="${esc(x)}" target="_blank" rel="noopener noreferrer">Prepare X post ↗</a><a href="${esc(telegram)}" target="_blank" rel="noopener noreferrer">Telegram ↗</a></div><label class="universe-share-fallback" hidden>Story link<input readonly aria-label="Story link to copy" value="${esc(url)}"></label><p role="status" aria-live="polite"></p></div>`;
}

function feature(edition: Edition) {
 const p = project(edition);
 return `<article class="universe-feature"><a class="universe-feature-image" href="${path(edition)}" aria-label="Read the ${esc(p.name)} spotlight"><img src="${esc(p.image)}" width="2048" height="512" loading="lazy" alt="${esc(p.imageAlt)}"><span>SOLANA UNIVERSE / ${issue(edition)}</span></a><div class="universe-feature-copy"><p class="universe-editorial-kicker">${esc(p.name)} / <time datetime="${esc(edition.publishedOn)}">${date(edition)}</time></p><h3><a href="${path(edition)}">${esc(edition.title)}</a></h3><p>${esc(edition.standfirst)}</p><div class="universe-editorial-actions"><a class="universe-story-primary" href="${path(edition)}">Read the spotlight <span aria-hidden="true">↗</span></a><a href="/planets?world=${p.world}#community-atlas">Find the planet ↗</a></div></div></article>`;
}

function builders() {
 return `<section class="universe-builders" id="featured-builders" aria-labelledby="featured-builders-title"><div class="universe-editorial-heading"><div><p class="universe-editorial-kicker">THE PEOPLE AND PROJECTS BEHIND THE WORLDS</p><h2 id="featured-builders-title">Featured Builders.</h2></div><a href="/projects#pilot">Put your project forward ↗</a></div><p class="universe-editorial-intro">A small selection from our universe. Chosen for their stories and planet designs, with room for new communities.</p><div class="universe-builder-grid">${content.builders.map(p => `<article class="universe-builder"><a class="universe-builder-art universe-builder-art--${esc(p.id)}" href="${esc(p.href)}" aria-label="Explore ${esc(p.name)}"><img src="${esc(p.image)}" width="640" height="320" loading="lazy" alt="${esc(p.imageAlt)}"></a><div class="universe-builder-copy"><p class="universe-editorial-kicker">${esc(p.label)}</p><h3>${esc(p.name)}</h3><h4>${esc(p.title)}</h4><p>${esc(p.summary)}</p><div class="universe-editorial-actions"><a href="${esc(p.href)}">Explore the world ↗</a><a href="/planets?world=${p.world}#community-atlas">Locate in Atlas ↗</a></div><small>${esc(p.note)}</small></div></article>`).join('')}</div><details class="universe-editorial-policy"><summary>How projects are featured</summary><p>Parallax selects projects for clear stories, useful public pages and distinctive worlds. This is an editorial selection, not a traffic leaderboard or investment recommendation. Buying a premium planet design does not secure a feature. Wallet checks do not prove a unique person, project affiliation or token safety.</p><p>Publish your planet and add it to Atlas, then send its link through our <a href="https://t.me/PRLXPortal" target="_blank" rel="noopener noreferrer">community portal</a> for review. A submission does not guarantee selection.</p></details></section>`;
}

export function atlasEditorial() {
 const latest = publishedEditions()[0];
 if (!latest) return builders();
 return `<section class="universe-editorial" id="solana-universe" aria-labelledby="universe-editorial-title"><div class="universe-editorial-heading"><div><p class="universe-editorial-kicker">THE WEEKLY SPOTLIGHT / LATEST ISSUE ${issue(latest)}</p><h2 id="universe-editorial-title">Solana Universe.</h2></div><a href="/universe">Browse the stories ↗</a></div>${feature(latest)}</section>${builders()}`;
}

function page(title: string, description: string, canonical: string, image: string, body: string) {
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · PARALLAX</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${base+canonical}"><meta property="og:image" content="${base+image}"><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/universe-editorial.css?v=120"></head><body class="universe-editorial-page"><main id="universe-main">${body}</main><script src="/universe-editorial.js?v=120" defer></script></body></html>`;
}

export function universeIndex() {
 const editions = publishedEditions(), latest = editions[0];
 return page('Solana Universe', 'Short stories from the projects and creators building their worlds in Parallax.', '/universe', latest ? project(latest).image : '/assets/refresh/orbital-1672-v102.webp', `<div class="universe-story-back"><a href="/planets">← Back to Atlas</a><a href="/projects#pilot">Submit your world ↗</a></div><section class="universe-journal-intro"><p class="universe-editorial-kicker">A PARALLAX EDITORIAL SERIES</p><h1>Solana Universe.</h1><p>A closer look at the worlds being built.<br>One project. One story. One new place to explore.</p><span>Weekly spotlight series · ${editions.length} published ${editions.length===1?'issue':'issues'}</span></section><section class="universe-issue-list" aria-label="Published spotlight issues">${editions.map(feature).join('') || '<p>The first spotlight is being prepared.</p>'}</section><div class="universe-editorial-invitation"><div><p class="universe-editorial-kicker">THE NEXT CHAPTER</p><h2>Your story belongs here.</h2><p>Give your project a planet, then put it forward for an upcoming spotlight.</p></div><a class="universe-story-primary" href="/projects#claim">Start your planet ↗</a></div><p class="universe-editorial-fineprint">Dated editorial features, selected by Parallax. New issues appear when published; past stories keep their original publication date.</p>`);
}

export function universeStory(slug: string) {
 const edition = findEdition(slug);
 if (!edition) return null;
 const p = project(edition);
 return page(p.name+' / Solana Universe '+issue(edition),edition.standfirst,path(edition),p.image,`<div class="universe-story-back"><a href="/universe">← All stories</a><a href="/planets?world=${p.world}#community-atlas">Locate ${esc(p.name)} in Atlas ↗</a></div><article class="universe-story"><div class="universe-story-heading"><p class="universe-editorial-kicker">SOLANA UNIVERSE / ISSUE ${issue(edition)}</p><h1>${esc(edition.title)}</h1><p>${esc(edition.standfirst)}</p><div>By Parallax <span aria-hidden="true">·</span> <time datetime="${esc(edition.publishedOn)}">${date(edition)}</time></div></div><figure class="universe-story-cover"><img src="${esc(p.image)}" width="2048" height="512" alt="${esc(p.imageAlt)}"><figcaption>${esc(p.name)} / Community artwork</figcaption></figure><div class="universe-story-layout"><div class="universe-story-body">${edition.sections.map(s=>`<section><h2>${esc(s.title)}</h2>${s.paragraphs.map(text=>`<p>${esc(text)}</p>`).join('')}</section>`).join('')}<aside class="universe-story-note"><h2>About this feature</h2><p>${esc(edition.editorNote)}</p></aside>${share(edition)}</div><aside class="universe-story-fieldnotes" aria-labelledby="fieldnotes-title"><p class="universe-editorial-kicker">THE WORLD / ${esc(p.name)}</p><h2 id="fieldnotes-title">In the details.</h2><dl>${edition.details.map(d=>`<div><dt>${esc(d.label)}</dt><dd>${esc(d.value)}</dd></div>`).join('')}</dl><a class="universe-story-primary" href="${esc(p.href)}">Enter ${esc(p.name)}’s world ↗</a><a href="/planets?world=${p.world}#community-atlas">Find it in Atlas ↗</a></aside></div></article><div class="universe-editorial-invitation"><div><p class="universe-editorial-kicker">YOUR PROJECT / YOUR PLANET</p><h2>Build your own corner of the universe.</h2><p>Free standard publishing. Open to tools, communities and token projects.</p></div><a class="universe-story-primary" href="/projects#claim">Create your planet ↗</a></div>`);
}
