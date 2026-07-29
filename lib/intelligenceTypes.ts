export interface DeployTarget {
  id: string;
  label: string;
  icon: string;
  description: string;
  url: string;
}

export const DEPLOY_TARGETS: DeployTarget[] = [
  { id: "vercel", label: "Vercel", icon: "▲", description: "Next.js için en iyi, otomatik deploy", url: "https://vercel.com/new" },
  { id: "netlify", label: "Netlify", icon: "◆", description: "Statik siteler ve JAMstack", url: "https://app.netlify.com/start" },
  { id: "cloudflare", label: "Cloudflare Pages", icon: "☁", description: "Hızlı CDN, ücretsiz tier", url: "https://pages.cloudflare.com" },
  { id: "railway", label: "Railway", icon: "🚂", description: "Backend + veritabanı deploy", url: "https://railway.app/new" },
];

export interface ModelAssignment {
  stage: "planning" | "coding" | "review";
  providerId: string;
  model: string;
  reason: string;
}
