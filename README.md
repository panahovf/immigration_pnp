# PNP Navigator

A plain-language guide to immigrating to Canada through a Provincial Nominee Program, for people
with no prior experience of immigration.

It exists because working out which provincial streams you qualify for currently means reading
eleven separate government websites, each using vocabulary none of them define. This site does the
matching for you and explains the vocabulary.

## What's in it

| Page | What it does |
| --- | --- |
| `index.html` | What a PNP is, the two routes through it, and how to use the site |
| `finder.html` | The core tool: ~12 questions, matched against every stream in the country |
| `requirements.html` | NOC, TEER, CLB, ECA, EOI, LMIA, "connection", "letter of intent" — explained, with costs and how to obtain each |
| `job-offer.html` | Getting a Canadian job offer from overseas, and spotting scams |
| `process.html` | The full sequence from preparation to landing |
| `costs.html` | Government fees, the costs nobody warns you about, settlement funds, timelines |

## What the finder does

It asks where you are, what you do, what you've studied, your language level and what ties you have,
then sorts every stream into three groups:

- **Worth pursuing now** — you appear to meet the published requirements
- **Within reach** — blocked only by something you can go and get, with each missing item named and
  linked to an explanation of how to get it
- **Not a realistic route right now** — blocked by something structural, with the reason stated

The third group matters as much as the first. Telling someone *why* a stream is closed to them is
more useful than silently omitting it.

## Running it locally

There is no build step. It is plain HTML, CSS and JavaScript with no dependencies.

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Publishing it on GitHub Pages

**Pages has to be switched on once, by hand.** GitHub does not allow the Actions token to create a
Pages site for the first time, so this cannot be automated — the workflow fails with
`Create Pages site failed: Resource not accessible by integration` until it is done. After this
one-time step, every push to `main` deploys automatically.

Go to **Settings → Pages**, and under **Build and deployment** set **Source** to **GitHub Actions**.
That is the only change needed.

Then either push to `main`, or re-run the most recent *Deploy to GitHub Pages* run from the
**Actions** tab. The site appears at:

```
https://<your-username>.github.io/<repo-name>/
```

<details>
<summary>Alternative: serve straight from a branch, without the workflow</summary>

Set **Source** to *Deploy from a branch*, pick `main` and the `/ (root)` folder, and save. This
works just as well for a site with no build step. If you choose this, delete
`.github/workflows/pages.yml`, otherwise it will keep failing on every push and clutter the Actions
tab with red crosses.
</details>

The `.nojekyll` file stops GitHub's Jekyll processor interfering with the `assets/` directory. Leave
it in place.

## Keeping it accurate

This is the part that matters most, because **provinces change their programs frequently and
sometimes abruptly**. During 2026 alone, Ontario closed every one of its previous streams and
replaced them with a single employer-driven one, and British Columbia scrapped its International
Graduate and semi-skilled streams.

All stream data lives in one file: **`assets/js/data.js`**.

Each stream is an object:

```js
{
  id: 'sk-oid',                      // unique
  prov: 'SK',                        // key into PROVINCES
  name: 'International Skilled Worker — Occupation In-Demand',
  url:  'https://...',               // the official government page
  route: 'base',                     // 'enhanced' (Express Entry) | 'base' (direct) | 'both'
  kind: 'worker',                    // 'worker' | 'entrepreneur' | 'graduate' | 'federal'
  status: 'open',                    // 'open' | 'paused' | 'closed' | 'limited' | 'windows'
  statusNote: '...',                 // optional, shown as a warning banner
  summary: '...',                    // plain-language description
  reqs: [ /* requirement objects */ ],
  notes: [ '...' ]                   // optional bullets
}
```

Requirements are built from the reusable helpers in the `R` object at the top of the file
(`R.jobOffer`, `R.minCLB`, `R.minEdu`, `R.connection`, `R.eePool`, and so on). Each carries a
severity:

- `blocking` — a structural fact about the person's situation. Puts the stream in "not a realistic
  route".
- `closable` — something they can go and obtain. Puts the stream in "within reach", and the `fix`
  text explains how.

To add a stream, copy an existing object and adjust it. To change a requirement, edit its helper
call. No build or rebuild is needed — refresh the page.

### The editorial rule used here

Exact numeric thresholds move around and go stale fast. **Requirement *shapes*** — does this need a
job offer? must you already be in the province? — are stable. So hard numbers appear only where they
were confirmed against the official page, everything else describes the shape of the requirement,
and every card links to the official source and shows when it was last checked.

Update the `VERIFIED` constant at the top of `data.js` whenever you do a review pass. It is
displayed on every stream card and in the results summary.

## Scope and limitations

- Quebec runs its own separate immigration system and is deliberately not covered. Nunavut has no PNP.
- The tool reads published eligibility rules. It cannot see documents, family situations or
  immigration history, and it is **not legal advice**.
- It is not affiliated with the Government of Canada, IRCC, or any provincial government.

## Privacy

Nothing is collected and nothing is transmitted. Answers are held in the browser's `localStorage`
so progress survives a refresh, and the "copy a link to these results" button encodes answers into
the URL fragment — which, being a fragment, is never sent to any server. There is no analytics, no
tracking and no third-party requests of any kind.

## Accessibility

Semantic landmarks, a skip link, keyboard-navigable controls, visible focus states, `aria-current`
on the active nav item, a labelled progress bar, and light and dark themes with a manual override.
Every page except the finder works with JavaScript disabled.

## Licence

See `LICENSE`.
