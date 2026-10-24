"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes, ComponentProps, MouseEvent, ReactNode } from "react";
import { playBlip } from "@/lib/sound";

type Variant = "primary" | "amber" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

function classes(variant: Variant, size: Size, extra?: string) {
  const v = variant === "primary" ? "" : ` px-btn--${variant}`;
  const s = size === "md" ? "" : ` px-btn--${size}`;
  return `px-btn${v}${s}${extra ? ` ${extra}` : ""}`;
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
    <button
      {...rest}
      type={type}
      className={classes(variant, size, className)}
      onClick={(e: MouseEvent<HTMLButtonElement>) => {
        playBlip("press");
        onClick?.(e);
      }}
    />
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
    <Link
      {...rest}
      href={href}
      className={classes(variant, size, className)}
      onClick={(e) => {
        playBlip("press");
        onClick?.(e);
      }}
    >
      {children}
    </Link>
  );
}
