"use client";

import { ReactNode, useEffect, useMemo, useRef } from "react";

/**
 * SwatchBar — 10-color pixel ribbon under the header.
 * Hover a cell: it stretches vertically and brightens while peers dim.
 */
export function SwatchBar() {
  const palette = [
    "var(--sw-1)",
    "var(--sw-2)",
    "var(--sw-3)",
    "var(--sw-4)",
    "var(--sw-5)",
    "var(--sw-6)",
    "var(--sw-7)",
    "var(--sw-8)",
    "var(--sw-9)",
    "var(--sw-10)",
  ];
  return (
    <div className="swatch-bar" aria-hidden>
      {palette.map((c, i) => (
        <span key={i} style={{ background: c }} />
      ))}
    </div>
  );
}

/**
 * PixelGrid — 10x10 board. Deterministic base colors, with a subset of
 * cells animated through the palette to evoke the ARC-AGI puzzle feel.
 */
export function PixelGrid({ size = 10, seed = "aionis" }: { size?: number; seed?: string }) {
  const cells = useMemo(() => {
    const total = size * size;
    const base = Array.from({ length: total }, (_, i) => {
      const h = hashStr(`${seed}:${i}`);
      // ~82% cells are dark, ~18% pick an accent from the palette
      if (h % 100 < 82) return { color: "#17171a", anim: "" };
      const palette = [
        "var(--sw-2)",
        "var(--sw-1)",
        "var(--sw-4)",
        "var(--sw-6)",
        "var(--sw-5)",
        "var(--sw-3)",
      ];
      const color = palette[h % palette.length];
      const animKeys = ["a", "b", "c", "d"];
      const anim = h % 4 === 0 ? animKeys[h % animKeys.length] : "";
      return { color, anim };
    });
    return base;
  }, [size, seed]);

  return (
    <div className="pixel-grid" role="img" aria-label="Aionis memory loop grid">
      {cells.map((c, i) => (
        <div
          key={i}
          className={`cell${c.anim ? ` ${c.anim}` : ""}`}
          style={{ background: c.color }}
        />
      ))}
    </div>
  );
}

function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Reveal — wraps children in a `.reveal` block that fades/slides in on
 * intersection. Noop with prefers-reduced-motion.
 */
export function Reveal({
  children,
  as: Tag = "div",
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  as?: keyof HTMLElementTagNameMap | "section" | "article" | "div";
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      node.classList.add("in-view");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            window.setTimeout(() => node.classList.add("in-view"), delay);
            io.unobserve(node);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [delay]);

  // Cast avoids union complaints for Tag
  const Element = Tag as unknown as React.ElementType;
  return (
    <Element ref={ref as never} className={`reveal ${className}`.trim()}>
      {children}
    </Element>
  );
}

/**
 * SectionLabel — uppercase mono label with a colored pixel square prefix.
 */
export function SectionLabel({
  children,
  tone = "yellow",
}: {
  children: ReactNode;
  tone?: "yellow" | "magenta" | "green" | "blue" | "cyan" | "orange" | "purple";
}) {
  const cls = tone === "yellow" ? "sec-label" : `sec-label c-${tone}`;
  return (
    <span className={cls}>
      <i />
      {children}
    </span>
  );
}
