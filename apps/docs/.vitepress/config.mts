import { defineConfig } from "vitepress";

const repo = "https://github.com/ostinatocc/AionisCore";
const base = "/AionisCore/";
const asset = (path: string) => `${base}${path}`;

export default defineConfig({
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
    logo: asset("logo-mark.svg"),
    nav: [
      { text: "Introduction", link: "/docs/intro" },
      { text: "Architecture", link: "/docs/architecture/overview" },
      { text: "Quickstart", link: "/docs/getting-started" },
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
});
