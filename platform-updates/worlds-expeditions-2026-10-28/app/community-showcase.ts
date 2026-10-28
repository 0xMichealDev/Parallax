import worlds from '../public/ecosystem-worlds.json';

export type CommunityProjectSlug = 'bonk' | 'pengu' | 'wif' | 'popcat' | 'sheeple' | 'trump';
export type CommunityProject = Readonly<{
  slug: CommunityProjectSlug;
  mint: string;
  website: string;
  proofOrigin: string;
}>;

// Reviewed issuer origins are a fixed allowlist, never a submitted project URL.
const proofOrigins: Readonly<Record<CommunityProjectSlug, string>> = Object.freeze({
  bonk: 'https://www.bonkcoin.com',
  pengu: 'https://pengu.pudgypenguins.com',
  wif: 'https://dogwifcoin.org',
  popcat: 'https://www.popcatsolana.xyz',
  sheeple: 'https://www.thesheepleflock.com',
  trump: 'https://gettrumpmemes.com',
});

export function getCommunityProject(slug: string): CommunityProject | null {
  if (!Object.prototype.hasOwnProperty.call(proofOrigins, slug)) return null;
  const key = slug as CommunityProjectSlug;
  const world = worlds.find(item => item.id === key && item.showcase === 'community-showcase');
  if (!world?.contractAddress) return null;
  return Object.freeze({slug: key, mint: world.contractAddress, website: world.url, proofOrigin: proofOrigins[key]});
}
