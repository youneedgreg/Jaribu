import { redirect } from "next/navigation";
import { currentSeller } from "@/lib/seller/current-seller";

/** Sends a seller who is already signed in to their shop. Reads request headers: use inside <Suspense>. */
export async function SignedOutOnly({ children }: { children: React.ReactNode }) {
  if (await currentSeller()) redirect("/seller");
  return children;
}
