import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/actions";
import { MobileMenu } from "./mobile-menu";

export async function SiteNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isOwner = false;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    isOwner = profile?.role === "owner";
  }

  const links = user
    ? [
        ...(isOwner ? [{ href: "/owner", label: "Owner" }] : []),
        { href: "/account", label: "My bookings" },
      ]
    : [{ href: "/login", label: "Log in" }];

  return (
    <>
      <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="btn-ghost">
            {l.label}
          </Link>
        ))}
        {user ? (
          <form action={signOut}>
            <button className="btn-ghost">Sign out</button>
          </form>
        ) : (
          <Link href="/book" className="btn-primary ml-2">
            Book a consultation
          </Link>
        )}
      </nav>

      <MobileMenu links={links} signedIn={!!user}>
        {user && (
          <form action={signOut}>
            <button className="flex min-h-14 w-full items-center border-b border-line text-left font-serif text-2xl">
              Sign out
            </button>
          </form>
        )}
      </MobileMenu>
    </>
  );
}
