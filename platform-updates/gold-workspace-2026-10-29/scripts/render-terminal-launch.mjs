import {readFile, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

// Exact typography and a real public interface capture, rendered as a product
// card. No fabricated chart, wallet balance or simulated market figures.
const require=createRequire(import.meta.url);
let sharp;
try{sharp=require('sharp');}
catch{sharp=require(require.resolve('sharp',{paths:[require.resolve('wrangler')]}));}
const asset=new URL('../public/assets/terminal/',import.meta.url);
const screenshot=await readFile(new URL('terminal-interface-20261029.jpg',asset));
const svg=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630">
<title>The new Terminal · PARALLAX</title>
<desc>PARALLAX Terminal launch card with native candlesticks, a token discovery list and a Jupiter quote-review panel from a public interface captured on 29 October 2026.</desc>
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0c1018"/><stop offset=".58" stop-color="#070b11"/><stop offset="1" stop-color="#11131f"/></linearGradient>
  <radialGradient id="halo"><stop stop-color="#7361ad" stop-opacity=".21"/><stop offset="1" stop-color="#7361ad" stop-opacity="0"/></radialGradient>
  <linearGradient id="border" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#706786"/><stop offset=".46" stop-color="#333343"/><stop offset="1" stop-color="#8372b5"/></linearGradient>
  <linearGradient id="accent"><stop stop-color="#d9ccff"/><stop offset="1" stop-color="#a996e6"/></linearGradient>
  <clipPath id="screen"><rect x="482" y="122" width="674" height="463" rx="12"/></clipPath>
  <filter id="shadow" x="-15%" y="-15%" width="130%" height="145%"><feDropShadow dx="0" dy="13" stdDeviation="18" flood-color="#000" flood-opacity=".55"/></filter>
</defs>
<rect width="1200" height="630" fill="url(#bg)"/>
<ellipse cx="869" cy="340" rx="520" ry="350" fill="url(#halo)"/>
<g fill="none" stroke="#a695cf" stroke-opacity=".13" stroke-width="1">
  <ellipse cx="868" cy="332" rx="445" ry="239" transform="rotate(-28 868 332)"/>
  <ellipse cx="868" cy="332" rx="466" ry="252" transform="rotate(-28 868 332)"/>
</g>
<g transform="translate(58 35)" fill="none" stroke="#c2b1ee" stroke-width="1.3">
  <circle cx="16" cy="16" r="9"/><ellipse cx="16" cy="16" rx="15" ry="5.5" transform="rotate(-35 16 16)"/>
  <circle cx="27" cy="8" r="1.4" fill="#c2b1ee" stroke="none"/>
</g>
<g font-family="Nimbus Sans, DejaVu Sans, sans-serif">
  <text x="103" y="57" fill="#f0eef6" font-size="18" font-weight="700" letter-spacing="4.2">PARALLAX</text>
  <text x="1156" y="55" fill="#8b8d9f" font-size="10" letter-spacing="2.8" text-anchor="end">THE SOLANA WORKSPACE</text>
  <path d="M58 82H1156" stroke="#343443" stroke-opacity=".7"/>
  <rect x="60" y="128" width="219" height="25" rx="4" fill="#aaa0d6" fill-opacity=".08" stroke="#a997dc" stroke-opacity=".25"/>
  <circle cx="74" cy="140.5" r="2.6" fill="#b9a7ee"/>
  <text x="86" y="144" fill="#c2b1ed" font-size="9" letter-spacing="2">NEW TRADING WORKSPACE</text>
  <text x="58" y="227" fill="#f3f1f8" font-size="53" font-weight="700" letter-spacing="-1.8">THE NEW</text>
  <text x="56" y="290" fill="url(#accent)" font-size="63" font-weight="700" letter-spacing="-2.2">TERMINAL.</text>
  <text x="61" y="350" fill="#e3e1e9" font-size="23">Find it in Trenches.</text>
  <text x="61" y="383" fill="#a7a7b8" font-size="23">Read it in Terminal.</text>
  <path d="M61 417H95" stroke="#b5a1e8" stroke-width="2"/>
  <text x="61" y="449" fill="#989aab" font-size="14">Native charts · Token discovery</text>
  <text x="61" y="474" fill="#989aab" font-size="14">Market activity · Jupiter quote review</text>
  <text x="61" y="542" fill="#dad2ee" font-size="10" font-weight="700" letter-spacing="2.1">ENTER THE TERMINAL</text>
  <path d="M230 538H250m-6-6 6 6-6 6" fill="none" stroke="#bba6ee" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
</g>
<rect x="481.5" y="121.5" width="675" height="464" rx="12.5" fill="#11141e" stroke="url(#border)" filter="url(#shadow)"/>
<image x="482" y="122" width="674" height="463" preserveAspectRatio="xMidYMid meet" clip-path="url(#screen)" xlink:href="data:image/jpeg;base64,${screenshot.toString('base64')}"/>
<rect x="482" y="122" width="674" height="463" rx="12" fill="none" stroke="url(#border)" stroke-opacity=".7"/>
<g font-family="Nimbus Sans, DejaVu Sans, sans-serif" font-size="8.5" letter-spacing="1.7">
  <text x="61" y="610" fill="#707487">PARALLAXLAUNCH.LIVE</text>
  <text x="1156" y="610" fill="#707487" text-anchor="end">INTERFACE SNAPSHOT · 29 OCT 2026</text>
</g>
</svg>`;
const svgPath=new URL('terminal-launch-20261029.svg',asset);
const pngPath=new URL('terminal-launch-20261029.png',asset);
await writeFile(svgPath,svg);
await sharp(Buffer.from(svg)).png({compressionLevel:9}).toFile(fileURLToPath(pngPath));
console.log('Rendered Terminal launch card: 1200 × 630 PNG and editable SVG.');
