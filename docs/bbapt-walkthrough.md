# BBAPT Walkthrough

A plain-language guide to using **Better Body Academy** at https://bbapt.vercel.app. Written for non-technical users. Covers both the coach side and the client side.

**What you'll learn:**
1. How to log in (both sides)
2. What the dashboards look like and how to track progress
3. Every feature, what it does, and how to use it

---

## Part 1: For Coaches (Admin Side)

This is the side you'll use if you're a coach managing clients.

### 1.1 Logging in

1. Go to **https://bbapt.vercel.app**
2. You'll see a sign-in page with two options:
   - **Continue with Google** (one click, but requires a 6-digit security code on the next screen)
   - **Email + password** (enter your email and password directly, no extra code needed)
3. If you picked Google: check your email inbox for a 6-digit code, enter it on the next page, click Verify
4. You're now in the coach side at `/app`

**Forgot your password?**
- On the sign-in page, click "Forgot password?"
- Enter your email, click Send code
- Check your inbox for a 6-digit code, enter it on the screen
- Set your new password

**Notes on security:**
- Email/password sign-ins skip the 6-digit code (your password is your security)
- Google sign-ins always require the code (this is the 2-factor protection)
- After 30 minutes of inactivity, you get signed out automatically. A 2-minute warning appears before it happens, with a "Stay signed in" button.

---

### 1.2 The Coach Dashboard

After login you land at `/app`. The dashboard shows:

- Your workspace name and your coach name at the top of the sidebar
- Quick links to today's relevant items
- Recent activity from your clients (check-ins, new sessions, messages)
- Shortcut cards to common actions

The left sidebar is your main navigation. From top to bottom:

- **Home** — this dashboard
- **Clients** — your roster of clients and pending invites
- **Programs** — workout programs you build and assign
- **Habits** — habits library
- **Assessments** — assessment templates
- **Calendar** — all upcoming sessions across your client base
- **Check-ins** — recent client check-ins
- **Messages** — chat with clients
- **Library** — resources you share with clients
- **Resources** — same library, different view
- **Forms** — intake and custom forms
- **Groups** — group programs
- **Watches** — high-level KPIs and at-risk client tracker
- **Team** — other coaches in your workspace
- **Workflows** — automation rules
- **Mini-site** — your public coaching page
- **Packages** — coaching packages you sell
- **Assistant** — AI assistant for drafting messages
- **Settings** — account and workspace settings

---

### 1.3 Adding a New Client

1. From the sidebar, click **Clients**
2. Top right, click **Add client**
3. Fill in their full name and email
4. Click Send
5. The system creates the invite and emails them a magic sign-in link
6. The new client appears on your roster as a pending invite (slate gray badge)

If the email didn't arrive (spam, wrong address, sandbox limits), use the **GET LINK** button on the pending invite row. It opens a page where you can copy a one-click sign-in link to your clipboard. Share it via WhatsApp, SMS, or any channel you trust.

**To cancel a pending invite:**
1. Click the pending invite row
2. On the invite share page, click **Cancel invite**
3. Confirm by clicking "Yes, cancel invite"
4. The invite is removed from your roster

---

### 1.4 The Client Detail Page

Click any client's name from the roster. You land on their detail page with everything you need in one place:

**Top section:**
- Client photo + full name + status badge
- **Biometrics card** (age, height, weight, sex). If any are missing, the form is open by default. Click **Save biometrics** when filled in. These power the Meal Plan auto-calculator.
- **Lifecycle stage** selector (Onboarding, Active, At Risk, Renewing, etc.)
- **Coach assignment** dropdown if you have multiple coaches

**Tab row** (just under the header):
- **Posts** — community posts from this client
- **Habits** — habits assigned + completion history
- **Assessments** — measurements and photos over time
- **Results** — strength PRs, weight chart, body comp
- **Notes** — your private coach notes (client never sees these)
- **Files** — file uploads you've shared
- **Meal plan** — AI-generated 7-day meal plans

**Activity feed:**
Below the tabs you see this client's recent sessions, check-ins, messages, and lifecycle events in chronological order.

---

### 1.5 Building and Assigning Programs

1. Sidebar → **Programs**
2. Click **New program** (or **New AI program** to draft with AI)
3. Set name, audience tag, program length in weeks
4. For each week, add workout days
5. For each day, add exercises with sets, reps, RPE targets, rest times
6. Save

To assign a program to a client:
1. From the program detail page, click **Assign**
2. Pick the client
3. Set start date
4. Confirm

The client now sees this program at `/client/program` and can log sessions from it.

**Importing existing programs from PT Distinction:**
1. Sidebar → **Programs** → **Import PTD**
2. Paste your PTD program text (the AI parses the structure)
3. Review and save

---

### 1.6 Habits Library

1. Sidebar → **Habits**
2. Click **New habit**
3. Pick a name (e.g., "10,000 steps", "7 hours sleep", "No alcohol")
4. Set the type (daily checkbox, count target, time target)
5. Save

To assign habits to a client:
1. Open the client's detail page
2. Click the **Habits** tab
3. Pick from the library + assign

Client sees them at `/client/habits` and ticks them off daily.

---

### 1.7 Assessments

Assessments are measurements you take at intervals to track progress.

1. Sidebar → **Assessments** → **New template**
2. Add fields (weight, waist, body fat %, etc.)
3. Save as a template

To record an assessment for a client:
1. Open the client → **Assessments** tab → **New entry**
2. Fill in the measurements
3. Save

The client's Results tab shows trends over time.

---

### 1.8 The Meal Plan Generator

This is the AI feature. It writes a personalized 7-day meal plan for a client in real time.

**To generate a plan:**
1. Open any client's detail page
2. Make sure biometrics are filled in (age, height, weight, sex)
3. Click the **Meal plan** tab
4. The form auto-fills the calorie and protein targets using Mifflin-St Jeor math
5. Override either field if you have your own macro math
6. Pick the goal: Cut, Maintain, or Gain
7. Pick activity level
8. Pick meals per day (3 to 6)
9. Toggle "Fasts breakfast" if applicable
10. Tap the cuisines they like (Italian, Asian, Mediterranean, Mexican, American)
11. Add allergies or strong dislikes in the text box
12. Click **Generate plan**
13. The plan streams in front of you, building day by day as the AI writes it. Takes about 30 to 60 seconds.
14. When done, the new plan appears in the History list below the form
15. Click the new row in History to see the full read-only view

**What's in a plan:**
- Coach note at the top (in Jase's voice)
- 7 days of meals with macros and ingredients
- Aggregated shopping list at the bottom (Produce, Proteins, Grains and Carbs, Dairy and Eggs, Pantry, Other)

**Regenerating:** the AI output is final. If you don't like a plan, just generate a new one with adjusted inputs.

**Failed plans:** if the AI fails (rate limit, timeout), the plan is saved with a "failed" status. Click "Show failed (N)" under the history list to see what went wrong.

---

### 1.9 Messages

1. Sidebar → **Messages**
2. See all your client conversations
3. Click any to open the chat
4. Type and send

Text-only for now. Scheduled messages supported (write now, send later).

---

### 1.10 The Watches Dashboard

Sidebar → **Watches**. This is Jase's high-level view.

- Total active clients
- Churn rate (% who left in the last period)
- Retention rate
- Renewal rate
- Offboarding count
- At-risk clients flagged automatically (based on missed check-ins, no workout sessions, message silence)
- Upcoming catchup calls and retreat scheduling

---

### 1.11 Settings

Sidebar → **Settings**.

- **Account** — change your password, set up 2FA
- **Workspace** — workspace name, brand primary color, coach name shown to clients

---

## Part 2: For Clients

This is the side a client sees. They never see the coach interface.

### 2.1 Receiving the Invite

1. The coach sends an invite via email (or shares a link directly via WhatsApp)
2. The email has a button: **Start your intake**
3. Click it → the client lands on the intake form
4. Fill out the intake form (takes about 5 minutes):
   - Why now
   - Past attempts at training
   - Current constraints (injuries, schedule)
   - Primary goal
   - Realistic timeframe
   - Health flags
5. Click Submit
6. The client is now signed in and lands at `/client`

### 2.2 Subsequent Logins

1. Go to **https://bbapt.vercel.app**
2. Same sign-in screen as the coach
3. Continue with Google OR Email + password
4. Lands at `/client` (the home dashboard)

**Same 30-minute idle timeout as the coach side.**

---

### 2.3 The Client Home Dashboard

The first screen after login (`/client`).

- Big greeting: "Hey, [first name]."
- Workspace name at the top
- 3 stat cards: **Status** (active / paused / completed), **Start weight**, **Coach** (the coach's name)
- "What happens next" panel with the next scheduled session or check-in

Header nav has 8 tabs: **Home, Program, Habits, Sessions, Check-ins, Logbook, Library, Meal plan, Messages**

---

### 2.4 Program

Click **Program** in the nav.

- Shows the program their coach assigned
- Lists weeks and days
- Each day shows the workout name
- Tap the upcoming session to start logging it

---

### 2.5 Logging a Workout

1. From **Program** or **Sessions**, tap the workout you're doing
2. For each exercise:
   - Tap **Add set**
   - Enter reps, weight, RPE
   - Repeat for each set
3. Add notes if needed
4. Tap **Finish workout**
5. The session is saved to their Sessions list

---

### 2.6 Habits

Click **Habits** in the nav.

- Daily checklist of habits the coach assigned
- Tap each habit to mark it done
- Coach sees the completion percentage on their side

---

### 2.7 Check-ins

Click **Check-ins**.

- List of past check-ins (one per week typically)
- Button: **New check-in**

To do a new check-in:
1. Click **New check-in**
2. Upload photos (front, side, back if requested)
3. Enter weight
4. Rate sleep, energy, adherence (1-10)
5. Write what went well this week
6. Write what was a struggle
7. Submit

Coach gets notified, reviews, and replies in Messages.

---

### 2.8 Logbook

Click **Logbook**.

- Personal journal entries
- Click **New entry** to add one
- Free-form text

Used for things like food diary, mood, training notes outside structured workouts.

---

### 2.9 Library

Click **Library**.

- Resources the coach shared (PDFs, videos, links)
- Filtered to ones tagged for this client (e.g., "men 40-60" resources only show to relevant clients)
- Read-only

---

### 2.10 Meal Plan

Click **Meal plan**.

- Latest plan the coach generated for them
- Big heading: "Plan for [date]"
- Coach note at the top
- 7 day cards with meals, macros, ingredients
- Shopping list at the bottom (collapsible)
- "Older plans" dropdown if there are previous plans

If no plan has been generated yet:
> "Your coach has not generated a plan for you yet. Hang tight, or message them."

---

### 2.11 Messages

Click **Messages**.

- Conversation with their coach
- Send text messages
- See coach replies in real time

---

### 2.12 Signing Out

Top right corner of the header → **Sign out** button.

---

## Part 3: Day-to-Day Workflows

### Coach: Onboarding a New Client Start to Finish

1. Sidebar → **Clients** → **Add client** → name + email → Send
2. The client gets an email with the magic sign-in link
3. The client clicks the link, fills the intake form, signs in
4. Back on coach side, the new client now shows as Active on the roster
5. Open the client → fill biometrics at the top of the page (age, height, weight, sex) → Save
6. Click the **Programs** tab → Assign a program
7. Click the **Habits** tab → Assign habits
8. Click the **Meal plan** tab → Generate a meal plan
9. Send the client a welcome message via Messages

Now the client logs in, sees their program, habits, and meal plan, and starts training.

### Client: A Typical Week

- **Monday morning:** open the app → Program → Today's workout → log sets as you go
- **Tuesday-Saturday:** same as above on workout days, mark habits each day
- **Sunday:** Check-ins → New check-in → photos + numbers + reflections → Submit
- **Anytime:** Messages → ask coach a question

### Coach: A Typical Week

- **Monday morning:** Watches → who's at risk, who has a catchup call this week
- **Each weekday:** Messages → reply to clients within 24h. Sidebar → Check-ins → review what came in over the weekend.
- **Wednesday:** generate the next week's meal plans for clients who need refresh
- **Sunday evening:** scan the upcoming week's calendar, message any clients about adjustments

---

## Part 4: What to Test Before Going Live

Before treating this as a real PT Distinction replacement, test these in order. If any step breaks, log it.

### Coach side tests
- [ ] Sign in works (both Google and email+password)
- [ ] Adding a client + receiving the email/getting the link
- [ ] Filling biometrics on a client and saving
- [ ] Generating a meal plan (full end-to-end, watch the streaming)
- [ ] Assigning a program to a client
- [ ] Assigning habits to a client
- [ ] Sending a message to a client and seeing the reply
- [ ] Reviewing a client check-in submission with photo

### Client side tests
- [ ] Receiving the invite email + clicking the link
- [ ] Filling the intake form + landing on the dashboard
- [ ] Seeing the program in /client/program
- [ ] Logging a workout from start to finish (sets/reps/RPE)
- [ ] Checking off habits for the day
- [ ] Submitting a check-in with a photo upload
- [ ] Viewing the meal plan their coach generated
- [ ] Reading a library resource
- [ ] Sending a message to the coach

### Realistic gaps you'll notice (these are honest, things still thinner than PT Distinction)

1. **Client home dashboard is sparse.** PT Distinction shows more density (today's tasks, recent activity, trends). This will improve in the next iteration.
2. **No progress charts on the client side.** Coach can see Sparkline trends; client doesn't see their own. Could be added.
3. **No streak visualization on habits.** "5 days in a row" reward is missing.
4. **No push notifications.** Reminders are not pushed to phones. PWA install prompt is there but no server-driven reminders yet.
5. **No nutrition logging from client.** Meal plan is read-only. Clients can't tick off meals as eaten or log substitutions.
6. **No video/voice messages.** Messages are text-only for now.

These are listed for transparency. Each could be added if you decide BBAPT is your direction.

---

## Quick Reference: URLs

| Page | URL |
|---|---|
| Sign in | https://bbapt.vercel.app/login |
| Coach home | https://bbapt.vercel.app/app |
| Coach clients | https://bbapt.vercel.app/app/clients |
| Client home | https://bbapt.vercel.app/client |
| Client meal plan | https://bbapt.vercel.app/client/meal-plan |
| Forgot password | https://bbapt.vercel.app/forgot-password |

---

## Need Help?

If anything is unclear or broken, message Bryan and he'll fix it. The app is being actively maintained.

*Last updated: 2026-06-24*
