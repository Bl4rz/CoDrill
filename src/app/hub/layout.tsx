import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hub",
  description: "Your level, XP, daily quests and recent runs.",
  robots: { index: false, follow: false },
};

export default function HubLayout({ children }: LayoutProps<"/hub">) {
  return children;
}
