import { defineConfig } from "vitepress";
import fs from "node:fs";
import path from "node:path";

export default defineConfig({
  vite: {
    plugins: [
      {
        name: "serve-configurator",
        configureServer(server) {
          // Serve the pre-built configurator SPA before VitePress handles the route
          server.middlewares.use("/configurator", (req, res, next) => {
            const publicDir = path.resolve(__dirname, "../public/configurator");
            // Serve the exact file if it exists, otherwise fall back to index.html for SPA routing
            const reqPath = req.url?.split("?")[0] ?? "/";
            const filePath = path.join(publicDir, reqPath === "/" ? "index.html" : reqPath);
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
              const ext = path.extname(filePath);
              const mimeTypes: Record<string, string> = {
                ".html": "text/html",
                ".js": "application/javascript",
                ".css": "text/css",
                ".svg": "image/svg+xml",
                ".png": "image/png",
                ".json": "application/json",
              };
              res.setHeader("Content-Type", mimeTypes[ext] || "application/octet-stream");
              fs.createReadStream(filePath).pipe(res);
              return;
            }
            // SPA fallback: serve index.html for any unmatched route
            const indexPath = path.join(publicDir, "index.html");
            if (fs.existsSync(indexPath)) {
              res.setHeader("Content-Type", "text/html");
              fs.createReadStream(indexPath).pipe(res);
              return;
            }
            next();
          });
        },
      },
    ],
  },

  appearance: "dark",

  title: "showwhat",
  description: "A definition format and evaluation engine for feature flags and configuration",
  ignoreDeadLinks: [/\/configurator\//],

  head: [
    [
      "link",
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/favicon.svg",
      },
    ],
    [
      "link",
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
    ],
    [
      "link",
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossorigin: "",
      },
    ],
    [
      "link",
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&family=Fraunces:opsz,wght@9..144,400;9..144,700;9..144,900&family=Geist+Mono:wght@400;500&display=swap",
      },
    ],
  ],

  themeConfig: {
    search: { provider: "local" },

    logo: { light: "/logo-v2-b.svg", dark: "/logo-v2-w.svg" },

    nav: [
      { text: "Comparison", link: "/docs/comparison" },
      { text: "Docs", link: "/docs/" },
      { text: "Configurator", link: "/configurator/", target: "_blank" },
    ],

    sidebar: {
      "/docs/": [
        {
          text: "Getting Started",
          items: [
            { text: "Introduction", link: "/docs/" },
            { text: "Sample Config", link: "/docs/sample-config" },
            { text: "Security", link: "/docs/security" },
            { text: "Comparison", link: "/docs/comparison" },
          ],
        },
        {
          text: "Concepts",
          items: [
            { text: "Definitions", link: "/docs/definitions" },
            { text: "Conditions", link: "/docs/conditions" },
            { text: "Context", link: "/docs/context" },
            { text: "Presets", link: "/docs/presets" },
            { text: "Data Sources", link: "/docs/data-sources" },
          ],
        },
        {
          text: "Configurator",
          items: [
            { text: "Overview", link: "/docs/configurator" },
            { text: "Using the App", link: "/docs/configurator-using-the-app" },
            { text: "Using the Library", link: "/docs/configurator-using-the-library" },
          ],
        },
        {
          text: "Extending",
          items: [
            {
              text: "Custom Conditions",
              link: "/docs/custom-conditions",
              items: [
                { text: "Fallback Evaluator", link: "/docs/custom-conditions#fallback-evaluator" },
                { text: "Annotations", link: "/docs/custom-conditions#annotations" },
                {
                  text: "Percentage Rollouts",
                  link: "/docs/custom-conditions#example-percentage-rollouts",
                },
                { text: "User Targeting", link: "/docs/custom-conditions#example-user-attribute" },
              ],
            },
            { text: "Custom Data Sources", link: "/docs/custom-data-sources" },
          ],
        },
        {
          text: "Integrations",
          items: [{ text: "OpenFeature", link: "/docs/openfeature" }],
        },
        {
          text: "API Reference",
          items: [
            {
              text: "Core",
              link: "/docs/core",
              items: [
                { text: "MemoryData", link: "/docs/memory" },
                { text: "Errors", link: "/docs/errors" },
              ],
            },
          ],
        },
      ],
    },

    socialLinks: [{ icon: "github", link: "https://github.com/yeojz/showwhat" }],

    footer: {
      copyright: "\u00A9 2026 Gerald Yeo. MIT Licensed.",
    },
  },
});
