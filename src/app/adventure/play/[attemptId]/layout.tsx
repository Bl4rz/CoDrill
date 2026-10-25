import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Adventure level",
  description: "One question, three steps.",
  robots: { index: false, follow: false },
};

export default function PlayLayout({ children }: LayoutProps<"/adventure/play/[attemptId]">) {
  return children;
}
