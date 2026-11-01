import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { card, pageTitle, primaryButton, sectionTitle } from "@/components/styles";
import { RUNS, summarize, type EvalApi } from "@/lib/eval/pipeline-eval";

export const metadata: Metadata = {
  title: "How well it works · Jaribu",
  description: "What we measured on Jaribu, where it falls short, and what we haven't tested.",
};

const NAMES: Record<EvalApi, { name: string; youcam: string }> = {
  hairstyle: { name: "Wig try-on", youcam: "Hair Style Try-On" },
  haircolor: { name: "Colour", youcam: "Hair Color Try-On" },
  hairtype: { name: "Hair type", youcam: "Hair Type Detection" },
  tone: { name: "Skin tone", youcam: "Facial Color Tones" },
};

const FLAWS = [
  ["A wig photo can replace the shopper's face.", "In our own phone test, a close-up seller photo with a tilted head and a hand near the face put the model's face on the shopper. The same selfie kept its own face with a front-facing mannequin photo. The add-a-wig form now asks for calm, front-facing photos, but nothing stops a seller uploading a bad one."],
  ["Skin can come out different.", "In that mannequin test, the face came out darker than in the original photo and the beard was blurred. That's one result, not a measured rate."],
  ["Colours come out too bright.", "Burgundy (99J) looks vivid magenta, auburn (#30) bright orange and platinum (613) olive gold. Ask the seller for a daylight photo of the colour."],
  ["Hair type misreads braids.", "A photo with box braids read as 2A to 2B, wavy, on both 26 and 30 October. The blend check warns about this."],
  ["The wig photo carries over.", "The Body wave photo has wind-blown strands, and they appeared on all three test faces. A calm mannequin photo also grew thin stray strands above the head in our own phone test. On 1 November, on one AI-generated test face, earrings that face wasn't wearing appeared with Long braids, Sleek long, Full afro and Short natural."],
  ["Big styles can get cut off.", "The Curly afro was cut flat at the top on one face, with little space above the head. On 1 November the Full afro was cut the same way on another test, with a dark line along the top."],
  ["Picture edges can show marks.", "On 1 November, a thin line ran along the bottom edge of the Sleek long preview. That's one result, not a measured rate."],
  ["Some previews look drawn.", "In our own phone tests, some results had smoothed skin and painted-looking hair, more than on these test photos."],
];

const BAD_PHOTOS = [
  ["A PNG instead of a JPG", "Your photo needs to be a JPG."],
  ["A photo that's too large", "Your photo is 2048×1024. Its longest side must be 1024 px or less."],
  ["A photo with no face, or far too small", "We couldn't find a face in this photo. Face the camera in good light and take a new photo."],
  ["Three photos with no face, for the hair check", "Look straight ahead for the first photo, then turn your head clearly to each side. Take the photos again."],
];

const NOT_TESTED = [
  "How real the previews look to people, or whether people would trust them to choose a wig. No outside testers took part in this test.",
  "How well the app works across real hair and skin. Three AI-generated faces can't show that.",
  "The phone camera step. These photos were prepared ahead and sent straight to the app.",
  "Whether the blend and lace advice is right. Those rules are provisional until wig wearers have checked them.",
];

const seconds = (value: number | null) => (value === null ? "n/a" : `${value.toFixed(1)} s`);

export default function HowWellItWorksPage() {
  const lines = summarize(RUNS);
  const total = lines.reduce((sum, line) => sum + line.runs, 0);
  const succeeded = lines.reduce((sum, line) => sum + line.succeeded, 0);
  const muted = "text-sm text-muted";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-4 pt-4 pb-12 sm:px-6">
        <header className="flex flex-col gap-3">
          <h1 className={pageTitle}>How well it works</h1>
          <p>
            On 30 October 2026 we ran {total} tasks through the live app, and {succeeded} of {total} worked.
          </p>
          <p className="rounded-2xl bg-tint p-4 text-sm">
            The faces were AI-generated test images, not real people, and no outside testers took part. This shows that the app
            runs and how fast. It doesn&apos;t show how good the previews look on you.
          </p>
        </header>

        <section className="flex flex-col gap-3" aria-labelledby="measured">
          <h2 id="measured" className={sectionTitle}>What we measured</h2>
          <div className={card}>
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th scope="col" className="py-2 pr-2 font-medium">Task</th>
                <th scope="col" className="py-2 pr-2 font-medium">Worked</th>
                <th scope="col" className="py-2 pr-2 font-medium">Typical</th>
                <th scope="col" className="py-2 font-medium">Slowest</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.api} className="border-b border-line last:border-0">
                  <th scope="row" className="py-2 pr-2 font-normal">
                    {NAMES[line.api].name}
                    <span className="block text-xs text-muted">{NAMES[line.api].youcam}</span>
                  </th>
                  <td className="py-2 pr-2">{line.succeeded} of {line.runs}</td>
                  <td className="py-2 pr-2">{seconds(line.median)}</td>
                  <td className="py-2">{seconds(line.slowest)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <p className={muted}>
            Typical is the median. Times run from sending the photo to the result being saved, checked every 3 seconds, so they
            can read up to 3 seconds long. Skin tone ran once: the same photo gave the same reading as on 26 October.
          </p>
          <a href="/eval/pipeline-eval.csv" className="self-start text-sm underline underline-offset-4">
            Download every run (CSV)
          </a>
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="short">
          <h2 id="short" className={sectionTitle}>Where it falls short</h2>
          <p className={muted}>We saw these by looking at the results. They aren&apos;t measured.</p>
          <ul className="flex flex-col gap-3 text-sm">
            {FLAWS.map(([title, detail]) => (
              <li key={title}>
                <span className="font-semibold">{title}</span> {detail}
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="bad">
          <h2 id="bad" className={sectionTitle}>When a photo can&apos;t work</h2>
          <p className={muted}>We sent bad photos on purpose. Each one got a message like these, not a broken image.</p>
          <dl className="flex flex-col gap-3 text-sm">
            {BAD_PHOTOS.map(([photo, message]) => (
              <div key={photo}>
                <dt className="font-semibold">{photo}</dt>
                <dd className="text-muted">{message}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="untested">
          <h2 id="untested" className={sectionTitle}>What we haven&apos;t tested</h2>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
            {NOT_TESTED.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>

        <Link href="/s/demo" className={`${primaryButton} self-start`}>
          See the demo shop
        </Link>
      </main>
    </>
  );
}
