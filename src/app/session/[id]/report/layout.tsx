import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Session report",
  description: "Scored results and pattern insights from a completed mock interview session.",
  robots: { index: false, follow: false },
};

export default function ReportLayout({ children }: LayoutProps<"/session/[id]/report">) {
  return children;
}
