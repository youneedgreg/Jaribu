import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Jaribu</h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        See a wig on your own face, and check whether it will blend, before you pay.
      </p>
      <Link href="/s/demo" className="self-start text-base font-medium underline underline-offset-4">
        See the demo shop
      </Link>
    </main>
  );
}
