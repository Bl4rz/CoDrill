import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your dashboard",
  description:
    "Your past mock interview sessions, scores, and an AI recommendation of which roles you're most proficient in.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/profile" },
};

export default function ProfileLayout({ children }: LayoutProps<"/profile">) {
  return children;
}
