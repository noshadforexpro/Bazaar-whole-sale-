import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const { sameSite, ...rest } = options;
              cookieStore.set(name, value, {
                ...rest,
                sameSite: sameSite === true ? "lax" : sameSite === false ? undefined : sameSite,
              });
            });
          } catch {
            // Server Components cannot always write cookies.
          }
        },
      },
    }
  );
}
