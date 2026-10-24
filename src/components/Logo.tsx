import { Mascot } from "@/components/pixel/Mascot";

/** The brand mark is the mascot's head, flat, at 2px per art pixel. */
export function Logo({ className }: { className?: string }) {
  return <Mascot crop="head" unit="2px" className={className} title="Codrill" />;
}
