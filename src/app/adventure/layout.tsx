import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Adventure",
  description: "Syntax Valley: five levels and a boss.",
  robots: { index: false, follow: false },
};

export default function AdventureLayout({ children }: LayoutProps<"/adventure">) {
  return children;
}
