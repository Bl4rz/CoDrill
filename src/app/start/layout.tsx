import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Start your mock interview",
  description:
    "Paste a job posting and get 5-8 original coding questions tailored to that exact role, then run through a full mock interview.",
  alternates: { canonical: "/start" },
};

export default function StartLayout({ children }: LayoutProps<"/start">) {
  return children;
}
