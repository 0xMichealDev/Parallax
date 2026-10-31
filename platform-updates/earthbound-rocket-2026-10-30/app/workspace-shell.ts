// Shared server-rendered navigation. Page-specific forms and authentication remain intact.
const orbit = '<svg class="brand-orbit" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="9"/><ellipse cx="16" cy="16" rx="15" ry="5.5" transform="rotate(-35 16 16)"/><circle cx="26" cy="8" r="1.5" fill="currentColor" stroke="none"/></svg>';
const icons:Record<string,string> = {
 dashboard:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 workspace:'<path d="M3 7h18v14H3zM7 7V3h10v4M3 12h18M10 12v3h4v-3"/>',
 terminal:'<path d="M3 4h18v16H3zM7 8l4 4-4 4M14 16h3"/>',
 trenches:'<path d="M3 4h5v16H3zM10 4h4v16h-4zM16 4h5v16h-5zM5 9h1m6 3h0m6-5h1"/>',
 replay:'<path d="M4 5v14m16-14L9 12l11 7z"/>',
 wallet:'<path d="M4 6h15v14H4zM4 6V3h12v3M15 10h6v6h-6zM18 13h.01"/>',
 passport:'<path d="M5 3h10l4 4v14H5zM14 3v5h5M8 12h8M8 16h5"/>',
 assistant:'<path d="M4 4h16v12H9l-5 4zM8 8h8M8 12h5"/>',
 planet:'<circle cx="12" cy="12" r="6"/><ellipse cx="12" cy="12" rx="11" ry="4" transform="rotate(-30 12 12)"/>',
 studio:'<path d="m12 3 9 5v9l-9 5-9-5V8zM3 8l9 5 9-5M12 13v9M7 5l9 5"/>',
 explore:'<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5z"/>',
 star:'<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/>',
 docs:'<path d="M4 3h12l4 4v14H4zM15 3v5h5M8 12h8M8 16h6"/>',
 arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
};
const glyph=(name:string)=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+(icons[name]||icons.explore)+'</svg>';
const destination=(href:string,label:string,icon:string,extra='')=>'<a href="'+href+'" title="'+label+'"'+extra+'>'+glyph(icon)+'<span>'+label+'</span></a>';
const group=(label:string,number:string,links:string)=>'<section class="prlx-nav-group"><h2><span>'+label+'</span><span aria-hidden="true">'+number+'</span></h2><nav aria-label="'+label+'">'+links+'</nav></section>';
const SIDEBAR='<aside class="dashboard-sidebar" aria-label="Workspace sidebar"><a class="brand" href="/" aria-label="PARALLAX home">'+orbit+'<span>PARALLAX<small>ONCHAIN OBSERVATORY</small></span></a>'+
 '<button type="button" class="prlx-nav-toggle" data-prlx-nav-toggle aria-expanded="false" aria-label="Expand navigation" title="Expand navigation" hidden>'+glyph('arrow')+'<span>Collapse menu</span></button><div class="prlx-sidebar-route"><span class="prlx-route-line" aria-hidden="true"></span><span>A DIFFERENT PERSPECTIVE</span></div>'+
 '<nav class="prlx-primary-nav" aria-label="Your workspace">'+destination('/?view=dashboard','Dashboard','dashboard')+destination('/workspace','My Workspace','workspace')+'</nav>'+
 group('Trade','01',destination('/terminal','Terminal','terminal')+destination('/trenches','Trenches','trenches')+destination('/replay','Replay','replay'))+
 group('Research','02',destination('/control#wallet','Wallet Watch','wallet')+destination('/control','Project Passports','passport')+destination('/assistant','Gold AI','assistant'))+
 group('Universe','03',destination('/planets','Planet Atlas','planet')+destination('/studio','Creator Studio','studio')+destination('/explore','Explore worlds','explore'))+
 '<div class="prlx-sidebar-footer"><a class="prlx-gold-link" href="/pro">'+glyph('star')+'<span>PARALLAX GOLD<small>Your research, upgraded.</small></span>'+glyph('arrow')+'</a>'+
 '<div class="prlx-footer-links"><a href="/docs">Documentation</a><a href="/meet">About</a><a href="/#tools" data-open-tools aria-haspopup="dialog" aria-controls="dashboard-command">All tools '+glyph('arrow')+'</a></div><div class="sidebar-bottom"><span class="network-glyph" aria-hidden="true">≋</span><span>BUILT ON SOLANA<small>Research. Create. Explore.</small></span></div></div></aside>';
const HEADER='<header class="workspace-header dashboard-header"><a class="brand" href="/" aria-label="PARALLAX home">'+orbit+'PARALLAX</a><div class="dashboard-breadcrumb"><span>__SECTION_LABEL__</span><b>/</b><span>__PAGE_LABEL__</span></div><div class="dashboard-header-actions">'+
 '<button class="prlx-motion-button" type="button" data-prlx-motion aria-label="Pause decorative motion" aria-pressed="false" title="Pause decorative motion" hidden><svg viewBox="0 0 20 20" aria-hidden="true"><path class="prlx-pause-symbol" d="M7 5v10M13 5v10"/><path class="prlx-play-symbol" d="m7 5 8 5-8 5z"/></svg><span data-prlx-motion-label>Motion on</span></button>'+
 '<a class="site-pro-member" href="/pro" data-pro-member-badge data-state="checking" aria-label="Check Parallax Pro access">'+glyph('star')+'<span data-pro-label>PRO</span><span class="pro-badge-word" data-pro-detail>Check</span></a><a href="/#tools" class="dashboard-search" aria-label="Open navigation menu" data-open-tools aria-haspopup="dialog" aria-controls="dashboard-command"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><span>Go anywhere</span><span class="tool-search-compact">Menu</span><kbd>⌘ K</kbd></a><a class="account-link" href="/workspace">My Workspace <span aria-hidden="true">↗</span></a></div></header>';
const directoryLink=(href:string,name:string,description:string,aliases:string)=>'<a href="'+href+'" data-tool-search="'+aliases+'"><span><strong>'+name+'</strong><small>'+description+'</small></span><span aria-hidden="true">↗</span></a>';
const directoryGroup=(title:string,entries:string)=>'<section class="tool-category"><h3>'+title+'</h3>'+entries+'</section>';
const DIALOG='<dialog class="dashboard-command" id="dashboard-command" aria-labelledby="dashboard-command-title"><div class="command-heading"><div><p class="eyebrow">THE PARALLAX OBSERVATORY</p><h2 id="dashboard-command-title">Where to next?</h2></div><button type="button" id="dashboard-command-close" aria-label="Close tool finder">✕</button></div><label class="command-search-label" for="dashboard-command-input">Search tools</label><div class="command-input-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input id="dashboard-command-input" type="search" placeholder="Try wallets, trenches, snapshots…" autocomplete="off" maxlength="80"></div><p id="dashboard-command-status" class="visually-hidden" role="status" aria-live="polite"></p><nav class="tool-directory" aria-label="All PARALLAX tools">'+
 directoryGroup('Your workspace',
  directoryLink('/?view=dashboard','Dashboard','Your familiar market dashboard and saved panel layout','home overview customize panels layout market radar')+
  directoryLink('/workspace','My Workspace','Saved tokens, wallets, alerts and reports','workspace dashboard research hub')+
  directoryLink('/workspace#alerts','Alert settings','Price, liquidity and wallet notification controls','price liquidity wallet telegram alerts notifications'))+
 directoryGroup('Trade',
  directoryLink('/terminal','Terminal','Inspect a token, chart its market and review a swap','buy sell jupiter trade chart token pool')+
  directoryLink('/trenches','Trenches','Fresh launches, near graduation and active graduated tokens','new bonding runners migrated volume holders filters discover')+
  directoryLink('/replay','Replay','Rewind recent swaps and inspect the transactions','rewind timeline transactions buys sells wallets history')+
  directoryLink('/markets','Market research','Read Solana market data and onchain evidence','price research supply concentration pool token chart'))+
 directoryGroup('Research',
  directoryLink('/control#wallet','Wallet Watch','Look up a wallet or handle and manage Telegram alerts','tracking telegram solhandle address balances transfer monitoring')+
  directoryLink('/assistant','Gold AI','Ask research questions and inspect the sources','gold ai assistant personal chat analysis report')+
  directoryLink('/control','Project Passports','Collect a timestamped research snapshot','research evidence token address passport')+
  directoryLink('/control#vault','Snapshot Library','Return to reports saved to your account','saved snapshots reports vault passports')+
  directoryLink('/control#compare','Snapshot Comparison','See what changed between two saved reports','compare changes history baseline evidence')+
  directoryLink('/control#verify','Verify an export','Check a report file against its recorded source','export json hash integrity verification')+
  directoryLink('/observatory','Token watchlist','Follow tokens saved on this device','guest device watchlist observatory tokens liquidity price alerts')+
  directoryLink('/briefing','Activity &amp; Briefing','Catch up on recorded project and wallet activity','updates news activity briefing')+
  directoryLink('/following','Saved projects','Your account-saved research and followed worlds','account bookmarks favorites followed worlds')+
  directoryLink('/pro','Parallax Gold','Verify Pro access and open the research suite','membership pro prlx holder token access wallet monitor'))+
 directoryGroup('Universe',
  directoryLink('/planets','Planet Atlas','Explore projects and find their worlds','atlas solar system orbit planets claim spot directory')+
  directoryLink('/studio','Creator Studio','Design and publish your project’s planet','create design launch colors rings moons')+
  directoryLink('/creator','My Worlds','Manage worlds, ownership and creator reports','creator dashboard analytics campaign')+
  directoryLink('/explore','Explore worlds','Enter the Parallax universe','universe solar system ecosystem exploration')+
  directoryLink('/projects','Project planets','Create a home for your project','project community claim pilot builders onboarding')+
  directoryLink('/premium','Premium Worlds','Explore paid planet upgrades and artwork','premium rings moons size growth graphics purchases')+
  directoryLink('/discover','Discovery Missions','Find projects and track your exploration','missions badges explorer discovery')+
  directoryLink('/explore#walk-on-earth','Earthbound','Walk the landscape and visit the stargazing camp','walk walking earth ground camp telescope stars cybertruck')+
  directoryLink('/explore#scenario-heading','Launch Lab','Explore hypothetical pool scenarios','simulation launch scenarios liquidity'))+
 directoryGroup('The project',
  directoryLink('/docs','Documentation','Product guides, status and developer resources','docs documentation guides help setup developer github releases')+
  directoryLink('/meet','Meet Parallax','A guided introduction to the observatory','introduction tour about start learn')+
  directoryLink('/utility','$PRLX utility','Understand the token’s role in Parallax','token utility benefits payments')+
  directoryLink('/roadmap','Roadmap','The next chapters of Parallax','future updates flight plan milestones')+
  directoryLink('/development','Development Fund','Read the public development funding report','premium revenue funding development')+
  directoryLink('/solhandle','SolHandle integration','Recognizable handles and verified wallet ownership','solhandle identity handles partner creator permissions'))+
 '</nav><p class="command-empty" hidden>No matching tools. Try “research”, “planet”, or “wallet”.</p><div class="command-footer"><span>↑ ↓ to move · Enter to open</span><span>Esc to close</span></div></dialog>';
const DOCK='<nav class="mobile-dock" aria-label="Mobile navigation">'+destination('/?view=dashboard','Dashboard','dashboard')+destination('/terminal','Trade','terminal')+destination('/control#wallet','Wallets','wallet')+destination('/planets','Atlas','planet')+'<a href="/#tools" data-open-tools aria-haspopup="dialog" aria-controls="dashboard-command"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg><span>Menu</span></a></nav>';

const WORKSPACE_NAV='<nav class="workspace-section-nav" aria-label="My Workspace sections"><a href="/workspace">Overview</a><a href="/observatory">Tokens</a><a href="/control#wallet">Wallets</a><a href="/workspace#alerts">Alerts</a><a href="/control#vault">Reports</a><a href="/briefing">Activity</a></nav>';
const GOLD_NAV='<nav class="gold-suite-nav" aria-label="Gold research workspace"><a class="gold-suite-brand" href="/pro"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/></svg><span>GOLD<span>RESEARCH SUITE</span></span></a><div class="gold-suite-links"><a href="/pro" data-gold-view="pro"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><path d="M3 14h7v7H3zM14 14h7v7h-7z"/></svg>Gold home</a><a href="/control#wallet" data-gold-view="wallet"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h15v14H4zM4 6V4h12v2M15 10h6v6h-6z"/><path d="M18 13h.01"/></svg>Wallet Watch</a><a href="/control#vault" data-gold-view="snapshots"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/></svg>Snapshots</a><a href="/assistant" data-gold-view="assistant"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v12H9l-5 4zM8 8h8M8 12h5"/></svg>Gold AI</a></div><a class="gold-suite-terminal" href="/terminal">Terminal <span aria-hidden="true">↗</span></a></nav>';
const pages:Record<string,{label:string;active:string;mobile:string}>={
 workspace:{label:'My Workspace',active:'/workspace',mobile:'/workspace'},docs:{label:'PARALLAX Docs',active:'/docs',mobile:'/'},assistant:{label:'Gold Assistant',active:'/assistant',mobile:'/'},solhandle:{label:'SolHandle integration',active:'/solhandle',mobile:'/'},pro:{label:'Parallax Pro',active:'/pro',mobile:'/'},observatory:{label:'Saved tokens · this device',active:'/observatory',mobile:'/observatory'},projects:{label:'Project planets',active:'/projects',mobile:'/studio'},overview:{label:'Home',active:'/',mobile:'/'},trenches:{label:'Trenches',active:'/trenches',mobile:'/terminal'},replay:{label:'Replay',active:'/replay',mobile:'/terminal'},terminal:{label:'Terminal',active:'/terminal',mobile:'/terminal'},markets:{label:'Market Research',active:'/markets',mobile:'/markets'},studio:{label:'Creator Studio',active:'/studio',mobile:'/studio'},creator:{label:'My Worlds',active:'/creator',mobile:'/studio'},control:{label:'Project Passports',active:'/control',mobile:'/markets'},briefing:{label:'Activity & Briefing',active:'/briefing',mobile:'/markets'},following:{label:'Saved projects · account',active:'/following',mobile:'/following'},discover:{label:'Discovery Missions',active:'/discover',mobile:'/planets'},premium:{label:'Premium Worlds',active:'/premium',mobile:'/studio'},utility:{label:'$PRLX utility',active:'/utility',mobile:'/'},development:{label:'Development Fund',active:'/development',mobile:'/'},roadmap:{label:'Roadmap',active:'/roadmap',mobile:'/'},explore:{label:'Explore worlds',active:'/explore',mobile:'/planets'},planets:{label:'Planet Atlas',active:'/planets',mobile:'/planets'}
};
function active(markup:string,path:string){return markup.replace(/ aria-current="page"/g,'').replaceAll('href="'+path+'"','href="'+path+'" aria-current="page"');}
function pageMetadata(html:string,path:string){
 // Preserve explicit metadata, including canonical URLs on individual project pages.
 const head=html.slice(0,html.indexOf('</head>'));
 const canonical=head.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1]||'https://parallaxlaunch.live'+path;
 const title=(head.match(/<title>([\s\S]*?)<\/title>/)?.[1]||'PARALLAX').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 const description=head.match(/<meta\b[^>]*name="description"[^>]*content="([^"]*)"/)?.[1]||'Research. Discover. Build. Explore the PARALLAX Solana workspace.';
 let tags=head.includes('rel="canonical"')?'':'<link rel="canonical" href="'+canonical+'">';
 const properties:Record<string,string>={'og:title':title,'og:description':description,'og:type':'website','og:url':canonical,'og:image':'https://parallaxlaunch.live/assets/earth-cinematic.png'};
 for(const [key,value] of Object.entries(properties))if(!head.includes('property="'+key+'"'))tags+='<meta property="'+key+'" content="'+value+'">';
 if(!head.includes('name="twitter:card"'))tags+='<meta name="twitter:card" content="summary_large_image">';
 return html.replace('</head>',tags+'</head>');
}
export function workspaceShell(source:string,key:string){
 const page=pages[key]||pages.overview;
 const goldWorkspace=['pro','control','assistant'].includes(key);
 const workspaceMember=['workspace','observatory','following','briefing'].includes(key);
 const sidebarActive=workspaceMember?'/workspace':key==='overview'&&source.includes('premium-dashboard')?'/?view=dashboard':page.active;
 let html=pageMetadata(source,page.active).replace(/<aside class="dashboard-sidebar"[\s\S]*?<\/aside>/,'').replace(/<dialog class="dashboard-command"[\s\S]*?<\/dialog>/,'').replace(/<nav class="mobile-dock"[\s\S]*?<\/nav>/g,'').replace(/<script src="\/dashboard-pro\.js[^"<>]*"[^>]*><\/script>/g,'');
 if(['terminal','trenches'].includes(key)) {
  const motion=HEADER.match(/<button class="prlx-motion-button"[\s\S]*?<\/button>/)?.[0]||'';
  const menu='<a class="prlx-trade-menu dashboard-search" href="/#tools" data-open-tools aria-label="Open navigation menu" aria-haspopup="dialog" aria-controls="dashboard-command"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg><span>All tools</span><kbd>⌘ K</kbd></a>';
  const utilities='<div class="prlx-trade-utilities">'+motion+menu+'</div>';
  html=key==='terminal'?html.replace('<form id="token-search"',utilities+'<form id="token-search"'):html.replace('<div class="market-header-actions">','<div class="market-header-actions">'+utilities);
 }
 const legacyHeader=html.match(/<header[^>]*>[\s\S]*?<\/header>/)?.[0];
 const account=legacyHeader?.match(/<a\b[^>]*id="session-link"[^>]*>[\s\S]*?<\/a>/)?.[0];
 if(legacyHeader)html=html.replace(legacyHeader,'');
 else if(key==='explore')html=html.replace(/<nav(?: class="site-legacy-nav")?>[\s\S]*?<\/nav>/,'');
 const section=['terminal','trenches','replay'].includes(key)?'TRADE':['pro','control','assistant','observatory','markets','following','briefing'].includes(key)?'RESEARCH':['planets','studio','creator','projects','premium','explore','discover'].includes(key)?'UNIVERSE':'OBSERVATORY';
 const pageLabel=key==='overview'&&source.includes('premium-dashboard')?'Dashboard':key==='pro'?'Parallax Gold':page.label;
 let header=HEADER.replace('__PAGE_LABEL__',pageLabel).replace('__SECTION_LABEL__',section);
 const storyHome=source.includes('id="home-story"');
 if(account)header=header.replace(/<a class="account-link"[^>]*>[\s\S]*?<\/a>/,account);
 // Keep keyboard users ahead of the long navigation and make the destination focusable.
 const oldSkip=html.match(/<a\b[^>]*class="[^"]*\b(?:skip|studio-skip)\b[^"]*"[^>]*>[\s\S]*?<\/a>/)?.[0];
 if(oldSkip)html=html.replace(oldSkip,'');
 html=html.replace(/<main([^>]*)>/,(_m,attrs:string)=>'<main'+attrs+(/\bid="/.test(attrs)?'':' id="workspace-main"')+'>');
 const mainId=html.match(/<main[^>]*\bid="([^"]+)"/)?.[1]||'workspace-main';
 const target=oldSkip?.match(/href="#([^"]+)"/)?.[1]||mainId;
 const skip=oldSkip?oldSkip.replace(/class="[^"]*"/,'class="workspace-skip"'):'<a class="workspace-skip" href="#'+target+'">Skip to content</a>';
 html=html.replace(/<(main|section|div)([^>]*)>/g,(match,tag:string,attrs:string)=>attrs.includes('id="'+target+'"')&&!attrs.includes('tabindex=')?'<'+tag+attrs+' tabindex="-1">':match);
 const css='<link rel="stylesheet" href="/solhandle-identity.css?v=143">'+'<link rel="stylesheet" href="/pro-membership.css?v=150">'+(html.includes('/dashboard-pro.css')?'':'<link rel="stylesheet" href="/dashboard-pro.css?v=90">')+'<link rel="stylesheet" href="/workspace-shell.css?v=191"><link rel="stylesheet" href="/dashboard-refresh.css?v=104">'+(key==='overview'&&source.includes('premium-dashboard')?'<link rel="stylesheet" href="/home-showcase.css?v=105">':'')+'<link rel="stylesheet" href="/navigation-clean.css?v=111"><link rel="stylesheet" href="/site-polish.css?v=137">'+(source.includes('id="dashboard-flight"')?'<link rel="stylesheet" href="/dashboard-flight.css?v=128">':'');
 const productFinish=['control','markets','observatory','following','briefing','pro','assistant'].includes(key)?'<link rel="stylesheet" href="/research-premium.css?v=167">':
  ['studio','creator','planets','projects','premium','discover','utility','development','roadmap','solhandle'].includes(key)?'<link rel="stylesheet" href="/worlds-premium.css?v=167">':
  ['docs','explore'].includes(key)?'<link rel="stylesheet" href="/experience-premium.css?v=167">':'';
 html=html.replace('</head>',css+(source.includes('id="prlx-utility"')?'<link rel="stylesheet" href="/dashboard-orbit.css?v=131">':'')+(storyHome?'<link rel="stylesheet" href="/home-story.css?v=138">':'')+'<link rel="stylesheet" href="/workspace-usability.css?v=144"><link rel="stylesheet" href="/workspace-premium.css?v=161"><link rel="stylesheet" href="/gold-experience.css?v=152">'+(source.includes('id="dashboard-flight"')?'<link rel="stylesheet" href="/dashboard-glass.css?v=151">':'')+'<link rel="stylesheet" href="/obsidian-theme.css?v=167">'+(storyHome?'<link rel="stylesheet" href="/home-future.css?v=167">':'')+productFinish+'<link rel="stylesheet" href="/observatory-design.css?v=168"><link rel="stylesheet" href="/workspace-hub.css?v=181"></head>');
 if(key==='premium')html=html.replace('</head>','<link rel="stylesheet" href="/premium-clean.css?v=186"></head>');
 if(['pro','control','observatory'].includes(key))html=html.replace('</head>','<link rel="stylesheet" href="/workspace-clean.css?v=184"></head>');
 if(goldWorkspace){
  // The new suite is deliberately last in the cascade; its presentation never grants access.
  html=html.replace(/<link\b[^>]*href="\/(?:gold-workspace|gold-research|gold-assistant|gold-membership)\.css[^"<>]*"[^>]*>/g,'');
  const sheet=key==='pro'?'gold-membership':key==='control'?'gold-research':'gold-assistant';
  html=html.replace('</head>','<link rel="stylesheet" href="/gold-workspace.css?v=225"><link rel="stylesheet" href="/'+sheet+'.css?v=225"></head>');
 }
 html=html.replace('</head>','<link rel="stylesheet" href="/parallax-system.css?v=226"><link rel="stylesheet" href="/parallax-chapters.css?v=226"></head>');
 if(!html.includes('name="theme-color"'))html=html.replace('</head>','<meta name="theme-color" content="#070b12"></head>');
 if(goldWorkspace)html=html.replace(/(<main[^>]*>)/,'$1'+GOLD_NAV);
 else if(workspaceMember)html=html.replace(/(<main[^>]*>)/,'$1'+WORKSPACE_NAV);
 if(goldWorkspace)html=html.replace(/(<meta\b[^>]*name="theme-color"[^>]*content=")[^"]*(")/,'$1#0d0e10$2');
 html=html.replace(/<body([^>]*)>/,(_match,attrs:string)=>{
  const shellClass='workspace-shell prlx-system'+(goldWorkspace?' gold-workspace':'');
  const next=attrs.includes('class="')?attrs.replace('class="','class="'+shellClass+' '):attrs+' class="'+shellClass+'"';
  return '<body'+next+' data-workspace-page="'+key+'" data-parallax-section="'+section.toLowerCase()+'">'+skip+active(SIDEBAR,sidebarActive).replace(/<details class="nav-group"(?: open)?>([\s\S]*?)<\/details>/g,(group,content)=>content.includes('aria-current="page"')?group.includes(' open')?group:group.replace('<details','<details open'):group)+header;
 });
 return html.replace('</body>',active(DOCK,page.mobile)+DIALOG+'<script src="/dashboard-pro.js?v=226" defer></script><script src="/gold-experience.js?v=183" defer></script><script src="/pro-membership.js?v=152" defer></script><script src="/solhandle-identity.js?v=156" defer></script><script src="/workspace-usability.js?v=184" defer></script>'+(goldWorkspace?'<script src="/gold-workspace.js?v=224" defer></script>':'')+'<script src="/parallax-system.js?v=226" defer></script><script src="/parallax-chapters.js?v=226" defer></script></body>');
}
