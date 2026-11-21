"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes, ComponentProps, MouseEvent, ReactNode } from "react";
import { playBlip } from "@/lib/sound";

type Variant = "primary" | "amber" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

function face(variant: Variant, size: Size) {
  const v = variant === "primary" ? "" : ` px-btn--${variant}`;
  const s = size === "md" ? "" : ` px-btn--${size}`;
  return `px-btn notch${v}${s}`;
}

// The wrapper carries the hard offset shadow (clip-path on the face would cut
// it off) and any layout classes the caller passes.
function wrap(extra?: string) {
  return `px-btn-wrap${extra ? ` ${extra}` : ""}`;
}

export function PixelButton({
  variant = "primary",
  size = "md",
  className,
  onClick,
  type = "button",
  ...rest
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return (
    <span className={wrap(className)}>
      <button
        {...rest}
        type={type}
        className={face(variant, size)}
        onClick={(e: MouseEvent<HTMLButtonElement>) => {
          playBlip("press");
          onClick?.(e);
        }}
      />
    </span>
  );
}

export function PixelLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  onClick,
  ...rest
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}) {
  return (
    <span className={wrap(className)}>
      <Link
        {...rest}
        href={href}
        className={face(variant, size)}
        onClick={(e) => {
          playBlip("press");
          onClick?.(e);
        }}
      >
        {children}
      </Link>
    </span>
  );
}
