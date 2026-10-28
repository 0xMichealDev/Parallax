import {workspaceShell} from '../workspace-shell';
import html from '../planets.html?raw';
import {atlasEditorial} from '../universe-editorial';
export function GET(){
 const source=html.replace('<!--ATLAS_EDITORIAL-->',atlasEditorial()).replace('</head>','<link rel="stylesheet" href="/planet-atlas.css?v=196"><link rel="stylesheet" href="/community-atlas.css?v=197"><link rel="stylesheet" href="/universe-editorial.css?v=120"><link rel="stylesheet" href="/atlas-expeditions.css?v=203"></head>');
 const page=workspaceShell(source,'planets');
 return new Response(page,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'}});
}
