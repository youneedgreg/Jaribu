# Jaribu

Jaribu (Swahili for "try") is a phone-first web app that puts a seller's wig on your own face, checks whether it may blend with your hair and which lace shade may suit your skin, and then sends your order to the seller on WhatsApp.

**[Try it live](https://tryjaribu.vercel.app)** · **[Demo shop](https://tryjaribu.vercel.app/s/judge-demo)** · **[How well it works](https://tryjaribu.vercel.app/how-well-it-works)**

Built for the YouCam API Skin AI & eCommerce VTO Hackathon, using four YouCam APIs and the JS Camera Kit.

## Why

In Kenya, a lot of online shopping happens in chats: WhatsApp carries 20.2% of online orders, according to [Business Daily](https://www.businessdailyafrica.com/bd/corporate/technology/mobile-apps-eclipse-websites-in-kenya-s-e-trade-shift-5319176). Hair is big business too: in 2018 Darling described itself as the leader of a [KSh 25 billion industry](https://hapakenya.com/2018/10/29/darling-introduces-a-new-product-range-in-kenya). Yet a wig is still often chosen from one photo of someone else, and it can be hard to send back: some sellers [limit wig returns for hygiene reasons](https://liveinthelight.co.uk/pages/refunds).

A photo can't tell you how the wig will look on you, whether it will blend with your own hair, or whether the lace will show against your skin.

## What it does

**For shoppers,** from a link the seller shares, with no account:

1. Read how photos are handled and agree.
2. Take guided photos with the camera, or upload a photo instead.
3. See the wig on your own face, with a before-and-after slider.
4. Switch between the colours the seller offers.
5. Run the **blend check**: your hair type against the wig's construction and texture.
6. Run the **lace match**: your skin tone against the seller's lace shades.
7. Order on WhatsApp, with the exact style, colour, lace shade and construction.

**For sellers:** sign up, set up a shop with a WhatsApp number, add a wig from one photo, and share a link to the wig or the shop.

Every result is labelled "Preview: how the style may look, not a fit guarantee." The checks say "may" and show what they're based on. When a photo can't work, you get plain words and what to do next.

## YouCam APIs

| API | What it does in Jaribu | Units per call |
|---|---|---|
| Hair Style Try-On | Puts the seller's wig on the shopper | 2 |
| Hair Color Try-On | Re-colours the saved try-on in the seller's colours | 1 |
| Hair Type Detection | Reads front, right and left photos for the blend check | 2 |
| Facial Color Tones | Reads skin tone for the lace match | 20 |
| JS Camera Kit | Guided capture with live quality checks, in the browser | 0 |

Hair type and skin tone are read once per session, because they cost the most when repeated. Each session also has limits on try-ons and colours, and new tasks pause when the balance reaches a reserve (300 units by default).

## Architecture

```mermaid
flowchart LR
  phone["Shopper's phone<br/>Camera Kit, resize and crop"]
  seller["Seller's browser"]
  app["Next.js on Vercel<br/>routes, sessions, blend and lace rules"]
  youcam["YouCam APIs<br/>File API and AI tasks"]
  blob[("Vercel Blob, private<br/>previews, readings, wig photos")]
  neon[("Neon Postgres<br/>sellers, shops, wigs, orders")]
  whatsapp["Seller's WhatsApp"]
  sweep["GitHub Actions and daily Vercel Cron"]

  phone -- "photos, then polls every 3 s" --> app
  seller -- "shop and wigs" --> app
  app -- "upload, start task, poll" --> youcam
  youcam -- "result link, lasts 2 hours" --> app
  app -- "copy result before reporting success" --> blob
  app --> neon
  phone -- "order with spec and picture link" --> whatsapp
  sweep -- "secret sweep route" --> app
```

- **The YouCam key stays on the server.** The browser only talks to Jaribu's own routes.
- **Tasks are asynchronous.** The server starts a task and the browser polls. A signed ticket ties each task to its session, so a leaked task id can't be used from another one.
- **Results are saved at once.** YouCam's links expire after two hours, so each result is copied to private storage first. It's served only to the session that made it.
- **The checks are plain code.** The blend and lace rules are TypeScript in `src/lib/checks`, so they can be read and tested without spending units.

**Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, Neon Postgres, Better Auth, Vercel Blob, GitHub Actions, Vitest.

## How well it works

On 30 October 2026, 22 tasks ran through the live app and all 22 worked ([every run as a CSV](public/eval/pipeline-eval.csv)):

| Task | Worked | Typical (median) | Slowest |
|---|---|---|---|
| Wig try-on | 12 of 12 | 9.9 s | 20.1 s |
| Colour | 6 of 6 | 9.0 s | 9.1 s |
| Hair type | 3 of 3 | 14.3 s | 14.5 s |
| Skin tone | 1 of 1 | 8.8 s | 8.8 s |

**The faces were AI-generated test images, and no outside testers took part.** This shows the app runs and how fast. It doesn't show how real the previews look to people, or how well the app works across real hair and skin. The blend and lace rules are provisional until wig wearers have checked them.

Five bad photos sent on purpose were refused or failed with a plain message.

Known flaws, seen by looking at the results rather than measured:

- A close-up wig photo with a tilted head can replace the shopper's face. The add-a-wig form asks for calm, front-facing photos, but nothing stops a bad one.
- Skin can come out different, and some previews look drawn.
- Colours come out too bright.
- Hair type misreads box braids as wavy. The blend check warns about this.
- Stray strands in a wig photo carry over, and big styles can get cut off.

The full list is on the [How well it works](https://tryjaribu.vercel.app/how-well-it-works) page.

## Privacy

Written with Kenya's Data Protection Act, 2019 in mind. It hasn't had a legal review.

- **Consent comes first.** The screen says what's sent, where, and for how long, and shoppers must tick that they're 18 or older and agree.
- **Only what's needed is sent.** The front photo goes to YouCam for the preview. The close-up goes only if you run the lace match, and the side photos only if you run the blend check.
- **Previews are deleted after about 24 hours.** The app also refuses to serve anything older.
- **YouCam keeps uploaded photos for up to 30 days.** It has no delete endpoint, so the consent screen says so.
- **No shopper accounts.** Jaribu doesn't ask for a shopper's name. A seller sees a preview only if the shopper orders, through a private link that stops working when the picture is deleted.
- **Seller sessions** are saved without an IP address or browser name.

## Try it

**As a shopper,** no login: open the [demo shop](https://tryjaribu.vercel.app/s/judge-demo) on a phone, pick a wig and tap **Try it on**. Stand back so the photo reaches mid-chest, keep space above your head, and use daylight.

**As a seller:** the judges' login is in the Devpost submission, or you can [sign up](https://tryjaribu.vercel.app/seller/sign-up) with any email. There's no email verification, and no password reset because the app doesn't send email.

## Run it locally

You need Node 24, Postgres (Docker works), a [YouCam API key](https://yce.perfectcorp.com/ai-api) and a private [Vercel Blob](https://vercel.com/docs/vercel-blob) store. Without the key and the store, the pages and seller side still run, but try-ons won't.

**1. Install**

```bash
git clone https://github.com/youneedgreg/Jaribu.git
cd Jaribu
npm ci
```

**2. Start a database**

```bash
docker run -d --name jaribu-db -e POSTGRES_PASSWORD=jaribu -p 5432:5432 postgres:17-alpine
```

**3. Create `.env.local`**

```bash
cat > .env.local <<EOF
DATABASE_URL=postgres://postgres:jaribu@localhost:5432/postgres
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
CRON_SECRET=$(openssl rand -base64 32)
YOUCAM_API_KEY=your-youcam-key
BLOB_READ_WRITE_TOKEN=your-private-blob-token
EOF
```

**4. Create the tables**

```bash
(set -a; . ./.env.local; set +a; npx --yes auth@1.7.14 migrate --config src/lib/auth.ts --yes)
```

```bash
for f in db/migrations/*.sql; do docker exec -i jaribu-db psql -v ON_ERROR_STOP=1 -U postgres -f - < "$f"; done
```

**5. Start the app**

```bash
npm run dev
```

Open <http://localhost:3000/s/demo>. Keep port 3000, because seller sign-in only allows that local address. Each try-on spends real YouCam units.

**Checks** (the same ones CI runs):

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

The tests use saved API responses, so they spend no units.

## Project layout

```text
src/app            Pages and API routes
src/lib/youcam     YouCam client: uploads, tasks, polling, backoff, unit floor
src/lib/tryon      Try-on, colour and browser polling logic
src/lib/checks     Blend and lace rules, hair type and skin tone tasks
src/lib/results    Private storage for previews and readings
src/lib/seller     Seller shop and wig logic
src/lib/orders     WhatsApp orders and order cards
db/migrations      SQL for shops, wigs and orders
scripts            Seed script for the judges' demo shop
public/eval        The eval results as a CSV
```

## Credits

Demo wig photos are from [Unsplash](https://unsplash.com/license): [Júlia Costa](https://unsplash.com/photos/OHSzIUy01Tk), [Dellon Thomas](https://unsplash.com/photos/Fp8uh-Ls4ic), [Good Faces](https://unsplash.com/photos/xmSWVeGEnJw) and [Victor Eke](https://unsplash.com/photos/1aqSXQQF_Pw). They're sample listings: the people pictured have no connection to Jaribu and don't endorse it. Prices and specs in the demo shops are placeholders.

## License

[MIT](LICENSE)
