# ValBooksStore

A book-selling e-commerce website: books in English, Hindi and Braille, a
public shop with cart and checkout, customer accounts with order history,
and an admin panel to add/remove books. Built as a plain HTML/CSS/JS site
(no build step) so it can be hosted for free on GitHub Pages.

**The site works out of the box in demo mode** (sample books, no login) so
you can preview the design immediately. Follow the steps below to connect
your own free Firebase, imgBB and EmailJS accounts and make it fully
functional.

---

## 1. What's inside

```
valbooksstore/
├─ index.html          Home page — straight to the shop grid
├─ book.html            Single book detail page
├─ cart.html             Shopping cart
├─ checkout.html         Guest checkout — details, payment, invoice
├─ admin/
│  ├─ login.html         Admin sign-in (the only login on the site)
│  └─ dashboard.html     Add/remove books, manage languages, track orders
├─ css/style.css         All styling
├─ js/
│  ├─ config.js          ← put your API keys here
│  ├─ firebase-init.js   Firebase setup (Auth + Firestore)
│  ├─ db.js               Firestore reads/writes (books, languages, orders)
│  ├─ imgbb.js             Cover image uploads
│  ├─ email.js             Order confirmation emails
│  ├─ razorpay.js          Payment checkout
│  ├─ invoice.js           PDF invoice generation
│  ├─ cart.js              Shopping cart (saved in the browser)
│  └─ ui.js                 Shared header/nav/toast helpers
├─ email-templates/     HTML templates to paste into EmailJS
└─ README.md (this file)
```

---

## 2. Set up Firebase (free) — database + admin login

1. Go to <https://console.firebase.google.com>, click **Add project**, and
   create a project (e.g. "valbooksstore").
2. In the left menu, open **Build → Authentication → Get started**, then
   enable the **Email/Password** sign-in method. (This is only used for
   *your* admin login at `/admin` — customers never create an account;
   checkout collects their details as a guest.)
3. Open **Build → Firestore Database → Create database**. Start in
   **production mode** (we'll add rules below).
4. Go to **Project settings** (gear icon) → scroll to **Your apps** → click
   the **</> (Web)** icon to register a web app. Copy the `firebaseConfig`
   object it gives you.
5. Paste those values into `js/config.js`:

   ```js
   export const firebaseConfig = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "...",
   };
   ```

6. In `js/config.js`, set your own admin email(s):

   ```js
   export const ADMIN_EMAILS = ["valbooksstore@gmail.com"];
   ```

   Then create that user once — either via `register.html` on the live site,
   or manually in **Authentication → Users → Add user** in the Firebase
   console.

### Firestore security rules

Open **Firestore Database → Rules** and replace the contents with the
following, updating the `isAdmin()` email list to match `ADMIN_EMAILS`
above (Firestore rules can't import your config file, so list them here
too):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return request.auth != null &&
        request.auth.token.email in ["valbooksstore@gmail.com"];
    }

    match /books/{bookId} {
      allow read: if true;                 // anyone can browse the shop
      allow write: if isAdmin();           // only admins add/remove books
    }

    match /languages/{languageCode} {
      allow read: if true;                 // shop filter pills need this
      allow write: if isAdmin();           // only admins add/remove languages
    }

    // Guest checkout — customers never log in, so anyone can create an
    // order (that's what "place order" does). Only the admin can read
    // the order list back, or update/delete a status — a customer has
    // no way to look up someone else's order.
    match /orders/{orderId} {
      allow create: if true;
      allow read, update, delete: if isAdmin();
    }

    // Holds a single counter used to generate sequential order numbers
    // (VBS-00001, VBS-00002, ...). Needs to be writable by anyone for the
    // same reason orders do — guest checkout has no login to check.
    match /counters/{counterId} {
      allow read, write: if true;
    }

    // Small settings store — currently just the Razorpay Key ID, set
    // from the admin dashboard's Settings tab. Publicly readable because
    // checkout (no login) needs to fetch it; only the admin can change it.
    match /settings/{settingId} {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
```

There's no `users` collection anymore — customer accounts were removed in
favour of guest checkout, so every order stores the customer's name,
email, phone and address directly on the order itself.

This keeps the shop publicly browsable while restricting who can add/remove
books or read other customers' data.

### One-time index for order history

The "My Account" page looks up a customer's orders by their user ID *and*
sorts by date — Firestore requires a composite index for that combination.
The easiest way to create it:

1. Register an account and place one test order.
2. Open `/profile.html` — if the index is missing, the page will show a
   direct **"Click here to create it"** link (Firestore generates this
   automatically). Click it, wait about a minute for the index to finish
   building, then refresh the page.

Alternatively, create it upfront: Firebase console → **Firestore Database
→ Indexes** tab → **Add index** → Collection ID `orders`, fields
`userId` (Ascending) and `createdAt` (Descending).

---

## 3. Set up imgBB (free) — book cover image hosting

1. Create a free account at <https://imgbb.com>.
2. Go to <https://api.imgbb.com/> and copy your **API key**.
3. Paste it into `js/config.js`:

   ```js
   export const IMGBB_API_KEY = "your-key-here";
   ```

The admin dashboard uploads each cover image to imgBB and stores the
returned URL on the book's Firestore document — no image files are ever
stored in your own repository.

---

## 4. Set up EmailJS (free) — order emails

Only **two** EmailJS templates are used, fitting the free plan's 2-template
limit:

- **Customer template** (`EMAILJS_ORDER_TEMPLATE_ID`) — shared and reused
  for all three customer emails: order confirmed, order shipped, and
  order delivered. Each is a different-looking email, but the underlying
  EmailJS template is the same one — the HTML content is built in
  `js/email.js` and injected per event.
- **Admin template** (`EMAILJS_ADMIN_TEMPLATE_ID`) — simple and
  single-purpose: only ever tells you about a new order.

The customer emails trigger automatically as an order moves through its
lifecycle: confirmation on checkout, shipped when you click "Mark as
dispatched" in the admin dashboard, delivered when you click "Mark as
completed."

1. Create a free account at <https://www.emailjs.com>.
2. Add an **Email Service** (e.g. connect your Gmail) — note its **Service
   ID**.
3. **Customer template:** Email Templates → Create New Template → switch
   the content editor to **Code Editor** (`</>` icon) → paste the contents
   of `email-templates/customer-shared-notification.html`. Set:
   - **To Email:** `{{to_email}}`
   - **Subject:** `{{email_subject}}`

   Note the **Template ID**.
4. **Admin template:** create a second template, pasting
   `email-templates/admin-new-order-alert.html`. Set:
   - **To Email:** your own address, typed directly (fixed, not a
     variable) — that's what routes every order to you regardless of who
     placed it
   - **Subject:** `🔔 New order {{order_id}} — {{total}}`

   Note this **Template ID** too.
5. Go to **Account → General** and copy your **Public Key**.
6. Paste everything into `js/config.js`:

   ```js
   export const EMAILJS_PUBLIC_KEY = "...";
   export const EMAILJS_SERVICE_ID = "...";
   export const EMAILJS_ORDER_TEMPLATE_ID = "...";    // shared customer template
   export const EMAILJS_ADMIN_TEMPLATE_ID = "...";    // admin-only template
   ```

Never put your EmailJS **Private Key** in `js/config.js` or anywhere in the
repo — only the Public Key belongs in browser-side code.

If you skip this step, orders still go through — the site simply won't
send the relevant email (it logs a warning to the console instead).

If you outgrow the free plan later (it caps at 200 emails/month across
all templates too), EmailJS's Personal plan ($9/mo) unlocks 6 templates
and 2,000 sends/month — at that point the shared template could be split
back into two separate ones if you'd prefer, though it isn't necessary.

---

## 5. Set up Razorpay — accepting payment

1. Sign up / log in at <https://dashboard.razorpay.com>.
2. Switch to **Test Mode** (top of the dashboard) while you're setting up
   — no KYC needed, and no real money moves.
3. **Account & Settings → API Keys → Generate Key.** Copy the **Key ID**
   (looks like `rzp_test_...`).
4. Paste it into the site itself — no code editing needed:
   - Log into `/admin/dashboard.html`
   - Open the **Settings** tab
   - Paste the Key ID into **"Razorpay Key ID"** → click **Save**

   Checkout picks this up automatically and switches from "Place order"
   (no payment) to "Proceed to payment" (real Razorpay checkout).
5. Test checkout end to end using
   [Razorpay's test cards](https://razorpay.com/docs/payments/payments/test-card-upi-details/)
   — no real charge happens in Test Mode.
6. **When you're ready to accept real payments:** complete KYC under
   **Account & Settings** (24–48 hours to verify), switch to **Live Mode**,
   generate a **live** Key ID the same way, and paste it into the same
   admin **Settings** tab field, replacing the test key. That's the whole
   switch — no code changes, no redeploy.

### Important: this is a simplified integration

Because this site has no backend server, checkout uses Razorpay's
**client-only** Checkout — it opens the payment window directly and
trusts the browser's success callback. There's no server-side
verification of the payment signature, which is the more secure,
standard way Razorpay integrations normally work.

For a small store this is a reasonable starting point. If it ever
becomes a concern (e.g. as order volume grows), the fix is a small
**Firebase Cloud Function** — still on Firebase's free tier — that
creates the Razorpay order and verifies the payment signature
server-side before an order is marked "paid."

---

## 6. Host it for free with Git + GitHub Pages

1. Create a new repository on GitHub (e.g. `valbooksstore`).
2. From inside this folder:

   ```bash
   git init
   git add .
   git commit -m "Initial site"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/valbooksstore.git
   git push -u origin main
   ```

3. On GitHub, open **Settings → Pages**. Under **Source**, choose the
   `main` branch and `/ (root)` folder, then save.
4. GitHub will publish the site at
   `https://YOUR_USERNAME.github.io/valbooksstore/` within a minute or two.

### Using your own domain

Once the domain from your estimate is purchased, add a `CNAME` file to the
repository root containing just your domain name, then point the domain's
DNS at GitHub Pages as described in GitHub's
[custom domain guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).

---

## 7. Using the site day to day

- **Add or remove books:** sign in at `/admin/login.html` with an email
  listed in `ADMIN_EMAILS`, then use the dashboard. Changes appear on the
  shop page immediately (next page load / refresh).
- **Track and fulfil orders:** the admin dashboard's **"Order history"**
  tab lists every order from every customer, newest first, with their
  name, contact details, delivery address, and items. Each order gets a
  short sequential ID (e.g. `VBS-00001`) instead of a long random one.
  Orders move through three stages: **Placed → Dispatched → Completed**.
  Clicking the button to advance a stage **automatically emails the
  customer** — a "your order shipped" email on Dispatched, a "your order
  arrived" email on Completed. You can also download a PDF invoice for
  any order from this tab.
- **Courier tracking:** enter a courier name and tracking number in the
  small form on a dispatched order, then click **"Save tracking & notify
  customer"** — this re-sends the shipped email with the tracking details
  included. You can update it again later (e.g. if the number changes)
  and it'll re-send with the new info.
- **Customers:** browse and add to cart with no account needed. At
  checkout they enter their name, email, phone and delivery address
  directly, pay via Razorpay, and get an emailed confirmation plus an
  on-screen "Download invoice" button — all without creating a login.
- **Adding a new language:** on the admin dashboard, scroll to **"Manage
  languages"**, type a name (e.g. "Kannada"), and click **Add language** —
  no code changes needed. It immediately appears as a filter pill on the
  shop page and as an option in the "Add a book" dropdown. The site starts
  with English, Hindi and Braille by default; removing one only affects new
  books — any existing books already tagged with it keep showing normally.

## 8. Costs to keep an eye on

Firebase, imgBB, EmailJS and GitHub Pages are all free at the usage levels
a small store needs. If the shop grows significantly (heavy traffic, many
images, high email volume), check each provider's free-tier limits, since
paid tiers may apply beyond that point — this wasn't included in the
original project estimate.
