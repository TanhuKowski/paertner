import type { MetadataRoute } from "next";
import { getProjects, getServices, getPosts, getPage } from "@/lib/cms";
import { origin } from "@/lib/seo";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
 const routes = ["", "/work", "/services", "/studio", "/book", "/quote", "/privacy", "/terms", "/blog"];
 const [projects, services, posts, pages] = await Promise.all([getProjects(), getServices(), getPosts(), Promise.all(routes.map(route => getPage(route.slice(1) || "home")))]);
 const paths = [...routes.filter((_,i) => !pages[i]?.noIndex && !pages[i]?.canonicalURL), ...projects.filter(p=>!p.noIndex && !p.canonicalURL).map(p=>"/work/"+p.slug), ...services.filter(s=>!s.noIndex && !s.canonicalURL).map(s=>"/services/"+s.slug), ...posts.filter(p=>!p.noIndex && !p.canonicalURL).map(p=>"/blog/"+p.slug)];
 return paths.map(path=>({ url: origin+path, changeFrequency: "monthly", priority: path===""?1:0.7 }));
}
