import type { ComponentChildren, JSX } from "preact";

export type ButtonVariant = "primary" | "alt" | "ghost";

export interface ButtonProps extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, "class"> {
  variant?: ButtonVariant;
  children: ComponentChildren;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "btn btn-primary",
  alt: "btn btn-alt",
  ghost: "btn btn-ghost",
};

/**
 * VI §6 button. 40px pill, Newsreader 14px wght 500. Three variants: primary
 * fills with signal; alt is transparent with a line border; ghost strips the
 * border for toolbar-y placements.
 */
export function Button({
  variant = "primary",
  className = "",
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const base = VARIANT_CLASS[variant];
  return (
    <button type={type} class={`${base} ${className}`.trim()} {...rest}>
      <span class="no-transform">{children}</span>
    </button>
  );
}
