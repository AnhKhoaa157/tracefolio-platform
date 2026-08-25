import Link from "next/link";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/dashboard/skills", label: "Skills" },
  { href: "/dashboard/achievements", label: "Achievements" },
];

export function DashboardNav({ active }: { active: string }) {
  return (
    <nav aria-label="Dashboard sections" className="flex flex-wrap gap-2">
      {links.map((link) => {
        const isActive = link.href === active;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "rounded-full bg-[#17211d] px-4 py-2 text-sm font-medium text-[#f4f0e8]"
                : "rounded-full px-4 py-2 text-sm font-medium text-[#526159] transition hover:bg-white/70 hover:text-[#17211d]"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
