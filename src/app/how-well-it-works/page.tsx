import type { Metadata } from "next";
import Link from "next/link";
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
  ["Colours come out too bright.", "Burgundy (99J) looks vivid magenta, auburn (#30) bright orange and platinum (613) olive gold. Ask the seller for a daylight photo of the colour."],
  ["Hair type misreads braids.", "A photo with box braids read as 2A to 2B, wavy, on both 26 and 30 October. The blend check warns about this."],
  ["The wig photo carries over.", "The Body wave photo has wind-blown strands, and they appeared on all three test faces."],
  ["Big styles can get cut off.", "The Curly afro was cut flat at the top on one face, with little space above the head."],
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
  const heading = "text-lg font-semibold";
  const muted = "text-sm text-zinc-600 dark:text-zinc-400";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">How well it works</h1>
        <p>
          On 30 October 2026 we ran {total} tasks through the live app, and {succeeded} of {total} worked.
        </p>
        <p className="rounded-md border border-zinc-300 p-3 text-sm dark:border-zinc-700">
          The faces were AI-generated test images, not real people, and no outside testers took part. This shows that the app
          runs and how fast. It doesn&apos;t show how good the previews look on you.
        </p>
      </header>

      <section className="flex flex-col gap-3" aria-labelledby="measured">
        <h2 id="measured" className={heading}>What we measured</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-zinc-600 dark:text-zinc-400">
            <tr className="border-b border-zinc-300 dark:border-zinc-700">
              <th scope="col" className="py-2 pr-2 font-medium">Task</th>
              <th scope="col" className="py-2 pr-2 font-medium">Worked</th>
              <th scope="col" className="py-2 pr-2 font-medium">Typical</th>
              <th scope="col" className="py-2 font-medium">Slowest</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.api} className="border-b border-zinc-200 dark:border-zinc-800">
                <th scope="row" className="py-2 pr-2 font-normal">
                  {NAMES[line.api].name}
                  <span className="block text-xs text-zinc-600 dark:text-zinc-400">{NAMES[line.api].youcam}</span>
                </th>
                <td className="py-2 pr-2">{line.succeeded} of {line.runs}</td>
                <td className="py-2 pr-2">{seconds(line.median)}</td>
                <td className="py-2">{seconds(line.slowest)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className={muted}>
          Typical is the median. Times run from sending the photo to the result being saved, checked every 3 seconds, so they
          can read up to 3 seconds long. Skin tone ran once: the same photo gave the same reading as on 26 October.
        </p>
        <a href="/eval/pipeline-eval.csv" className="self-start text-sm underline underline-offset-4">
          Download every run (CSV)
        </a>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="short">
        <h2 id="short" className={heading}>Where it falls short</h2>
        <p className={muted}>We saw these by looking at the results. They aren&apos;t measured.</p>
        <ul className="flex flex-col gap-2 text-sm">
          {FLAWS.map(([title, detail]) => (
            <li key={title}>
              <span className="font-semibold">{title}</span> {detail}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="bad">
        <h2 id="bad" className={heading}>When a photo can&apos;t work</h2>
        <p className={muted}>We sent bad photos on purpose. Each one got a message like these, not a broken image.</p>
        <dl className="flex flex-col gap-3 text-sm">
          {BAD_PHOTOS.map(([photo, message]) => (
            <div key={photo}>
              <dt className="font-semibold">{photo}</dt>
              <dd className="text-zinc-600 dark:text-zinc-400">{message}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="untested">
        <h2 id="untested" className={heading}>What we haven&apos;t tested</h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
          {NOT_TESTED.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <Link href="/s/demo" className="self-start text-base font-medium underline underline-offset-4">
        See the demo shop
      </Link>
    </main>
  );
}
