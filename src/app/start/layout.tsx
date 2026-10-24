import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Select your quest",
  description:
    "Paste a job posting and get 5 to 8 coding questions made for that role, then run a full mock interview. Free.",
  alternates: { canonical: "/start" },
};

export default function StartLayout({ children }: LayoutProps<"/start">) {
  return children;
}
