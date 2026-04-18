import { useCallback } from "preact/hooks";
import { Hero } from "./components/hero";
import { KickoffCard } from "./components/kickoff-card";
import { WhatJustHappened } from "./components/what-just-happened";
import { InstallBlock } from "./components/install-block";
import { Footer } from "./components/footer";
import { playgroundClient } from "./lib/playground-client";
import { DEMO_RUNS, DEMO_TENANT_ID, demoIdentity } from "./lib/visitor-scope";

export function App() {
  const scrollToKickoff = useCallback(() => {
    const el = document.getElementById("kickoff");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div class="flex min-h-screen flex-col">
      <Hero onPrimaryClick={scrollToKickoff} />
      <KickoffCard tenantId={DEMO_TENANT_ID} runs={DEMO_RUNS} />
      <WhatJustHappened />
      <InstallBlock />
      <Footer scope={demoIdentity.scope} apiUrl={playgroundClient.apiUrl} />
    </div>
  );
}
