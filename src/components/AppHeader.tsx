import Link from "next/link";
import { Logo } from "@/components/Logo";
import { AuthButton } from "@/components/AuthButton";
import { Breadcrumbs, type Crumb } from "@/components/Breadcrumbs";
import { SoundToggle } from "@/components/pixel/SoundToggle";

/** The header every screen inside the app shares. */
export function AppHeader({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2" aria-label="Codrill home">
          <Logo />
          <span className="font-display text-lg uppercase tracking-widest">Codrill</span>
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <SoundToggle />
          <AuthButton />
        </div>
      </div>
      <Breadcrumbs items={crumbs} />
    </header>
  );
}
