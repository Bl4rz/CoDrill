import { Mascot } from "@/components/pixel/Mascot";

/** The brand mark is the mascot's head, at 1px per art pixel. */
export function Logo({ className }: { className?: string }) {
  return <Mascot crop="head" k={1} className={className} title="Codrill" />;
}
