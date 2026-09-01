import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Interview session",
  description: "A live mock technical interview session.",
  robots: { index: false, follow: false },
};

export default function SessionLayout({ children }: LayoutProps<"/session/[id]">) {
  return children;
}
