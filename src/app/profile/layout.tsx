import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your profile",
  description: "Your past mock interview sessions, grouped by job position.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/profile" },
};

export default function ProfileLayout({ children }: LayoutProps<"/profile">) {
  return children;
}
