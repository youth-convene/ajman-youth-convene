# Ajman Zone Youth Convene – Registration & Attendance

A React (Vite) web app with two pages:

| Page | URL | Who uses it |
|---|---|---|
| **Registration** | `/#/` | Delegates. They fill in the form, upload a photo and download their pass (frame + photo + QR + details). |
| **Attendance** | `/#/attendance` | Staff at the entrance. Password protected. Scans the QR on a pass and marks the delegate as attended in the Google Sheet. |

The data is stored in a **Google Sheet**, through a small Google Apps Script web app ([google-apps-script/Code.gs](google-apps-script/Code.gs)).

```
ajman_youth/
├─ app/                    React application
│  ├─ src/assets/frame.png The event frame used for the pass
│  ├─ src/lib/constants.js Sectors, designations and event details
│  └─ .env.example         Where the Google Sheet API URL goes
└─ google-apps-script/
   └─ Code.gs              Backend that reads and writes the Google Sheet
```

---

## 1. Connect the Google Sheet (one-time, about 5 minutes)

1. Create a new Google Sheet, for example "Youth Convene Registrations".
2. In the sheet, open **Extensions → Apps Script**.
3. Delete the sample code, paste in everything from `google-apps-script/Code.gs`, and click **Save**.
4. **Change the staff password.** At the top of the file, replace `CHANGE_ME_2026` in `const STAFF_KEY = 'CHANGE_ME_2026';` with your own password. Staff type this password on the attendance page.
5. Click **Deploy → New deployment**.
   - Click the gear icon next to "Select type" and choose **Web app**.
   - **Execute as:** *Me*
   - **Who has access:** *Anyone*
   - Click **Deploy**, then authorise access when Google asks. You may need to click *Advanced → Go to project (unsafe)* because this is your own unverified script.
6. Copy the **Web app URL**. It ends in `/exec`.

The script creates a **Registrations** tab on the first registration, with these columns:

`Timestamp | Registration ID | Name | Mobile | Email | Sector | Designation | Attended | Check-in Time`

> **If you edit Code.gs later**, publish the change with **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. This keeps the same URL.

## 2. Configure and run the app

```bash
cd app
cp .env.example .env        # on Windows: copy .env.example .env
# open .env and paste the URL:  VITE_API_URL=https://script.google.com/macros/s/XXXX/exec
npm install
npm run dev                 # local testing at http://localhost:5173
```

If `VITE_API_URL` is empty, the app runs in **demo mode**: a yellow banner appears and data is saved only in that browser. Use demo mode for trying the app out, not for the event.

## 3. Publish it online (GitHub Pages)

The workflow in `.github/workflows/deploy.yml` builds the app and publishes it to GitHub Pages every time you push to `main`.

**One-time setup on GitHub:**

1. **Turn on Pages.** Go to **Settings → Pages**. Under *Build and deployment → Source*, choose **GitHub Actions**.
2. **Provide the API URL.** Do either of these:
   - Commit `app/.env` containing `VITE_API_URL=<your /exec URL>`. This is the current setup.
   - Add a repository variable under **Settings → Secrets and variables → Actions → Variables**, named `VITE_API_URL`. If both exist, the variable wins.

   The build stops with an error if neither is set. This prevents a site that looks fine but never saves registrations.
3. **Run the first deployment.** Go to **Actions → Deploy to GitHub Pages → Run workflow**, or push any commit to `main`.

When the run finishes (about 1 minute), the site is live at:

- Registration: **https://akhilpoyyayil.github.io/ajman-youth-convene/**
- Attendance (staff): **https://akhilpoyyayil.github.io/ajman-youth-convene/#/attendance**

**Updating the site:** commit and push to `main`. It redeploys automatically.
**Changing the API URL:** edit the variable, then re-run the workflow from the Actions tab.

GitHub Pages uses HTTPS, which the QR scanner needs: browsers only allow the camera on secure sites. The app also works on any other static host, such as Netlify or Vercel. Run `npm run build` in `app/` and upload the `dist` folder.

---

## How it works

- **UAE numbers only.** Accepts `050 123 4567`, `0501234567`, `+971 50 123 4567`, `971501234567` and `00971…`. Every format is stored as `+9715XXXXXXXX`. Only mobile prefixes 50, 52, 54, 55, 56 and 58 are accepted. Both the app and the server check the number.
- **No duplicates.** The server rejects a mobile number that is already registered. It uses a lock, so two people submitting at the same moment can't both get through.
- **Unique ID → QR.** The server creates an ID such as `AZYC-7K3F9Q`, checks it doesn't already exist, and saves it in the sheet. The QR code contains exactly this ID.
- **Lost pass.** A registered delegate can choose *"Download your pass again"* and enter their mobile number and email to rebuild the pass.
- **Attendance.** A scan sets `Attended = YES` and records the check-in time (Asia/Dubai). Scanning a pass a second time shows **"Already checked in"** with the first check-in time. If a camera isn't available, staff can type the ID instead. The page also shows live counts of Registered, Checked in and Pending.

## Customising

- **Sectors, designations, date and venue:** edit `app/src/lib/constants.js`. If you change sectors or designations, update the same lists in `Code.gs` too, because the server checks submissions against them.
- **Frame:** replace `app/src/assets/frame.png`. If the new frame's transparent window is in a different place, adjust the coordinates at the top of `app/src/lib/passCanvas.js`.
- **Theme colours:** the CSS variables at the top of `app/src/index.css`.
