import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { AnimatedCounter } from "@/components/animated-counter";
import { ScrollReveal } from "@/components/scroll-reveal";
import { HeroGlow } from "@/components/hero-glow";
import { LogoScrollTop } from "@/components/logo-scroll-top";

export const metadata = {
  title: "Better Body Academy — Coaching that actually works",
  description: "1:1 coaching for men 40 to 60. Programs you can stick to. Check-ins that hold you accountable. Real results, no fluff."
};

export default async function LandingPage() {
  if (!isSupabaseConfigured()) {
    redirect("/setup");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("user_profile")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    redirect(profile?.role === "client" ? "/client" : "/app");
  }

  return (
    <div id="top" className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
      <Nav />
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <Testimonials />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 bg-[rgba(0,0,0,0.6)] backdrop-blur border-b border-[var(--color-line)]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <LogoScrollTop className="flex items-center gap-2.5 cursor-pointer group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bba-badge.png" alt="BBA" className="w-8 h-8 rounded-full transition-transform duration-300 group-hover:scale-110" style={{ filter: "drop-shadow(0 2px 8px rgba(0,174,239,0.4))" }} />
          <span className="font-extrabold tracking-tight">Better Body Academy</span>
        </LogoScrollTop>
        <nav className="hidden md:flex items-center gap-6 text-sm text-[var(--color-muted)]">
          <a href="#how" className="hover:text-[var(--color-ink)] transition-colors">How it works</a>
          <a href="#features" className="hover:text-[var(--color-ink)] transition-colors">What you get</a>
          <a href="#proof" className="hover:text-[var(--color-ink)] transition-colors">Results</a>
          <a href="#faq" className="hover:text-[var(--color-ink)] transition-colors">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] px-3 py-2 transition-colors">
            Sign in
          </Link>
          <a href="#book" className="btn btn-primary text-sm">Book a call</a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-[var(--color-line)]">
      <HeroGlow />
      <div className="relative max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-24 lg:py-32">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[2px] font-bold text-[var(--color-blue-glow)] mb-6 px-3 py-1.5 rounded-full bg-[rgba(0,174,239,0.08)] border border-[rgba(0,174,239,0.25)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-blue-glow)] animate-pulse" />
            Now coaching men 40 to 60
          </div>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
            Build the body you actually <span style={{ fontFamily: "var(--font-serif)" }} className="italic text-[var(--color-blue-glow)]">want</span>.
          </h1>
          <p className="text-lg sm:text-xl text-[var(--color-muted)] mb-10 max-w-2xl">
            Real coaching for blokes who are sick of starting over. Custom programs, weekly check-ins, and a coach who actually replies. No apps full of features you never use.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="#book" className="btn btn-primary text-base px-7 py-3">Book a strategy call</a>
            <a href="#how" className="btn btn-ghost text-base px-7 py-3">See how it works</a>
          </div>
          <div className="mt-12 flex flex-wrap items-center gap-6 text-sm text-[var(--color-subtle)]">
            <div className="flex items-center gap-2">
              <CheckIcon /> 12-week minimum
            </div>
            <div className="flex items-center gap-2">
              <CheckIcon /> Weekly check-ins
            </div>
            <div className="flex items-center gap-2">
              <CheckIcon /> Replies within 24h
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const stats = [
    { value: "400+", label: "Men coached" },
    { value: "12,000kg", label: "Lifted weekly" },
    { value: "94%", label: "Hit their goal" },
    { value: "24h", label: "Reply time" }
  ];
  return (
    <section id="proof" className="py-20 border-b border-[var(--color-line)]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <ScrollReveal key={s.label} delayMs={i * 80}>
              <div className="text-center">
                <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[var(--color-blue-glow)] mb-2 tabular-nums">
                  <AnimatedCounter value={s.value} />
                </div>
                <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">
                  {s.label}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    { title: "Programs you can stick to", body: "Built around your life. 3 sessions a week, 45 minutes each. Compound lifts first, accessories second, conditioning when it matters." },
    { title: "Weekly check-ins", body: "Submit photos, weight, sleep, energy, and adherence. Get a real reply from your coach within 24 hours. No automated nonsense." },
    { title: "Habits, not hacks", body: "Small daily wins compound. Track sleep, steps, water, and food quality. Watch the streaks grow." },
    { title: "Custom assessments", body: "Postural screen, mobility, strength benchmarks. Re-test every 4 weeks. Watch the numbers move." },
    { title: "Direct messaging", body: "Ask anything, anytime. Your coach is one message away. Voice notes, photos, or text. Whatever works." },
    { title: "Results tracking", body: "Waist, body fat, strength, sleep, energy. Track what matters. See the trend, not the daily noise." }
  ];
  return (
    <section id="features" className="py-24 border-b border-[var(--color-line)]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-2xl mb-16">
          <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-blue-glow)] font-bold mb-3">What you get</div>
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Everything you need. Nothing you don&apos;t.
          </h2>
          <p className="text-lg text-[var(--color-muted)]">
            Other apps drown you in features. We strip it back to what actually moves the needle.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((f, i) => (
            <ScrollReveal key={f.title} delayMs={(i % 3) * 100}>
              <article
                className="group bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-7 hover:border-[var(--color-blue)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,174,239,0.08)] h-full"
              >
                <div className="w-10 h-10 rounded-xl bg-[rgba(0,174,239,0.1)] border border-[rgba(0,174,239,0.3)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <CheckIcon />
                </div>
                <h3 className="font-extrabold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--color-muted)] leading-relaxed">{f.body}</p>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", title: "Apply", body: "Book a 15-minute strategy call. We talk goals, history, what is holding you back. If we are a fit, you sign up that day." },
    { n: "02", title: "Build your plan", body: "Within 48 hours you get your custom program, assessment baseline, and check-in schedule. Everything in one app." },
    { n: "03", title: "Show up and adjust", body: "Train, check in weekly, message your coach. We adjust as your body adjusts. No magic, just consistency." }
  ];
  return (
    <section id="how" className="py-24 border-b border-[var(--color-line)]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-2xl mb-16">
          <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-blue-glow)] font-bold mb-3">How it works</div>
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Three steps. No fluff.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <ScrollReveal key={s.n} delayMs={i * 140}>
              <div className="group bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-8 relative overflow-hidden hover:border-[var(--color-blue)] transition-all duration-300 hover:-translate-y-1 h-full">
                <div
                  className="text-7xl font-extrabold absolute top-4 right-6 text-[var(--color-blue-glow)] opacity-15 group-hover:opacity-30 group-hover:scale-110 transition-all duration-500"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {s.n}
                </div>
                <div className="relative">
                  <h3 className="font-extrabold text-2xl mb-3">{s.title}</h3>
                  <p className="text-[var(--color-muted)] leading-relaxed">{s.body}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const quotes = [
    { body: "I have done every program under the sun. This was the first time I actually stuck with it past week 6. Down 14kg, lifting more than I did at 30.", name: "Mark T.", detail: "12 months in" },
    { body: "My coach replies within hours, not days. That changed everything. I stopped guessing and started progressing.", name: "Steve R.", detail: "6 months in" },
    { body: "The program is not fancy. It works because it is built for me and my schedule, not someone else's.", name: "Dave K.", detail: "4 months in" }
  ];
  return (
    <section className="py-24 border-b border-[var(--color-line)]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-2xl mb-16">
          <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-blue-glow)] font-bold mb-3">Real men, real results</div>
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            They stuck with it.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quotes.map((q, i) => (
            <ScrollReveal key={q.name} delayMs={i * 120}>
              <figure className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-7 hover:border-[var(--color-blue)] transition-all duration-300 hover:-translate-y-1 h-full">
                <blockquote className="text-[var(--color-ink)] leading-relaxed mb-6">&ldquo;{q.body}&rdquo;</blockquote>
                <figcaption>
                  <div className="font-bold">{q.name}</div>
                  <div className="text-xs text-[var(--color-subtle)] mt-0.5">{q.detail}</div>
                </figcaption>
              </figure>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const items = [
    { q: "Who is this for?", a: "Blokes between 40 and 60 who want to be strong, lean, and energetic without giving up the rest of their life. If you are a competitive athlete, this is not for you." },
    { q: "How much time does it take?", a: "3 sessions a week, 45 minutes each. Weekly check-in takes about 10 minutes. That is it. Everything is built around real life with a job and a family." },
    { q: "Do I need a gym?", a: "Yes, ideally. Home setups with dumbbells work for the first 12 weeks but compound lifts on a barbell are where progress accelerates. We will talk about it on the call." },
    { q: "What if I have never lifted before?", a: "Half our guys started there. Every program includes technique tutorials, video demos, and your coach reviews your lifting form weekly." },
    { q: "How long is the commitment?", a: "12 weeks minimum. Bodies do not change in 4 weeks. After 12 weeks you can renew month-to-month." },
    { q: "What does it cost?", a: "Book a call to find out. Pricing depends on whether you want 1:1, group, or hybrid. We will match you to the right tier." }
  ];
  return (
    <section id="faq" className="py-24 border-b border-[var(--color-line)]">
      <div className="max-w-3xl mx-auto px-6">
        <div className="mb-12">
          <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-blue-glow)] font-bold mb-3">Common questions</div>
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">FAQ</h2>
        </div>
        <div className="space-y-3">
          {items.map((it) => (
            <details
              key={it.q}
              className="group bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl"
            >
              <summary className="flex items-center justify-between cursor-pointer p-6 font-bold text-lg list-none gap-4">
                <span>{it.q}</span>
                <span
                  className="text-[var(--color-blue-glow)] transition-transform group-open:rotate-45 text-2xl leading-none font-normal shrink-0"
                  aria-hidden
                >
                  +
                </span>
              </summary>
              <p className="px-6 pb-6 text-[var(--color-muted)] leading-relaxed">{it.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section id="book" className="py-32 border-b border-[var(--color-line)]">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-6">
          Ready when you are.
        </h2>
        <p className="text-lg text-[var(--color-muted)] mb-10 max-w-xl mx-auto">
          15-minute call. No pitch. You leave with a clearer plan whether or not you sign up.
        </p>
        <a
          href="https://cal.com/betterbodyacademy"
          target="_blank"
          rel="noreferrer"
          className="btn btn-primary text-lg px-10 py-4 inline-block"
        >
          Book your strategy call
        </a>
        <div className="mt-8 text-sm text-[var(--color-subtle)]">
          Already a member? <Link href="/login" className="text-[var(--color-blue-glow)] font-semibold hover:underline">Sign in</Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bba-badge.png" alt="BBA" className="w-7 h-7 rounded-full" />
          <span className="text-sm font-extrabold">Better Body Academy</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-5 text-xs text-[var(--color-subtle)]">
          <a href="#features" className="hover:text-[var(--color-ink)] transition-colors">Features</a>
          <a href="#how" className="hover:text-[var(--color-ink)] transition-colors">How it works</a>
          <a href="#faq" className="hover:text-[var(--color-ink)] transition-colors">FAQ</a>
          <Link href="/login" className="hover:text-[var(--color-ink)] transition-colors">Sign in</Link>
        </nav>
        <div className="text-xs text-[var(--color-subtle)]">
          &copy; {new Date().getFullYear()} Better Body Academy
        </div>
      </div>
    </footer>
  );
}

function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      className="text-[var(--color-blue-glow)] shrink-0"
      aria-hidden
    >
      <path
        d="M5 10.5L8.5 14L15 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
