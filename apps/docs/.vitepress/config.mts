import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

const repo = "https://github.com/ostinatocc/AionisCore";
const base = "/AionisCore/";
const asset = (path: string) => `${base}${path}`;

export default withMermaid(defineConfig({
  title: "Aionis Runtime",
  description: "Self-evolving continuity runtime for agent systems",
  lang: "en-US",
  base,
  cleanUrls: true,
  lastUpdated: true,
  appearance: false,
  head: [
    ["link", { rel: "icon", href: asset("favicon.svg") }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:title", content: "Aionis Runtime Docs" }],
    ["meta", { property: "og:description", content: "Self-evolving continuity runtime for agent systems" }],
    ["meta", { property: "og:image", content: asset("social-card.svg") }],
  ],
  themeConfig: {
    logo: "/logo-mark.svg",
    siteTitle: "Aionis Runtime",
    nav: [
      { text: "Start", link: "/docs/evidence/what-ships-today" },
      { text: "Integrate", link: "/docs/sdk/quickstart" },
      { text: "Operate", link: "/docs/runtime/lite-runtime" },
      { text: "Understand", link: "/docs/architecture/overview" },
      { text: "Evidence", link: "/docs/evidence/proof-by-evidence" },
      { text: "Reference", link: "/docs/reference/contracts-and-routes" },
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
      message: "Self-evolving continuity runtime for agent systems",
      copyright: `Copyright © ${new Date().getFullYear()} Aionis Runtime`,
    },
    sidebar: {
      "/docs/": [
        {
          text: "Start Here",
          items: [
            { text: "What Ships Today", link: "/docs/evidence/what-ships-today" },
            { text: "Getting Started", link: "/docs/getting-started" },
            { text: "What Aionis Runtime Is", link: "/docs/intro" },
            { text: "Why Aionis", link: "/docs/why-aionis" },
          ],
        },
        {
          text: "Integrate",
          items: [
            { text: "SDK Quickstart", link: "/docs/sdk/quickstart" },
            { text: "Client and Host Bridge", link: "/docs/sdk/client-and-bridge" },
            { text: "Operator Projection and Action Hints", link: "/docs/sdk/operator-projection-and-action-hints" },
          ],
        },
        {
          text: "Operate Lite",
          items: [
            { text: "Lite Runtime", link: "/docs/runtime/lite-runtime" },
            { text: "Lite Config and Operations", link: "/docs/runtime/lite-config-and-operations" },
            { text: "Automation", link: "/docs/runtime/automation" },
            { text: "Sandbox", link: "/docs/runtime/sandbox" },
            { text: "FAQ and Troubleshooting", link: "/docs/faq-and-troubleshooting" },
          ],
        },
        {
          text: "Understand",
          items: [
            { text: "Architecture Overview", link: "/docs/architecture/overview" },
            { text: "Task Start", link: "/docs/concepts/task-start" },
            { text: "Task Handoff", link: "/docs/concepts/handoff" },
            { text: "Task Replay", link: "/docs/concepts/replay" },
            { text: "Action Retrieval", link: "/docs/concepts/action-retrieval" },
            { text: "Uncertainty and Gates", link: "/docs/concepts/uncertainty-and-gates" },
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
          text: "Advanced Surfaces",
          items: [
            { text: "Memory", link: "/docs/reference/memory" },
            { text: "Semantic Forgetting", link: "/docs/reference/semantic-forgetting" },
            { text: "Policy Memory and Evolution", link: "/docs/reference/policy-memory" },
            { text: "Review Runtime", link: "/docs/reference/review-runtime" },
          ],
        },
        {
          text: "Evidence",
          items: [
            { text: "What Ships Today", link: "/docs/evidence/what-ships-today" },
            { text: "Proof By Evidence", link: "/docs/evidence/proof-by-evidence" },
            { text: "Self-Evolving Demos", link: "/docs/evidence/self-evolving-demos" },
            { text: "Validation and Evidence", link: "/docs/evidence/validation-and-benchmarks" },
            { text: "Commercial Family Strategy", link: "/docs/evidence/commercial-family-strategy" },
          ],
        },
        {
          text: "Reference",
          items: [
            { text: "Contracts and Routes", link: "/docs/reference/contracts-and-routes" },
            { text: "Handoff", link: "/docs/reference/handoff" },
            { text: "Replay and Playbooks", link: "/docs/reference/replay-and-playbooks" },
          ],
        },
      ],
    },
  },
}), {
  mermaid: {
    securityLevel: "loose",
    fontFamily: "Geist, system-ui, sans-serif",
    themeVariables: {
      // Mirrors apps/site: dark runtime canvas with yellow/cyan/magenta signals.
      background: "#0a0a0b",
      primaryColor: "#18181b",
      primaryTextColor: "#f4f4f5",
      primaryBorderColor: "#ffd60a",
      secondaryColor: "#141416",
      secondaryTextColor: "#f4f4f5",
      secondaryBorderColor: "rgba(57, 212, 212, 0.38)",
      tertiaryColor: "#121214",
      tertiaryTextColor: "#a1a1aa",
      tertiaryBorderColor: "rgba(255, 255, 255, 0.12)",
      lineColor: "rgba(255, 255, 255, 0.38)",
      textColor: "#f4f4f5",
      mainBkg: "#18181b",
      nodeBorder: "#ffd60a",
      clusterBkg: "#0f0f10",
      clusterBorder: "rgba(255, 255, 255, 0.12)",
      titleColor: "#f4f4f5",
      edgeLabelBackground: "#121214",
      noteBkgColor: "#141416",
      noteBorderColor: "#ffd60a",
      noteTextColor: "#f4f4f5",
    },
  },
  mermaidPlugin: {
    class: "mermaid aionis-mermaid",
  },
});
