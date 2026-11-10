# CvSU ThesisForge

A browser-only academic document formatter for CvSU students. Plain HTML, CSS and JavaScript: **no backend, no database, no login, no build step.** Uploaded documents are processed inside your browser tab and are never sent anywhere.

```
CvSU-ThesisForge/
├── index.html            ← entry point
├── css/style.css
├── js/app.js
├── assets/cvsu-logo.png
├── documentation/project-documentation.html
├── netlify.toml          ← optional hosting settings (headers only)
├── .gitignore
└── README.md
```
All paths are relative, so the folder works from any location or sub-folder.

## 1. Run locally
- **Easiest:** double-click `index.html`.
- **Closer to real hosting** (needs Python, which many PCs already have): in the folder run `python -m http.server 8000`, then open http://localhost:8000. (This is only a local file server; the project itself does not use Python.)

## 2. Share it online (Netlify Drop)
1. Go to https://app.netlify.com/drop and sign in (free).
2. Drag the whole **CvSU-ThesisForge folder** (not a zip) onto the page.
3. Netlify gives you a `https://something.netlify.app` link. Send it to your group.
4. Optional: *Site configuration → Change site name* for a friendlier address.

A link only exists once *you* publish it; nothing is hosted until you do this.

## 3. Update the hosted version
- **Drop-based site:** open the site in Netlify → **Deploys** tab → drag the updated folder onto the "Drag and drop your site folder here" box. A new deploy replaces the live one; older deploys stay listed so you can roll back.
- **GitHub-connected site (section 4):** just push your changes; Netlify redeploys automatically.

## 4. Connect to GitHub
Agree on one person to create the repo, then:
1. On github.com create a new repository (e.g. `cvsu-thesisforge`), empty, no README.
2. In the project folder:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<owner>/cvsu-thesisforge.git
   git push -u origin main
   ```
3. Add teammates: repo **Settings → Collaborators**.
4. Suggested group workflow: each member works on a branch (`git checkout -b fix-timer`), pushes it, and opens a **Pull Request** into `main`. Someone else reviews before merging.
5. Teammates start with `git clone <repo-url>`, and `git pull` before working.

## 5. Netlify Deploy Previews (feedback links per pull request)
Deploy Previews need a GitHub-connected site (a Drop-only site can't do them).
1. Netlify → **Add new site → Import an existing project → GitHub**, authorize, pick the repo.
2. Build settings: leave **Build command empty**; **Publish directory** `.` (already set in `netlify.toml`). Deploy.
3. In **Site configuration → Build & deploy → Branches and deploy contexts**, set Deploy Previews to **Automatically build deploy previews for all pull requests** (usually the default).
4. Now every Pull Request gets its own URL, posted as a comment on the PR. Teammates open it and leave feedback as PR comments. Merging into `main` updates the main site.
5. Branch deploys (a stable link per branch) can be enabled in the same settings page.
Note: Deploy Previews are public URLs by default. Don't test with real personal documents on them; use dummy files.

## Privacy notes
- No document is uploaded, stored in localStorage/sessionStorage/IndexedDB, or sent to any API. `netlify.toml` adds a Content-Security-Policy that blocks network requests from the page (`connect-src 'none'`). If you host somewhere other than Netlify, that file is ignored; the app still works.
- Cleanup after 10 minutes clears this page's references and Blob URLs. It cannot erase browser/OS memory or a file you already downloaded.

## Known limitations
- PDF and legacy .DOC uploads are rejected (not reliably convertible with native JavaScript); save as .docx first.
- DOCX output keeps paragraphs, Heading-style headings, bold/italic, simple tables and code lines. Images, footnotes, equations and list numbering are not carried over; the app warns when it sees them.
- Print headers/footers need a Chromium-based browser.
- Presets are starting points, not official CvSU rules. Check your instructor's requirements.

## Before submitting, test
Upload a real .docx and open the downloaded file in Word; try a .txt and a .java file; check the 10-minute timer (temporarily lower the `600000` in `js/app.js`); try a phone; open two tabs. Fill in group members, section and date in `documentation/project-documentation.html`.
