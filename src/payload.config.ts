import {
  buildConfig,
  type CollectionConfig,
  type Field,
  type TextField,
  type TextareaField,
  type GlobalConfig,
} from "payload";
import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { s3Storage } from "@payloadcms/storage-s3";
import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";
import { portfolioCatalog } from "./lib/portfolio.ts";
import { privacyPolicy, websiteTerms } from "./lib/legal.ts";
import {
  serviceSeeds,
  projectSeeds,
  siteSeed,
  pageSeeds,
} from "./lib/content.ts";
fs.mkdirSync(path.resolve("data"), { recursive: true });
const siteURL = new URL(
  process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000",
);
const trustedOrigins = [siteURL.origin];
if (["localhost", "127.0.0.1"].includes(siteURL.hostname)) {
  trustedOrigins.push(
    "http://localhost:" + (siteURL.port || "3000"),
    "http://127.0.0.1:" + (siteURL.port || "3000"),
  );
}
const auth = ({ req }: any) => Boolean(req.user);
const text = (name: string, required = false): TextField => ({
  name,
  type: "text",
  required,
});
const area = (name: string, required = false): TextareaField => ({
  name,
  type: "textarea",
  required,
});
const seo: Field[] = [
  { ...text("seoTitle"), label: "SEO title", admin: { description: "Optional search title. Aim for about 50–60 characters; the site adds the Paertner name." } },
  { ...area("seoDescription"), label: "Meta description", admin: { description: "Describe this page in about 140–160 characters. Empty fields use the page content." } },
  { name: "seoImage", label: "Social sharing image", type: "upload", relationTo: "media", admin: { description: "Optional image for link previews. A landscape image around 1200 × 630 works well." } },
  { ...text("canonicalURL"), label: "Canonical URL", validate: (v: any) => !v || /^https?:\/\//.test(v) || "Enter an absolute http or https URL.", admin: { description: "Leave empty to use this page’s own URL." } },
  { name: "noIndex", type: "checkbox", label: "Hide this page from search engines", defaultValue: false },
];
const image: Field = {
  name: "image",
  type: "upload",
  relationTo: "media",
  admin: {
    description:
      "Choose an image from Media or upload a new one. Clear this field to remove the image.",
  },
};
const Users: CollectionConfig = {
  slug: "users",
  auth: {
    cookies: { sameSite: "Lax", secure: siteURL.protocol === "https:" },
    tokenExpiration: 7200,
    maxLoginAttempts: 5,
    lockTime: 600000,
    // paertner Dashboard (app.paertner.com) edits the website through the REST API with the API key of one
    // service account, seeded from DASHBOARD_API_KEY in onInit below.
    useAPIKey: true,
  },
  admin: { useAsTitle: "email" },
  access: {
    read: auth,
    create: async ({ req }) =>
      Boolean(req.user) &&
      (await req.payload
        .count({ collection: "users", overrideAccess: true })
        .then((r) => r.totalDocs < 1)),
    update: auth,
    delete: () => false,
  },
  fields: [text("name")],
};
const Projects: CollectionConfig = {
  slug: "projects",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "sector", "_status", "updatedAt"],
  },
  access: {
    read: ({ req }) => (req.user ? true : { _status: { equals: "published" } }),
    create: auth,
    update: auth,
    delete: auth,
  },
  versions: { drafts: true, maxPerDoc: 20 },
  fields: [
    text("title", true),
    {
      ...text("slug", true),
      unique: true,
      validate: (value: any) =>
        (typeof value === "string" &&
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) ||
        "Use lowercase words separated by hyphens.",
    },
    text("descriptor", true),
    text("sector", true),
    text("year"),
    {
      ...text("liveURL"),
      label: "Live website URL",
      validate: (value: any) =>
        !value || /^https?:\/\//.test(value) || "Enter an absolute http or https URL.",
    },
    { name: "order", type: "number", defaultValue: 0 },
    { name: "featured", type: "checkbox" },
    {
      name: "concept",
      type: "checkbox",
      defaultValue: true,
      admin: {
        description:
          "Show the concept disclosure. Disable only for verified client projects.",
      },
    },
    { name: "services", type: "array", fields: [text("label", true)] },
    image,
    {
      name: "art",
      type: "select",
      options: ["portal", "attention", "creation"],
      defaultValue: "portal",
    },
    {
      name: "tone",
      type: "select",
      options: ["stone", "lime", "blue", "dark", "pink", "sage"],
      defaultValue: "stone",
    },
    area("challenge", true),
    area("idea", true),
    area("execution", true),
    area("result", true),
    {
      name: "details",
      type: "array",
      labels: { singular: "Case study detail", plural: "Case study details" },
      fields: [text("eyebrow"), text("title", true), area("body", true)],
    },
    {
      name: "screens",
      type: "array",
      labels: { singular: "Project screen", plural: "Project screens" },
      fields: [
        { name: "image", type: "upload", relationTo: "media", required: true },
        text("caption"),
      ],
    },
    ...seo,
  ],
};
const Services: CollectionConfig = {
  slug: "services",
  admin: { useAsTitle: "title" },
  access: { read: () => true, create: auth, update: auth, delete: auth },
  fields: [
    text("title", true),
    { ...text("slug", true), unique: true },
    text("short", true),
    area("intro", true),
    {
      name: "category",
      type: "select",
      options: ["Marketing", "Creation"],
      required: true,
    },
    text("number"),
    {
      name: "art",
      type: "select",
      options: ["portal", "attention", "creation"],
    },
    image,
    { name: "deliverables", type: "array", fields: [text("label", true)] },
    area("approach"),
    area("outcome"),
    ...seo,
  ],
};
const Media: CollectionConfig = {
  slug: "media",
  access: { read: () => true, create: auth, update: auth, delete: auth },
  upload: {
    staticDir: path.resolve("data/media"),
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
    adminThumbnail: "thumbnail",
    formatOptions: { format: "webp", options: { quality: 96, effort: 6 } },
    resizeOptions: { width: 2400, height: 2400, fit: "inside", withoutEnlargement: true },
    imageSizes: [
      { name: "thumbnail", width: 320, withoutEnlargement: true, formatOptions: { format: "webp", options: { quality: 75 } } },
      { name: "card", width: 960, withoutEnlargement: true, formatOptions: { format: "webp", options: { quality: 92 } } },
      { name: "hero", width: 1920, withoutEnlargement: true, formatOptions: { format: "webp", options: { quality: 96, effort: 6 } } },
    ],
  },
  fields: [text("alt", true)],
};
const Inquiries: CollectionConfig = {
  slug: "inquiries",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "email", "service", "status", "createdAt"],
  },
  access: { read: auth, create: () => false, update: auth, delete: auth },
  fields: [
    text("name", true),
    { name: "email", type: "email", required: true },
    text("company"),
    text("service"),
    area("message", true),
    {
      name: "status",
      type: "select",
      options: ["new", "contacted", "closed"],
      defaultValue: "new",
    },
    text("fingerprint"),
  ],
  hooks: {
    // Tell paertner Dashboard about a new inquiry so admins get a notification and an email. The dashboard reads
    // the inquiry back through the API, so only the id travels. A failure never blocks the visitor's request.
    afterChange: [
      ({ doc, operation }) => {
        const url = process.env.DASHBOARD_URL;
        const secret = process.env.DASHBOARD_WEBHOOK_SECRET;
        if (operation !== "create" || !url || !secret) return doc;
        void fetch(new URL("/api/website/inquiry", url), {
          method: "POST",
          headers: { Authorization: "Bearer " + secret, "Content-Type": "application/json" },
          body: JSON.stringify({ id: doc.id }),
          signal: AbortSignal.timeout(10000),
        }).catch(() => undefined);
        return doc;
      },
    ],
  },
};
const Redirects: CollectionConfig = {
  slug: "redirects",
  access: { read: auth, create: auth, update: auth, delete: auth },
  admin: { useAsTitle: "from" },
  fields: [
    {
      ...text("from", true),
      unique: true,
      validate: (v: any) =>
        (typeof v === "string" && /^\/(?!\/)/.test(v)) ||
        "Use an internal path beginning with one slash.",
    },
    {
      ...text("to", true),
      validate: (v: any) =>
        (typeof v === "string" && /^\/(?!\/)/.test(v)) ||
        "Use an internal path beginning with one slash.",
    },
  ],
};
const Pages: CollectionConfig = {
  slug: "pages",
  admin: { useAsTitle: "title" },
  access: { read: () => true, create: auth, update: auth, delete: () => false },
  fields: [
    {
      name: "slug",
      type: "select",
      options: ["home", "work", "services", "studio", "book", "privacy", "terms", "blog"],
      required: true,
      unique: true,
    },
    text("title", true),
    area("intro", true),
    image,
    ...seo,
  ],
};
const Posts: CollectionConfig = {
  slug: "posts", labels: { singular: "Blog post", plural: "Blog posts" },
  admin: { useAsTitle: "title", group: "Website", defaultColumns: ["title", "author", "_status", "publishedAt"], description: "Write articles as drafts, set their SEO metadata, and publish when ready. Published articles appear at /blog." },
  access: { read: ({ req }) => req.user ? true : { _status: { equals: "published" } }, create: auth, update: auth, delete: auth },
  versions: { drafts: true, maxPerDoc: 20 },
  fields: [{ type: "tabs", tabs: [
    { label: "Article", fields: [text("title", true), { ...text("slug", true), unique: true, validate: (v: any) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v || "") || "Use lowercase words separated by hyphens." }, area("excerpt", true), text("author", true), { name: "publishedAt", type: "date", required: true, defaultValue: () => new Date().toISOString() }, image, { ...area("body", true), admin: { description: "Separate paragraphs with a blank line. Use ## for section headings, - for list items, and [link text](/internal-path) for links to your services or contact form." } }] },
    { label: "Search preview", fields: seo },
  ] }],
};
const Site: GlobalConfig = {
  slug: "site",
  label: "Website content",
  access: { read: () => true, update: auth },
  versions: { max: 20 },
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: "Home & studio",
          fields: [
            { name: "contentVersion", type: "number", admin: { hidden: true } },
            text("methodTitle"),
            {
              name: "methodSteps",
              type: "array",
              fields: [text("title", true), area("body", true)],
            },
            {
              name: "principles",
              type: "array",
              fields: [text("title", true), area("body", true)],
            },
            text("name", true),
            text("tagline"),
            text("heroTitle", true),
            area("heroDescription", true),
            text("introTitle"),
            area("introBody"),
            text("convergenceTitle"),
            area("convergenceBody"),
            text("workTitle"),
            area("workDescription"),
            text("studioTitle"),
            area("studioBody"),
            text("ctaTitle"),
            area("ctaBody"),
          ],
        },
        {
          label: "Navigation & contact",
          fields: [
            {
              name: "nav",
              type: "array",
              fields: [
                text("label", true),
                {
                  ...text("href", true),
                  validate: (v: any) =>
                    (typeof v === "string" && /^\/(?!\/)/.test(v)) ||
                    "Use an internal path.",
                },
              ],
            },
            { name: "email", type: "email" },
            text("bookingURL"),
            {
              name: "faqs",
              type: "array",
              fields: [text("question", true), area("answer", true)],
            },
          ],
        },
        {
          label: "Website imagery",
          fields: [
            { name: "heroPoster", label: "Homepage video poster & transition", type: "upload", relationTo: "media" },
            { name: "studioImage", label: "Studio image", type: "upload", relationTo: "media" },
            { name: "socialImage", label: "Default social sharing image", type: "upload", relationTo: "media" },
          ],
        },
        {
          label: "SEO & legal",
          fields: [
            {
              name: "allowIndexing",
              type: "checkbox",
              defaultValue: false,
              admin: {
                description:
                  "Enable only after concept content, legal policies, contact details, and production configuration have been reviewed.",
              },
            },
            area("privacy"),
            area("terms"),
          ],
        },
      ],
    },
  ],
};
// Unnamed tabs organize the editor without changing stored field paths.
function organizeEditor(collection: CollectionConfig, groups: { label: string; names: string[] }[]) {
  const original = collection.fields;
  collection.fields = [{ type: "tabs", tabs: groups.map(({ label, names }) => ({
    label, fields: original.filter(field => "name" in field && names.includes(field.name)),
  })) }];
}
organizeEditor(Projects, [
  { label: "Overview", names: ["title", "slug", "descriptor", "sector", "year", "liveURL", "order", "featured", "concept", "services"] },
  { label: "Case study", names: ["challenge", "idea", "execution", "result", "details"] },
  { label: "Imagery", names: ["image", "screens", "art", "tone"] },
  { label: "Search preview", names: ["seoTitle", "seoDescription", "seoImage", "canonicalURL", "noIndex"] },
]);
organizeEditor(Services, [
  { label: "Overview", names: ["title", "slug", "short", "intro", "category", "number"] },
  { label: "Service details", names: ["deliverables", "approach", "outcome"] },
  { label: "Imagery", names: ["image", "art"] },
  { label: "Search preview", names: ["seoTitle", "seoDescription", "seoImage", "canonicalURL", "noIndex"] },
]);
for (const collection of [Pages, Projects, Services, Media]) collection.admin = { ...collection.admin, group: "Website" };
Inquiries.admin = { ...Inquiries.admin, group: "Conversations", description: "Review new inquiries, then mark them contacted or closed as you follow up." };
Users.admin = { ...Users.admin, group: "Settings" };
Redirects.admin = { ...Redirects.admin, group: "Settings", description: "Keep old website links working by pointing them to a new internal page." };
Services.admin = { ...Services.admin, defaultColumns: ["title", "category", "number", "updatedAt"], description: "Manage service copy, deliverables and images shown on your website." };
Projects.admin = { ...Projects.admin, description: "Draft your case study, add imagery, then publish when it is ready to share." };
Media.admin = { ...Media.admin, description: "Uploads are automatically converted to WebP, capped at 2400 px, and given thumbnail, card and hero sizes. Add meaningful alternative text." };
Pages.admin = { ...Pages.admin, description: "Edit the headings, introductions and search descriptions for your main pages." };
Site.admin = { ...Site.admin, group: "Website" };

export default buildConfig({
  csrf: trustedOrigins,
  cors: trustedOrigins,
  secret: process.env.PAYLOAD_SECRET || "",
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000",
  admin: {
    user: "users",
    components: {
      beforeDashboard: ["./components/AdminDashboard#default"],
      beforeLogin: ["./components/AdminDashboard#LoginIntro"],
      graphics: {
        Logo: "./components/AdminBrand#Logo",
        Icon: "./components/AdminBrand#Icon",
      },
    },
    importMap: { baseDir: path.resolve("src") },
    meta: {
      titleSuffix: " · Paertner Studio",
      robots: { index: false, follow: false },
    },
  },
  collections: [Pages, Projects, Services, Posts, Media, Inquiries, Users, Redirects],
  globals: [Site],
  db: process.env.DATABASE_URI
    ? postgresAdapter({
        migrationDir: path.resolve("src/migrations/postgres"),
        pool: { connectionString: process.env.DATABASE_URI },
      })
    : sqliteAdapter({
        migrationDir: path.resolve("src/migrations/sqlite"),
        client: {
          url:
            "file:" +
            path.join(
              process.cwd(),
              "data",
              process.env.SQLITE_DATABASE_FILE || "paertner-v1.db",
            ),
        },
      }),
  sharp,
  typescript: { outputFile: path.resolve("src/payload-types.ts") },
  plugins: process.env.S3_BUCKET
    ? [
        s3Storage({
          collections: { media: true },
          bucket: process.env.S3_BUCKET,
          config: {
            region: process.env.S3_REGION || "auto",
            endpoint: process.env.S3_ENDPOINT,
            credentials: {
              accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
              secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
            },
          },
        }),
      ]
    : [],
  onInit: async (payload) => {
    const users = await payload.count({ collection: "users" });
    if (
      users.totalDocs === 0 &&
      process.env.INITIAL_ADMIN_EMAIL &&
      process.env.INITIAL_ADMIN_PASSWORD
    ) {
      await payload.create({
        collection: "users",
        data: {
          email: process.env.INITIAL_ADMIN_EMAIL,
          password: process.env.INITIAL_ADMIN_PASSWORD,
          name: "Paertner",
        },
        overrideAccess: true,
      });
    }
    // The service account paertner Dashboard uses. Its API key follows DASHBOARD_API_KEY, so rotating the key is
    // an env change and a restart; without the variable the account is left as it is.
    if (process.env.DASHBOARD_API_KEY) {
      const email = "app@paertner.com";
      const found = await payload.find({ collection: "users", where: { email: { equals: email } }, limit: 1, overrideAccess: true, showHiddenFields: true });
      const data = { name: "paertner Dashboard", enableAPIKey: true, apiKey: process.env.DASHBOARD_API_KEY };
      if (found.docs[0]) {
        if (found.docs[0].apiKey !== process.env.DASHBOARD_API_KEY || !found.docs[0].enableAPIKey)
          await payload.update({ collection: "users", id: found.docs[0].id, data, overrideAccess: true });
      } else {
        await payload.create({
          collection: "users",
          data: { ...data, email, password: crypto.randomUUID() + crypto.randomUUID() },
          overrideAccess: true,
        });
      }
    }
    const existing = await payload.findGlobal({ slug: "site" });
    const fresh = !existing.heroTitle;
    if (!existing.heroTitle) {
      await payload.updateGlobal({ slug: "site", data: siteSeed as any });
    }
    const p = await payload.count({ collection: "projects" });
    if (fresh && p.totalDocs === 0) {
      for (const project of projectSeeds)
        await payload.create({ collection: "projects", data: project as any });
    }
    if (!existing.contentVersion || existing.contentVersion < 2) {
      for (const page of pageSeeds) {
        const found = await payload.count({
          collection: "pages",
          where: { slug: { equals: page.slug } },
        });
        if (!found.totalDocs)
          await payload.create({
            collection: "pages",
            data: { ...page, slug: page.slug as "work" | "services" | "book" },
          });
      }
      await payload.updateGlobal({
        slug: "site",
        data: {
          contentVersion: 2,
          methodTitle: siteSeed.methodTitle,
          methodSteps: siteSeed.methodSteps,
          principles: siteSeed.principles,
        },
      });
    }
    const s = await payload.count({ collection: "services" });
    if (fresh && s.totalDocs === 0) {
      for (const service of serviceSeeds)
        await payload.create({
          collection: "services",
          data: {
            ...service,
            deliverables: service.deliverables.map((label) => ({ label })),
          } as any,
        });
    }
    if (!existing.contentVersion || existing.contentVersion < 3) {
      const service = serviceSeeds.find((item) => item.slug === "business-analysis")!;
      const found = await payload.count({
        collection: "services",
        where: { slug: { equals: service.slug } },
      });
      if (!found.totalDocs) {
        await payload.create({
          collection: "services",
          data: {
            ...service,
            deliverables: service.deliverables.map((label) => ({ label })),
          } as any,
        });
      }
      await payload.updateGlobal({ slug: "site", data: { contentVersion: 3 } });
    }
    // One-time content import. Existing CMS edits and later deletions remain authoritative.
    if (!existing.contentVersion || existing.contentVersion < 4) {
      for (const { project } of portfolioCatalog) {
        const found = await payload.count({ collection: "projects", where: { slug: { equals: project.slug } } });
        if (!found.totalDocs) {
          await payload.create({ collection: "projects", data: project as any });
        }
      }
      const previousIntro = "Selected client work across strategy, design, and digital experiences.";
      const workPage = await payload.find({ collection: "pages", where: { slug: { equals: "work" } }, limit: 1 });
      if (workPage.docs[0]?.intro === previousIntro) {
        await payload.update({ collection: "pages", id: workPage.docs[0].id, data: { intro: siteSeed.workDescription } });
      }
      await payload.updateGlobal({ slug: "site", data: {
        contentVersion: 4,
        ...(existing.workDescription === previousIntro ? { workDescription: siteSeed.workDescription } : {}),
      } });
    }
    // Publish the approved company policies once; later CMS edits stay authoritative.
    if (!existing.contentVersion || existing.contentVersion < 5) {
      await payload.updateGlobal({ slug: "site", data: {
        contentVersion: 5,
        privacy: privacyPolicy,
        terms: websiteTerms,
      } });
    }
  },
});
