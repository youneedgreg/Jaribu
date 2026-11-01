import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { primaryButton, secondaryButton } from "@/components/styles";
import { COLORS, LACE } from "@/lib/shop/catalog";
import { DEMO_SHOP } from "@/lib/shop/demo";
import { Swatch } from "./w/[wigId]/try/swatch";

const heading = "font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl";

const STEPS = [
  { title: "Pick a wig", text: "Open a seller's shop or a link they sent you. No account, no app to install." },
  { title: "Take your photos", text: "The camera guides you through them. Or upload one photo you already have." },
  { title: "See it on you", text: "In about 10 seconds. Drag across the photo to compare, then try another colour or wig." },
];

const SELLER_POINTS = [
  "Add a wig with one photo, its price, colours and lace shades",
  "Share your shop link on WhatsApp, Instagram or TikTok",
  "Orders reach your WhatsApp with the exact wig and colour",
];

export default function Home() {
  const [first, second, third] = DEMO_SHOP.wigs;

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <section className="mx-auto grid w-full max-w-5xl gap-8 px-4 pt-6 pb-14 sm:px-6 md:grid-cols-2 md:items-center md:pt-12">
          <div className="flex flex-col gap-5">
            <p className="text-sm font-medium text-accent">Jaribu means &ldquo;try&rdquo; in Swahili</p>
            <h1 className="font-display text-5xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
              See the wig on your face before you pay.
            </h1>
            <p className="text-lg text-muted">
              A wig is hard to return and costly to get wrong. Try it on with your phone, check whether it may blend, then order from the seller on WhatsApp.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/s/demo" className={primaryButton}>
                Try a wig on
              </Link>
              <Link href="/seller/sign-up" className={secondaryButton}>
                I sell wigs
              </Link>
            </div>
            <p className="text-sm text-muted">No account needed. Works in your phone&apos;s browser.</p>
          </div>

          <div className="grid grid-cols-5 gap-3">
            <Link href={`/w/${first.id}`} className="col-span-3 row-span-2">
              <Image
                src={first.photo}
                alt={`Sample listing: ${first.name} wig`}
                width={first.photoWidth}
                height={first.photoHeight}
                preload
                sizes="(min-width: 768px) 280px, 58vw"
                className="h-full w-full rounded-3xl object-cover"
              />
            </Link>
            {[second, third].map((wig) => (
              <Link key={wig.id} href={`/w/${wig.id}`} className="col-span-2">
                <Image
                  src={wig.photo}
                  alt={`Sample listing: ${wig.name} wig`}
                  width={wig.photoWidth}
                  height={wig.photoHeight}
                  sizes="(min-width: 768px) 190px, 38vw"
                  className="aspect-[4/5] w-full rounded-3xl object-cover"
                />
              </Link>
            ))}
          </div>
        </section>

        <section className="bg-tint">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-14 sm:px-6">
            <h2 className={heading}>How it works</h2>
            <ol className="grid gap-6 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-4 md:flex-col">
                  <span
                    aria-hidden
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-display font-semibold text-on-primary"
                  >
                    {index + 1}
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="text-muted">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="text-sm text-muted">Every result is a preview: how the style may look, not a fit guarantee.</p>
          </div>
        </section>

        <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-14 sm:px-6">
          <div className="flex max-w-2xl flex-col gap-3">
            <h2 className={heading}>Two things a shop photo can&apos;t tell you</h2>
            <p className="text-muted">Tap a check after your preview. Each one tells you what it&apos;s based on, and neither is a promise.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <article className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-6">
              <h3 className="font-display text-xl font-semibold">Will the lace show?</h3>
              <p className="text-muted">We read your skin colour from a close-up and compare it with the lace shades the seller offers.</p>
              <p className="mt-auto flex items-center gap-2 rounded-2xl bg-tint p-3 text-sm">
                <Swatch hex={LACE.dark.hex} />
                <span>
                  <span className="text-muted">Example: </span>
                  {LACE.dark.name} may blend with your skin.
                </span>
              </p>
            </article>
            <article className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-6">
              <h3 className="font-display text-xl font-semibold">Will it blend with your hair?</h3>
              <p className="text-muted">We read your hair type from three photos. If a wig leaves some of your hair out, we compare the two textures.</p>
              <p className="mt-auto flex items-center gap-2 rounded-2xl bg-tint p-3 text-sm">
                <Swatch hex={COLORS.offBlack.hex} />
                <span>
                  <span className="text-muted">Example: </span>
                  Your own hair shows at the front and may not blend. A glueless cap covers it instead.
                </span>
              </p>
            </article>
          </div>
          <p className="text-sm text-muted">
            Both rules are still provisional: no wig wearers have checked them yet.{" "}
            <Link href="/how-well-it-works" className="font-medium text-foreground underline underline-offset-4">
              See how well it works, and where it falls short
            </Link>
          </p>
        </section>

        <section className="bg-primary text-on-primary">
          <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-14 sm:px-6 md:grid-cols-2 md:items-center">
            <div className="flex flex-col gap-3">
              <h2 className={heading}>Sell wigs? Let shoppers try before they message you.</h2>
              <p className="opacity-80">Set up a shop in a few minutes and keep selling the way you already do.</p>
            </div>
            <div className="flex flex-col gap-5">
              <ul className="flex flex-col gap-3">
                {SELLER_POINTS.map((point) => (
                  <li key={point} className="flex gap-3">
                    <span aria-hidden className="mt-2 size-2 shrink-0 rounded-full bg-on-primary" />
                    {point}
                  </li>
                ))}
              </ul>
              <Link
                href="/seller/sign-up"
                className="inline-flex min-h-12 items-center justify-center self-start rounded-full bg-on-primary px-6 font-medium text-primary"
              >
                Open your shop
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-5xl gap-4 px-4 py-14 sm:px-6 md:grid-cols-[1fr_2fr]">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Your photos</h2>
          <p className="text-muted">
            YouCam&apos;s AI makes the preview, so your photo goes to YouCam, which keeps uploads for up to 30 days. Jaribu deletes your previews and readings after about 24 hours, and asks for no name or account. You&apos;ll see all of this and agree before any photo is taken.
          </p>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:px-6">
          <nav className="flex flex-wrap gap-x-5 gap-y-2 font-medium text-foreground">
            <Link href="/s/demo">Demo shop</Link>
            <Link href="/how-well-it-works">How well it works</Link>
            <Link href="/seller/sign-in">Seller sign in</Link>
          </nav>
          <p>
            Sample listings, not for sale. Photos by{" "}
            {DEMO_SHOP.wigs.slice(0, 3).map((wig, index) => (
              <span key={wig.id}>
                {index > 0 && ", "}
                {wig.credit && (
                  <a href={wig.credit.url} className="underline underline-offset-2">
                    {wig.credit.name}
                  </a>
                )}
              </span>
            ))}{" "}
            on Unsplash. The people shown don&apos;t endorse Jaribu.
          </p>
        </div>
      </footer>
    </>
  );
}
