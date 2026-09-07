import Link from "next/link";
import Image from "next/image";
import type { Profile } from "@/lib/data/types";
import { Badge } from "@/components/ui/Badge";

export function AppHeader({ profile }: { profile: Profile }) {
  return (
    <header className="border-b border-saffron-100 bg-white/70">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/icons/icon-64.png" alt="" width={32} height={32} className="rounded-lg" />
          <span className="font-display text-base text-maroon-700">Veda Learning</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="text-maroon-500 hover:text-maroon-700">
            Dashboard
          </Link>
          <Link href="/history" className="text-maroon-500 hover:text-maroon-700">
            History
          </Link>
          <Link href="/profile" className="text-maroon-500 hover:text-maroon-700">
            Profile
          </Link>
          {profile.isGuest && <Badge>Guest mode</Badge>}
        </nav>
      </div>
    </header>
  );
}
