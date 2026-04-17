import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

const repo = "https://github.com/ostinatocc/AionisCore";
const base = "/AionisCore/";
const asset = (path: string) => `${base}${path}`;

export default withMermaid(defineConfig({
  title: "Aionis Runtime",
  description: "Local continuity runtime for coding agents",
  lang: "en-US",
  base,
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ["link", { rel: "icon", href: asset("favicon.svg") }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:title", content: "Aionis Runtime Docs" }],
    ["meta", { property: "og:description", content: "Local continuity runtime for coding agents" }],
    ["meta", { property: "og:image", content: asset("social-card.svg") }],
  ],
  themeConfig: {
    logo: "/logo-mark.svg",
    siteTitle: "Aionis Runtime",
    nav: [
      { text: "Introduction", link: "/docs/intro" },
      { text: "Architecture", link: "/docs/architecture/overview" },
      { text: "Quickstart", link: "/docs/getting-started" },
      { text: "SDK", link: "/docs/sdk/quickstart" },
      { text: "Reference", link: "/docs/reference/contracts-and-routes" },
      { text: "v0.1.0 · Lite", link: "/docs/runtime/lite-runtime" },
      { text: "GitHub", link: repo },
    ],
    search: {
      provider: "local",
    },
    socialLinks: [
      { icon: "github", link: repo },
    ],
    editLink: {
      pattern: `${repo}/edit/main/apps/docs/:path`,
      text: "Edit this page on GitHub",
    },
    footer: {
      message: "Local continuity runtime for coding agents",
      copyright: `Copyright © ${new Date().getFullYear()} Aionis Runtime`,
    },
    sidebar: {
      "/docs/": [
        {
          text: "Introduction",
          items: [
            { text: "What Aionis Runtime Is", link: "/docs/intro" },
            { text: "Why Aionis", link: "/docs/why-aionis" },
            { text: "Architecture Overview", link: "/docs/architecture/overview" },
            { text: "Getting Started", link: "/docs/getting-started" },
          ],
        },
        {
          text: "Concepts",
          items: [
            { text: "Task Start", link: "/docs/concepts/task-start" },
            { text: "Task Handoff", link: "/docs/concepts/handoff" },
            { text: "Task Replay", link: "/docs/concepts/replay" },
          ],
        },
        {
          text: "Runtime",
          items: [
            { text: "Lite Runtime", link: "/docs/runtime/lite-runtime" },
            { text: "Lite Config and Operations", link: "/docs/runtime/lite-config-and-operations" },
            { text: "Automation", link: "/docs/runtime/automation" },
            { text: "Sandbox", link: "/docs/runtime/sandbox" },
          ],
        },
        {
          text: "SDK",
          items: [
            { text: "SDK Quickstart", link: "/docs/sdk/quickstart" },
            { text: "Client and Host Bridge", link: "/docs/sdk/client-and-bridge" },
          ],
        },
        {
          text: "Guides",
          items: [
            { text: "Repeated Task Kickoff", link: "/docs/guides/repeated-task-kickoff" },
            { text: "Pause and Resume", link: "/docs/guides/pause-and-resume" },
            { text: "Replay to Playbook", link: "/docs/guides/replay-to-playbook" },
          ],
        },
        {
          text: "Reference",
          items: [
            { text: "Contracts and Routes", link: "/docs/reference/contracts-and-routes" },
            { text: "Memory", link: "/docs/reference/memory" },
            { text: "Handoff", link: "/docs/reference/handoff" },
            { text: "Replay and Playbooks", link: "/docs/reference/replay-and-playbooks" },
            { text: "Review Runtime", link: "/docs/reference/review-runtime" },
          ],
        },
        {
          text: "Evidence",
          items: [
            { text: "Validation and Benchmarks", link: "/docs/evidence/validation-and-benchmarks" },
          ],
        },
        {
          text: "Support",
          items: [
            { text: "FAQ and Troubleshooting", link: "/docs/faq-and-troubleshooting" },
          ],
        },
        {
          text: "Contributing",
          items: [
            { text: "Architecture and Boundaries", link: "/docs/contributing/architecture-and-boundaries" },
          ],
        },
      ],
    },
  },
}), {
  mermaid: {
    securityLevel: "loose",
    fontFamily: "Newsreader, Iowan Old Style, Palatino Linotype, Georgia, serif",
    themeVariables: {
      // Morandi palette aligned with the docs theme
      background: "#f6f3ea",
      primaryColor: "#ede8db",
      primaryTextColor: "#2a2620",
      primaryBorderColor: "#7a6fa4",
      secondaryColor: "#e2dccd",
      secondaryTextColor: "#2a2620",
      secondaryBorderColor: "rgba(42, 38, 32, 0.18)",
      tertiaryColor: "#f6f3ea",
      tertiaryTextColor: "#6b6358",
      tertiaryBorderColor: "rgba(42, 38, 32, 0.08)",
      lineColor: "rgba(42, 38, 32, 0.38)",
      textColor: "#2a2620",
      mainBkg: "#ede8db",
      nodeBorder: "#7a6fa4",
      clusterBkg: "#f6f3ea",
      clusterBorder: "rgba(42, 38, 32, 0.12)",
      titleColor: "#2a2620",
      edgeLabelBackground: "#f6f3ea",
      noteBkgColor: "#ede8db",
      noteBorderColor: "#7a6fa4",
      noteTextColor: "#2a2620",
    },
  },
  mermaidPlugin: {
    class: "mermaid aionis-mermaid",
  },
});
