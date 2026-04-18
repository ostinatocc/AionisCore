import type { JSX } from "preact";

export interface LogoMarkProps extends Omit<JSX.SVGAttributes<SVGSVGElement>, "class"> {
  size?: number;
  className?: string;
  /** Stroke color; defaults to the ink token. */
  stroke?: string;
}

/**
 * Aionis Λ logomark. Simple two-stroke lambda with a seat that sits above
 * the baseline at 22% — see VI §2.
 */
export function LogoMark({ size = 24, className = "", stroke = "currentColor", ...rest }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      class={className}
      {...rest}
    >
      <path
        d="M4 20 L12 4 L20 20 M8 14 L16 14"
        fill="none"
        stroke={stroke}
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}
