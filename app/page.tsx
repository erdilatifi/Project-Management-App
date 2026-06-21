"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useInView } from "framer-motion";
import { Workflow } from "lucide-react";

// Helper for revealing elements on scroll. When `spotlight` is set, the element
// also gets a cursor-following accent glow + lift on hover for a premium feel.
function Reveal({ children, className = "", delay = 0, style = {}, spotlight = false }: { children: React.ReactNode; className?: string; delay?: number; style?: React.CSSProperties; spotlight?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  // pos = cursor position in px; norm = cursor position normalized to -0.5..0.5 for tilt
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [norm, setNorm] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  // Reveal-on-scroll transform
  let transform: string;
  if (!inView) {
    transform = "translateY(28px)";
  } else if (spotlight && hovered) {
    // Cursor-following 3D tilt + lift for a premium, tactile feel
    const rotX = (-norm.y * 9).toFixed(2);
    const rotY = (norm.x * 9).toFixed(2);
    transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-6px) scale(1.012)`;
  } else if (spotlight) {
    transform = "perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0)";
  } else {
    transform = "translateY(0)";
  }

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={spotlight ? (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        setNorm({
          x: (e.clientX - rect.left) / rect.width - 0.5,
          y: (e.clientY - rect.top) / rect.height - 0.5,
        });
      } : undefined}
      onMouseEnter={spotlight ? () => setHovered(true) : undefined}
      onMouseLeave={spotlight ? () => { setHovered(false); setNorm({ x: 0, y: 0 }); } : undefined}
      style={{
        opacity: inView ? 1 : 0,
        transform,
        transformStyle: spotlight ? "preserve-3d" : undefined,
        transition: spotlight
          ? `opacity 0.8s cubic-bezier(.16,1,.3,1) ${delay}s, transform 0.25s cubic-bezier(.16,1,.3,1), box-shadow 0.4s ease`
          : `opacity 0.8s cubic-bezier(.16,1,.3,1) ${delay}s, transform 0.8s cubic-bezier(.16,1,.3,1) ${delay}s`,
        boxShadow: spotlight && hovered
          ? "0 34px 80px -28px rgba(201,255,61,0.4), 0 0 0 1px rgba(201,255,61,0.35)"
          : undefined,
        ...style
      }}
    >
      {spotlight && (
        <>
          {/* Animated gradient sheen border that lights up on hover */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-px rounded-[inherit] z-0 transition-opacity duration-300"
            style={{
              opacity: hovered ? 1 : 0,
              padding: "1px",
              background: `conic-gradient(from ${pos.x + pos.y}deg at ${pos.x}px ${pos.y}px, rgba(201,255,61,0.7), rgba(139,124,246,0.6), rgba(201,255,61,0.0) 55%, rgba(139,124,246,0.6))`,
              WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
            }}
          />
          {/* Cursor-following spotlight glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
            style={{
              opacity: hovered ? 1 : 0,
              background: `radial-gradient(440px circle at ${pos.x}px ${pos.y}px, rgba(201,255,61,0.18), rgba(139,124,246,0.08) 38%, transparent 60%)`,
            }}
          />
          {/* Specular highlight that tracks the cursor for a glassy sheen */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
            style={{
              opacity: hovered ? 1 : 0,
              background: `radial-gradient(160px circle at ${pos.x}px ${pos.y}px, rgba(255,255,255,0.07), transparent 70%)`,
            }}
          />
        </>
      )}
      {spotlight ? <div className="relative z-10" style={{ transform: "translateZ(40px)" }}>{children}</div> : children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LiveFeed – Vertically-scrolling activity ticker with staggered fade-in/out
   ═══════════════════════════════════════════════════════════════════════════ */
const ALL_FEED_ITEMS = [
  { name: "Priya", action: "moved a task", project: "Redesign", color: "var(--lp-violet)" },
  { name: "Theo", action: "commented on", project: "Marketing Site", color: "var(--lp-accent)" },
  { name: "Sasha", action: "created workspace", project: "Engineering", color: "#ffb84d" },
  { name: "Maya", action: "invited", project: "Alex", color: "var(--lp-violet)" },
  { name: "Alex", action: "completed", project: "Q3 Planning", color: "var(--lp-accent)" },
  { name: "Jordan", action: "assigned", project: "API Refactor", color: "#ffb84d" },
  { name: "Lina", action: "archived", project: "Old Branding", color: "var(--lp-violet)" },
  { name: "Kai", action: "moved a task", project: "Sprint 12", color: "var(--lp-accent)" },
];

function LiveFeed() {
  const VISIBLE = 4;
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setOffset((o) => o + 1), 2400);
    return () => clearInterval(id);
  }, []);

  // Build the visible window (wrapping around)
  const items: typeof ALL_FEED_ITEMS = [];
  for (let i = 0; i < VISIBLE; i++) {
    items.push(ALL_FEED_ITEMS[(offset + i) % ALL_FEED_ITEMS.length]);
  }

  return (
    <div className="relative border-y border-[var(--lp-border)] bg-[#080a0c]/90 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_120%_at_50%_50%,rgba(201,255,61,0.04),transparent_70%)]" />

      {/* live badge */}
      <div className="absolute top-[12px] right-[20px] z-20 flex items-center gap-[6px] font-mono text-[10px] text-[var(--lp-accent)] tracking-widest uppercase px-[10px] py-[4px] rounded-full border border-[var(--lp-accent-line)] bg-[var(--lp-accent-dim)]">
        <span className="w-[5px] h-[5px] rounded-full bg-[var(--lp-accent)] animate-[pulse-ring_2s_infinite]" />
        LIVE
      </div>

      <div className="relative z-10 flex flex-col items-center py-[20px] px-[16px] sm:px-[24px] gap-[2px]" style={{ minHeight: `${VISIBLE * 48 + 24}px` }}>
        {items.map((item, i) => (
          <div
            key={`${offset}-${i}`}
            className="flex items-center gap-[10px] sm:gap-[12px] px-[16px] sm:px-[24px] py-[11px] font-mono text-[12.5px] text-[var(--lp-ink-dim)] w-full max-w-[620px] rounded-[12px] border border-transparent bg-white/[0.02] animate-[feed-item-in_0.55s_cubic-bezier(.16,1,.3,1)_forwards]"
            style={{ animationDelay: `${i * 0.07}s`, opacity: 0 }}
          >
            <div className="relative shrink-0">
              <div className="w-[28px] h-[28px] rounded-full border border-white/10" style={{ background: `linear-gradient(135deg, ${item.color}, ${item.color}88)` }} />
              <span className="absolute -bottom-[1px] -right-[1px] w-[8px] h-[8px] rounded-full bg-[var(--lp-accent)] border-[2px] border-[#080a0c]" />
            </div>
            <span className="font-semibold text-[var(--lp-ink)] shrink-0">{item.name}</span>
            <span className="text-[var(--lp-ink-faint)] shrink-0 hidden sm:inline">{item.action}</span>
            <span className="text-[var(--lp-ink-faint)] shrink-0 sm:hidden truncate max-w-[72px]">{item.action}</span>
            <span className="truncate" style={{ color: item.color }}>{item.project}</span>
            <span className="ml-auto text-[10px] text-[var(--lp-ink-faint)] opacity-60 shrink-0">just now</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const HOW_IT_WORKS_STEPS = [
  {
    num: 1,
    title: "Invite your team",
    desc: "Create a workspace, send out invites, and get everyone into the same environment.",
  },
  {
    num: 2,
    title: "Build the board, assign the work",
    desc: "Create projects, add tasks, set due dates, and assign them out. Everyone sees the same board, updating in real-time.",
  },
  {
    num: 3,
    title: "Discuss inline, never lose context",
    desc: "Use the built-in workspace chat to discuss features, share links, and celebrate wins without ever tabbing over to Slack.",
  },
];

function HowItWorksTimeline() {
  return (
    <Reveal className="mt-[72px]">
      {/* Desktop: line sits above cards, connected by short stems */}
      <div className="hidden lg:block">
        <div className="relative grid grid-cols-3 gap-[24px]">
          {/* Connector line — above the cards, through step nodes only */}
          <div className="absolute left-[calc(16.666%-4px)] right-[calc(16.666%-4px)] top-[18px] h-[2px] rounded-full bg-[var(--lp-border-strong)] overflow-visible pointer-events-none">
            <div
              className="absolute left-0 top-0 h-full rounded-full origin-left animate-[step-line-fill-h_10s_ease-in-out_infinite]"
              style={{
                background: "linear-gradient(90deg, rgba(201,255,61,0.12), rgba(201,255,61,0.55), rgba(201,255,61,0.12))",
                boxShadow: "0 0 14px rgba(201,255,61,0.35)",
              }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[12px] h-[12px] rounded-full animate-[step-light-travel-h_10s_ease-in-out_infinite]"
              style={{
                background: "radial-gradient(circle, #eaffb0 0%, #c9ff3d 50%, transparent 72%)",
                boxShadow: "0 0 14px rgba(201,255,61,0.95), 0 0 28px rgba(201,255,61,0.35)",
              }}
            />
          </div>

          {HOW_IT_WORKS_STEPS.map((step) => (
            <div key={step.num} className="flex flex-col items-center">
              <div
                className="relative z-10 flex items-center justify-center w-[38px] h-[38px] rounded-full border-[3px] font-mono text-[13.5px] font-bold bg-[#050607] animate-[step-node-glow_10s_ease-in-out_infinite]"
                style={{ animationDelay: `${(step.num - 1) * 3.33}s` }}
              >
                {step.num}
              </div>
              <div className="w-[1px] h-[28px] bg-gradient-to-b from-[var(--lp-border-strong)] to-[var(--lp-border)] mt-[2px]" />
              <div
                className="w-full text-center px-[18px] py-[26px] rounded-[18px] border border-[var(--lp-border)] bg-white/[0.02] animate-[step-card-glow_10s_ease-in-out_infinite]"
                style={{ animationDelay: `${(step.num - 1) * 3.33}s` }}
              >
                <h3 className="text-[18px] font-semibold text-[var(--lp-ink)] tracking-tight">{step.title}</h3>
                <p className="text-[14.5px] text-[var(--lp-ink-dim)] mt-[10px] leading-[1.65]">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: nodes + line on the left, cards separate on the right */}
      <div className="lg:hidden relative max-w-[540px] mx-auto">
        {HOW_IT_WORKS_STEPS.map((step, i) => (
          <div key={step.num} className="flex gap-[16px]">
            <div className="flex flex-col items-center w-[40px] shrink-0">
              <div
                className="relative z-10 flex items-center justify-center w-[38px] h-[38px] rounded-full border-[3px] font-mono text-[13.5px] font-bold bg-[#050607] animate-[step-node-glow_10s_ease-in-out_infinite]"
                style={{ animationDelay: `${(step.num - 1) * 3.33}s` }}
              >
                {step.num}
              </div>
              {i < HOW_IT_WORKS_STEPS.length - 1 && (
                <div className="relative flex-1 w-[2px] min-h-[48px] my-[6px] rounded-full bg-[var(--lp-border-strong)] overflow-visible">
                  <div
                    className="absolute inset-x-0 top-0 w-full rounded-full origin-top animate-[step-line-fill-v_10s_ease-in-out_infinite]"
                    style={{
                      height: i === 0 ? "100%" : "0%",
                      animationDelay: `${i * 3.33}s`,
                      background: "linear-gradient(180deg, rgba(201,255,61,0.15), rgba(201,255,61,0.55))",
                      boxShadow: "0 0 10px rgba(201,255,61,0.3)",
                    }}
                  />
                  {i === 0 && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-[10px] h-[10px] rounded-full animate-[step-light-travel-v_10s_ease-in-out_infinite]"
                      style={{
                        background: "radial-gradient(circle, #eaffb0 0%, #c9ff3d 50%, transparent 72%)",
                        boxShadow: "0 0 12px rgba(201,255,61,0.9)",
                      }}
                    />
                  )}
                </div>
              )}
            </div>
            <div
              className={`flex-1 rounded-[16px] border border-[var(--lp-border)] bg-white/[0.02] px-[18px] py-[18px] animate-[step-card-glow_10s_ease-in-out_infinite] ${i < HOW_IT_WORKS_STEPS.length - 1 ? "mb-[20px]" : ""}`}
              style={{ animationDelay: `${(step.num - 1) * 3.33}s` }}
            >
              <h3 className="text-[17px] font-semibold text-[var(--lp-ink)] tracking-tight">{step.title}</h3>
              <p className="text-[14px] text-[var(--lp-ink-dim)] mt-[8px] leading-[1.65]">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </Reveal>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TestimonialCarousel – Auto-rotating quotes with crossfade + progress bar
   ═══════════════════════════════════════════════════════════════════════════ */
const TESTIMONIALS = [
  {
    quote: "Our boards, our conversations, and every client update finally live in one place. Status meetings basically disappeared — people just open the board and see exactly where things stand.",
    name: "David K.",
    role: "Studio Lead at Studio42",
    gradient: "from-[var(--lp-accent)] to-[#6b8a1f]",
  },
  {
    quote: "We tried every tool on the market. Flowfoundry is the only one where our designers, engineers, and clients are genuinely in sync — no Slack pings, no email chains, just the board.",
    name: "Anya M.",
    role: "Head of Product at Northwind",
    gradient: "from-[var(--lp-violet)] to-[#5a4fc4]",
  },
  {
    quote: "The real-time updates are a game-changer. I drag a task to Done and my PM sees it instantly across the world. It feels like we're actually in the same room.",
    name: "Marcus T.",
    role: "Engineering Lead at Lumen Labs",
    gradient: "from-[#ffb84d] to-[#e0962b]",
  },
];

function TestimonialCarousel() {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const DURATION = 6000;

  useEffect(() => {
    const start = Date.now();
    let raf: number;
    const tick = () => {
      const elapsed = Date.now() - start;
      const p = (elapsed % DURATION) / DURATION;
      setProgress(p);
      if (elapsed > 0 && elapsed % DURATION < 16) {
        setActive((a) => (a + 1) % TESTIMONIALS.length);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Simple auto-advance every DURATION ms
  useEffect(() => {
    const id = setInterval(() => {
      setActive((a) => (a + 1) % TESTIMONIALS.length);
    }, DURATION);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="border-y border-[var(--lp-border)] bg-white/[0.03] py-[100px] relative overflow-hidden">
      {/* subtle ambient glow behind the quote */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(201,255,61,0.04), transparent 70%)"
      }} />

      <div className="mx-auto max-w-[1180px] px-5 sm:px-7 flex flex-col items-center text-center relative z-10">
        {/* large decorative quote mark */}
        <div className="font-serif italic text-[80px] text-[var(--lp-accent)] opacity-40 leading-[0.5] h-[40px] select-none">&ldquo;</div>

        {/* quote container with fixed height for smooth transition */}
        <div className="relative w-full max-w-[780px]" style={{ minHeight: "160px" }}>
          {TESTIMONIALS.map((t, i) => (
            <blockquote
              key={i}
              className="absolute inset-0 font-serif font-normal italic text-[clamp(1.4rem,3vw,2.2rem)] leading-[1.35] tracking-tight text-[var(--lp-ink)] transition-all duration-700 ease-[cubic-bezier(.16,1,.3,1)]"
              style={{
                opacity: active === i ? 1 : 0,
                transform: active === i ? "translateY(0) scale(1)" : "translateY(12px) scale(0.98)",
                pointerEvents: active === i ? "auto" : "none",
              }}
            >
              {t.quote}
            </blockquote>
          ))}
        </div>

        <div className="mt-[32px] flex items-center justify-center gap-[12px] relative" style={{ minHeight: "42px" }}>
          {TESTIMONIALS.map((t, i) => (
            <div
              key={i}
              className="absolute top-0 left-1/2 -translate-x-1/2 w-max flex items-center justify-center gap-[12px] transition-all duration-500"
              style={{
                opacity: active === i ? 1 : 0,
                transform: active === i ? "translateY(0)" : "translateY(8px)",
              }}
            >
              <div className={`w-[38px] h-[38px] rounded-full bg-gradient-to-br ${t.gradient} ring-2 ring-white/10`} />
              <div className="text-left">
                <div className="text-[14px] font-semibold text-[var(--lp-ink)]">{t.name}</div>
                <div className="text-[12.5px] text-[var(--lp-ink-faint)] mt-[1px]">{t.role}</div>
              </div>
            </div>
          ))}
        </div>

        {/* dot indicators + progress bar */}
        <div className="flex items-center gap-[12px] mt-[32px]">
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className="relative h-[3px] rounded-full overflow-hidden transition-all duration-300"
              style={{
                width: active === i ? "36px" : "12px",
                background: active === i ? "rgba(201,255,61,0.2)" : "rgba(255,255,255,0.1)",
              }}
              aria-label={`View testimonial ${i + 1}`}
            >
              {active === i && (
                <div
                  className="absolute inset-0 rounded-full bg-[var(--lp-accent)] origin-left"
                  style={{
                    transform: `scaleX(${progress})`,
                    transition: "none",
                  }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);




  return (
    <div className="landing-page relative min-h-screen font-sans selection:bg-[var(--lp-accent)] selection:text-[#050607]" style={{ background: "var(--lp-bg)", color: "var(--lp-ink)", overflowX: "hidden" }}>
      
      {/* Ambient backgrounds */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 90% 70% at 50% 0%, black 0%, transparent 75%)"
        }}></div>
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 0.6px, transparent 0.6px)",
          backgroundSize: "28px 28px"
        }}></div>
        <div className="absolute inset-0 animate-[mesh-drift_22s_ease-in-out_infinite]" style={{
          background: "radial-gradient(900px 600px at 15% 0%, rgba(201,255,61,0.08), transparent 60%), radial-gradient(800px 600px at 100% 15%, rgba(139,124,246,0.08), transparent 60%), radial-gradient(1000px 700px at 50% 60%, rgba(139,124,246,0.04), transparent 60%), radial-gradient(1200px 800px at 30% 100%, rgba(201,255,61,0.05), transparent 60%)"
        }}></div>
        <div className="absolute left-0 right-0 h-[240px] animate-[scan-fall_14s_linear_infinite]" style={{
          background: "linear-gradient(180deg, transparent, rgba(201,255,61,0.025), transparent)"
        }}></div>
      </div>

      <div className="relative z-10">
        
        {/* NAV */}
        <nav
          className={`fixed z-[100] transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${
            scrolled
              ? "top-[14px] left-[5%] right-[5%] bg-[#050607]/75 backdrop-blur-xl border border-[var(--lp-border-strong)] rounded-[16px] shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.04)]"
              : "top-0 left-0 right-0 bg-transparent border-b border-transparent"
          }`}
        >
          <div className={`mx-auto max-w-[1180px] px-4 sm:px-7 flex items-center justify-between transition-[padding] duration-500 ${scrolled ? "py-[12px] sm:py-[14px]" : "py-3 sm:py-[18px]"}`}>
            <Link href="/" className="flex items-center gap-[9px] text-[16px] sm:text-[19px] font-semibold tracking-tight text-[var(--lp-ink)]">
              <Workflow className="w-[22px] h-[22px] text-[var(--lp-accent)]" />
              <span>Flow<span className="font-bold">foundry</span></span>
            </Link>
            <div className="hidden md:flex items-center gap-9 text-[13.5px] text-[var(--lp-ink-dim)]">
              <a href="#problem" className="hover:text-[var(--lp-ink)] transition-colors">Why Flowfoundry</a>
              <a href="#features" className="hover:text-[var(--lp-ink)] transition-colors">Features</a>
              <a href="#how" className="hover:text-[var(--lp-ink)] transition-colors">How it works</a>
              <a href="#faq" className="hover:text-[var(--lp-ink)] transition-colors">FAQ</a>
            </div>
            <div className="flex items-center gap-3 sm:gap-[18px]">
              <Link href="/login" className="hidden sm:inline-flex items-center gap-2 px-4 py-[9px] sm:px-[20px] sm:py-[10px] rounded-[9px] text-[12.5px] sm:text-[13.5px] font-semibold text-[var(--lp-ink-dim)] border border-[var(--lp-border)] bg-white/5 hover:bg-white/10 hover:text-[var(--lp-ink)] hover:border-[var(--lp-border-strong)] transition-all">Sign in</Link>
              <Link href="/register" className="inline-flex items-center gap-2 px-4 py-[9px] sm:px-[20px] sm:py-[10px] rounded-[9px] text-[12.5px] sm:text-[13.5px] font-semibold text-[#06140a] bg-[var(--lp-accent)] hover:-translate-y-[2px] hover:shadow-[0_8px_28px_rgba(201,255,61,0.28)] transition-all">Get started</Link>
            </div>
          </div>
        </nav>

        {/* HERO */}
        <header className="relative pt-[120px] pb-[40px] lg:pt-[160px] lg:pb-[40px] overflow-hidden">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-7">
            <Reveal className="max-w-[760px] mx-auto text-center">
              <h1 className="font-serif font-normal text-[clamp(2.6rem,6vw,4.6rem)] leading-[1.04] tracking-tight mt-0 mb-[26px] text-[var(--lp-ink)]">
                Every project,<br/>
                <em className="not-italic font-light text-transparent bg-clip-text animate-[gradient-flow_6s_ease-in-out_infinite]" style={{
                  backgroundImage: "linear-gradient(100deg, var(--lp-accent) 10%, #eaffb0 50%, var(--lp-accent) 90%)",
                  backgroundSize: "200% auto"
                }}>under one roof.</em>
              </h1>
              <p className="text-[17px] leading-[1.65] text-[var(--lp-ink-dim)] max-w-[540px] mx-auto">
                Create a workspace, build boards, assign the work, and talk it through — all in one place. Drag a task and your whole team watches it move in real time, so everyone always knows exactly what&apos;s happening.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-[14px] mt-[38px] px-1 sm:px-0">
                <Link href="/register" className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-[26px] py-[14px] rounded-[10px] text-[14.5px] font-semibold text-[#06140a] bg-[var(--lp-accent)] hover:-translate-y-[2px] hover:shadow-[0_8px_28px_rgba(201,255,61,0.28)] transition-all">Get started <span className="opacity-70">→</span></Link>
                <a href="#how" className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-[26px] py-[14px] rounded-[10px] text-[14.5px] font-semibold text-[var(--lp-ink-dim)] border border-[var(--lp-border)] bg-white/5 hover:bg-white/10 hover:text-[var(--lp-ink)] hover:border-[var(--lp-border-strong)] transition-all">See how it works</a>
              </div>
              <div className="flex items-center justify-center gap-2.5 mt-[22px] text-[12.5px] text-[var(--lp-ink-faint)] font-mono flex-wrap">
                <span className="text-[var(--lp-accent)] tracking-widest">★★★★★</span>
                <span>Loved by modern teams</span>
                <span className="opacity-40">·</span>
                <span>Real-time boards</span>
                <span className="opacity-40">·</span>
                <span>Built-in chat</span>
              </div>
            </Reveal>
          </div>

          <Reveal className="relative mt-[60px]" delay={0.2}>
            <LiveFeed />
          </Reveal>

          <Reveal className="relative max-w-[1040px] mx-auto mt-[76px] px-5 sm:px-7" delay={0.3}>
            <div className="absolute inset-x-0 -top-[80px] bottom-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_30%,rgba(201,255,61,0.1),transparent_70%)] z-0 pointer-events-none"></div>
            
            {/* Float Cards */}
            <div className="hidden lg:block absolute z-20 border border-[var(--lp-border-strong)] bg-[#0b0d10]/90 backdrop-blur-md rounded-[14px] p-[12px_15px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] font-mono text-[11.5px] top-[4%] -right-[3%] animate-[float-1_7s_ease-in-out_infinite]">
              <div className="text-[var(--lp-ink-faint)] text-[10px] uppercase tracking-widest">Workspace chat</div>
              <div className="text-[var(--lp-ink)] mt-[5px] text-[13.5px]">#design-team</div>
              <div className="flex items-center gap-[7px] mt-[7px] text-[var(--lp-violet)] text-[11px]">
                <span className="inline-flex gap-[2px] items-center">
                  <span className="w-[3.5px] h-[3.5px] rounded-full bg-[var(--lp-violet)] animate-[typing-bounce_1.2s_ease-in-out_infinite]" style={{ animationDelay: '0s' }}></span>
                  <span className="w-[3.5px] h-[3.5px] rounded-full bg-[var(--lp-violet)] animate-[typing-bounce_1.2s_ease-in-out_infinite]" style={{ animationDelay: '0.15s' }}></span>
                  <span className="w-[3.5px] h-[3.5px] rounded-full bg-[var(--lp-violet)] animate-[typing-bounce_1.2s_ease-in-out_infinite]" style={{ animationDelay: '0.3s' }}></span>
                </span>
                Priya is typing…
              </div>
            </div>
            
            <div className="hidden lg:block absolute z-20 border border-[var(--lp-border-strong)] bg-[#0b0d10]/90 backdrop-blur-md rounded-[14px] p-[12px_15px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] font-mono text-[11.5px] bottom-[8%] -left-[4%] animate-[float-2_8s_ease-in-out_infinite]">
              <div className="text-[var(--lp-ink-faint)] text-[10px] uppercase tracking-widest">Just now</div>
              <div className="text-[var(--lp-accent)] mt-[5px] text-[13.5px]">Task moved to Done</div>
            </div>

            {/* Kanban Panel */}
            <div className="relative z-10 rounded-[20px] border border-[var(--lp-border-strong)] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden transform-gpu transition-transform duration-150" style={{ background: "linear-gradient(180deg, #0d1013, #07090b)" }}>
              <div className="flex items-center justify-between p-[16px_22px] border-b border-[var(--lp-border)]">
                <div className="flex gap-[7px]">
                  <span className="w-[9px] h-[9px] rounded-full bg-white/10"></span>
                  <span className="w-[9px] h-[9px] rounded-full bg-white/10"></span>
                  <span className="w-[9px] h-[9px] rounded-full bg-white/10"></span>
                </div>
                <div className="font-mono text-[11.5px] text-[var(--lp-ink-faint)] tracking-wider flex items-center gap-[8px]">
                  FLOWFOUNDRY / WEBSITE REDESIGN 
                  <span className="flex items-center gap-[5px] text-[10px] text-[var(--lp-accent)]">
                    <span className="w-[5px] h-[5px] rounded-full bg-[var(--lp-accent)] animate-[pulse-ring_2.2s_infinite]"></span> LIVE
                  </span>
                </div>
                <div className="w-[48px]"></div>
              </div>
              
              <div className="relative grid grid-cols-1 md:grid-cols-3 gap-[16px] p-[22px]">
                
                {/* Floating Animated Card that drags across columns */}
                <div className="absolute top-[58px] left-[30px] w-[calc((100%-76px)/3-16px)] h-[96px] z-50 animate-[hero-kanban-drag_7s_cubic-bezier(.65,0,.35,1)_infinite] pointer-events-none hidden md:block">
                  <div className="border border-[var(--lp-accent-line)] rounded-[11px] bg-[#14171b] p-[12px_13px] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.9)] h-full box-border">
                    <div className="flex items-center justify-between gap-[8px]"><span className="font-mono text-[9.5px] font-semibold px-[6px] py-[2px] rounded-[5px] tracking-wider text-[#ff8a7a] bg-[#ff5d4a]/10">P1</span></div>
                    <div className="text-[12.5px] text-[var(--lp-ink)] mt-[9px] leading-[1.4] font-medium">Fix mobile nav overflow</div>
                    <div className="flex items-center justify-between mt-[11px]">
                      <div className="flex">
                        <div className="w-[19px] h-[19px] rounded-full border-[1.5px] border-[#14171b] bg-gradient-to-br from-[var(--lp-amber)] to-[#e0962b]"></div>
                        <div className="w-[19px] h-[19px] rounded-full border-[1.5px] border-[#14171b] bg-gradient-to-br from-[var(--lp-violet)] to-[#5a4fc4] -ml-[6px]"></div>
                      </div>
                      <span className="font-mono text-[9.5px] text-[#ff8a7a] flex items-center gap-[4px]">Overdue</span>
                    </div>
                  </div>
                </div>

                {/* Column 1 */}
                <div className="min-h-[380px]">
                  <div className="flex items-center justify-between px-1 pb-[12px]">
                    <div className="flex items-center gap-[8px] text-[12.5px] font-semibold text-[var(--lp-ink-dim)]">
                      <span className="w-[7px] h-[7px] rounded-full bg-[var(--lp-ink-faint)]"></span>To Do
                    </div>
                    <span className="font-mono text-[11px] text-[var(--lp-ink-faint)] bg-white/5 px-[7px] py-[2px] rounded-full">2</span>
                  </div>
                  <div className="min-h-[300px] rounded-[14px] border border-dashed border-[var(--lp-border)] p-[8px] flex flex-col gap-[8px] bg-white/5">
                    
                    {/* Empty placeholder where the dragged card starts */}
                    <div className="h-[96px] border border-dashed border-[var(--lp-border-strong)] rounded-[11px] bg-white/[0.02]"></div>
                    
                    <div className="border border-[var(--lp-border)] rounded-[11px] bg-[#14171b]/90 p-[12px_13px] hover:border-[var(--lp-border-strong)] transition-colors cursor-grab">
                      <div className="flex items-center justify-between gap-[8px]"><span className="font-mono text-[9.5px] font-semibold px-[6px] py-[2px] rounded-[5px] tracking-wider text-[#ffb84d] bg-[#ffb84d]/10">P2</span></div>
                      <div className="text-[12.5px] text-[var(--lp-ink)] mt-[9px] leading-[1.4] font-medium">Write onboarding copy</div>
                      <div className="flex items-center justify-between mt-[11px]">
                        <div className="flex"><div className="w-[19px] h-[19px] rounded-full border-[1.5px] border-[#14171b] bg-gradient-to-br from-[var(--lp-violet)] to-[#5a4fc4]"></div></div>
                        <span className="font-mono text-[9.5px] text-[var(--lp-ink-faint)] flex items-center gap-[4px]">Next week</span>
                      </div>
                    </div>
                    <div className="border border-[var(--lp-border)] rounded-[11px] bg-[#14171b]/90 p-[12px_13px] hover:border-[var(--lp-border-strong)] transition-colors cursor-grab">
                      <div className="flex items-center justify-between gap-[8px]"><span className="font-mono text-[9.5px] font-semibold px-[6px] py-[2px] rounded-[5px] tracking-wider text-[var(--lp-violet)] bg-[var(--lp-violet-dim)]">P3</span></div>
                      <div className="text-[12.5px] text-[var(--lp-ink)] mt-[9px] leading-[1.4] font-medium">Audit color contrast (WCAG AA)</div>
                      <div className="flex items-center justify-between mt-[11px]">
                        <div className="flex"><div className="w-[19px] h-[19px] rounded-full border-[1.5px] border-[#14171b] bg-gradient-to-br from-[var(--lp-accent)] to-[#8fc92a]"></div></div>
                        <span className="font-mono text-[9.5px] text-[var(--lp-ink-faint)] flex items-center gap-[4px]">No due date</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Column 2 */}
                <div className="min-h-[380px]">
                  <div className="flex items-center justify-between px-1 pb-[12px]">
                    <div className="flex items-center gap-[8px] text-[12.5px] font-semibold text-[var(--lp-ink-dim)]">
                      <span className="w-[7px] h-[7px] rounded-full bg-[var(--lp-violet)]"></span>In Progress
                    </div>
                    <span className="font-mono text-[11px] text-[var(--lp-ink-faint)] bg-white/5 px-[7px] py-[2px] rounded-full">2</span>
                  </div>
                  <div className="min-h-[300px] rounded-[14px] border border-dashed border-[var(--lp-border)] p-[8px] flex flex-col gap-[8px] bg-white/5 relative">
                    {/* Pulse ring indicating drop zone */}
                    <div className="absolute top-[8px] left-[8px] right-[8px] h-[96px] rounded-[11px] border-2 border-[var(--lp-accent-line)] bg-[var(--lp-accent-dim)]/20 animate-[pulse-fade_2.3s_ease-in-out_infinite] z-0 opacity-0" style={{ animationDelay: '1s' }}></div>
                    <div className="h-[96px] border border-dashed border-[var(--lp-border-strong)] rounded-[11px] bg-white/[0.02] relative z-10"></div>
                    
                    <div className="border border-[var(--lp-border)] rounded-[11px] bg-[#14171b]/90 p-[12px_13px] hover:border-[var(--lp-border-strong)] transition-colors cursor-grab relative z-10">
                      <div className="flex items-center justify-between gap-[8px]"><span className="font-mono text-[9.5px] font-semibold px-[6px] py-[2px] rounded-[5px] tracking-wider text-[#ffb84d] bg-[#ffb84d]/10">P2</span></div>
                      <div className="text-[12.5px] text-[var(--lp-ink)] mt-[9px] leading-[1.4] font-medium">Design the new homepage</div>
                      <div className="flex items-center justify-between mt-[11px]">
                        <div className="flex"><div className="w-[19px] h-[19px] rounded-full border-[1.5px] border-[#14171b] bg-gradient-to-br from-[var(--lp-accent)] to-[#8fc92a]"></div></div>
                        <span className="font-mono text-[9.5px] text-[var(--lp-amber)] flex items-center gap-[4px]">Due today</span>
                      </div>
                    </div>
                    <div className="border border-[var(--lp-border)] rounded-[11px] bg-[#14171b]/90 p-[12px_13px] hover:border-[var(--lp-border-strong)] transition-colors cursor-grab relative z-10">
                      <div className="flex items-center justify-between gap-[8px]"><span className="font-mono text-[9.5px] font-semibold px-[6px] py-[2px] rounded-[5px] tracking-wider text-[var(--lp-violet)] bg-[var(--lp-violet-dim)]">P3</span></div>
                      <div className="text-[12.5px] text-[var(--lp-ink)] mt-[9px] leading-[1.4] font-medium">Draft the client proposal</div>
                      <div className="flex items-center justify-between mt-[11px]">
                        <div className="flex"><div className="w-[19px] h-[19px] rounded-full border-[1.5px] border-[#14171b] bg-gradient-to-br from-[var(--lp-amber)] to-[#e0962b]"></div></div>
                        <span className="font-mono text-[9.5px] text-[var(--lp-ink-faint)] flex items-center gap-[4px]">Next week</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 3 */}
                <div className="min-h-[380px]">
                  <div className="flex items-center justify-between px-1 pb-[12px]">
                    <div className="flex items-center gap-[8px] text-[12.5px] font-semibold text-[var(--lp-ink-dim)]">
                      <span className="w-[7px] h-[7px] rounded-full bg-[var(--lp-accent)]"></span>Done
                    </div>
                    <span className="font-mono text-[11px] text-[var(--lp-ink-faint)] bg-white/5 px-[7px] py-[2px] rounded-full">3</span>
                  </div>
                  <div className="min-h-[300px] rounded-[14px] border border-dashed border-[var(--lp-border)] p-[8px] flex flex-col gap-[8px] bg-white/5 relative">
                    <div className="absolute top-[8px] left-[8px] right-[8px] h-[96px] rounded-[11px] border-2 border-[var(--lp-accent-line)] bg-[var(--lp-accent-dim)]/20 animate-[pulse-fade_2.3s_ease-in-out_infinite] z-0 opacity-0" style={{ animationDelay: '3s' }}></div>
                    <div className="h-[96px] border border-dashed border-[var(--lp-border-strong)] rounded-[11px] bg-white/[0.02] relative z-10"></div>
                    
                    <div className="border border-[var(--lp-border)] rounded-[11px] bg-[#14171b]/90 p-[12px_13px] hover:border-[var(--lp-border-strong)] transition-colors cursor-grab relative z-10">
                      <div className="flex items-center justify-between gap-[8px]"><span className="font-mono text-[9.5px] font-semibold px-[6px] py-[2px] rounded-[5px] tracking-wider text-[var(--lp-violet)] bg-[var(--lp-violet-dim)]">P3</span></div>
                      <div className="text-[12.5px] text-[var(--lp-ink)] mt-[9px] leading-[1.4] font-medium">Send kickoff deck to client</div>
                      <div className="flex items-center justify-between mt-[11px]">
                        <div className="flex"><div className="w-[19px] h-[19px] rounded-full border-[1.5px] border-[#14171b] bg-gradient-to-br from-[var(--lp-violet)] to-[#5a4fc4]"></div></div>
                        <span className="font-mono text-[9.5px] text-[var(--lp-ink-faint)] flex items-center gap-[4px]">Completed</span>
                      </div>
                    </div>
                    <div className="border border-[var(--lp-border)] rounded-[11px] bg-[#14171b]/90 p-[12px_13px] hover:border-[var(--lp-border-strong)] transition-colors cursor-grab relative z-10">
                      <div className="flex items-center justify-between gap-[8px]"><span className="font-mono text-[9.5px] font-semibold px-[6px] py-[2px] rounded-[5px] tracking-wider text-[#ffb84d] bg-[#ffb84d]/10">P2</span></div>
                      <div className="text-[12.5px] text-[var(--lp-ink)] mt-[9px] leading-[1.4] font-medium">Workspace invite flow</div>
                      <div className="flex items-center justify-between mt-[11px]">
                        <div className="flex"><div className="w-[19px] h-[19px] rounded-full border-[1.5px] border-[#14171b] bg-gradient-to-br from-[var(--lp-accent)] to-[#8fc92a]"></div></div>
                        <span className="font-mono text-[9.5px] text-[var(--lp-ink-faint)] flex items-center gap-[4px]">Completed</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </Reveal>
        </header>



        {/* PROBLEM */}
        <section id="problem" className="relative pt-[60px] pb-[130px]">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-7">
            <Reveal className="max-w-[600px]">
              <span className="inline-flex items-center gap-[8px] font-mono text-[12px] text-[var(--lp-accent)] tracking-widest uppercase before:content-[''] before:w-[14px] before:h-[1px] before:bg-[var(--lp-accent)]">The problem</span>
              <h2 className="font-serif font-normal text-[clamp(2rem,4vw,3rem)] leading-[1.1] tracking-tight mt-[18px]">Your team&apos;s work lives in eight tabs. Your focus lives in none.</h2>
              <p className="text-[16px] leading-[1.7] text-[var(--lp-ink-dim)] mt-[18px] max-w-[480px]">Tasks in one app, chat in another, files somewhere else, and a status nobody can find. Stitching it together isn&apos;t project management — it&apos;s tab management.</p>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-12 md:gap-[60px] items-center mt-[70px]">
              <Reveal className="relative h-[420px] border border-[var(--lp-border)] rounded-[20px] overflow-hidden" style={{ background: "radial-gradient(ellipse at center, rgba(255,93,74,0.06), transparent 65%), rgba(255,255,255,0.012)" }}>
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" preserveAspectRatio="none">
                  <defs>
                    <radialGradient id="problem-line-fade" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="rgba(255,93,74,0.4)" />
                      <stop offset="100%" stopColor="rgba(255,93,74,0.12)" />
                    </radialGradient>
                  </defs>
                  {[
                    { x: "13%", y: "15%" },
                    { x: "87%", y: "18%" },
                    { x: "13%", y: "82%" },
                    { x: "84%", y: "88%" },
                    { x: "10%", y: "48%" },
                    { x: "90%", y: "54%" },
                  ].map((node, i) => (
                    <line
                      key={i}
                      x1="50%"
                      y1="50%"
                      x2={node.x}
                      y2={node.y}
                      stroke="url(#problem-line-fade)"
                      strokeWidth="1.25"
                      strokeDasharray="3 6"
                      className="animate-[dash-flow_1.6s_linear_infinite]"
                    />
                  ))}
                </svg>
                {/* Center hub — opaque disc so the lines visually terminate at the outer ring */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90px] h-[90px] rounded-full z-10 flex items-center justify-center animate-[center-pulse_3s_ease-in-out_infinite]" style={{ background: "var(--lp-bg)", boxShadow: "0 0 0 1px rgba(255,93,74,0.25), 0 0 40px rgba(255,93,74,0.18)" }}>
                  <div className="w-[58px] h-[58px] rounded-full border border-dashed border-[#ff5d4a]/40 flex items-center justify-center">
                    <span className="font-serif italic text-[24px] text-[#ff5d4a] opacity-70 leading-none">?</span>
                  </div>
                </div>
                <div className="absolute top-[8%] left-[5%] border border-[var(--lp-border-strong)] bg-[#0f1215]/90 backdrop-blur-md rounded-[12px] p-[10px_14px] shadow-lg flex flex-col gap-[6px] animate-[node-drift_7s_ease-in-out_infinite_reverse] z-10">
                  <div className="font-mono text-[11px] text-[var(--lp-ink-faint)] flex items-center gap-[7px]"><span className="w-[6px] h-[6px] rounded-full bg-[#ffb84d] shrink-0"></span>Trello</div>
                  <div className="text-[10px] text-[var(--lp-ink)] font-medium">Where is the Q3 roadmap?</div>
                </div>
                <div className="absolute top-[12%] right-[5%] border border-[var(--lp-border-strong)] bg-[#0f1215]/90 backdrop-blur-md rounded-[12px] p-[10px_14px] shadow-lg flex flex-col gap-[6px] animate-[node-drift_5s_ease-in-out_infinite] delay-100 z-10">
                  <div className="font-mono text-[11px] text-[var(--lp-ink-faint)] flex items-center gap-[7px]"><span className="w-[6px] h-[6px] rounded-full bg-[var(--lp-red)] shrink-0 animate-pulse"></span>Slack</div>
                  <div className="text-[10px] text-[#ff5d4a] font-medium">42 unread in #design-sync</div>
                </div>
                <div className="absolute bottom-[16%] left-[6%] border border-[var(--lp-border-strong)] bg-[#0f1215]/90 backdrop-blur-md rounded-[12px] p-[10px_14px] shadow-lg flex flex-col gap-[6px] animate-[node-drift_6s_ease-in-out_infinite_reverse] delay-300 z-10">
                  <div className="font-mono text-[11px] text-[var(--lp-ink-faint)] flex items-center gap-[7px]"><span className="w-[6px] h-[6px] rounded-full bg-[var(--lp-violet)] shrink-0"></span>Notion</div>
                  <div className="text-[10px] text-[var(--lp-ink-dim)] font-medium">Document is out of date</div>
                </div>
                <div className="absolute bottom-[12%] right-[8%] border border-[var(--lp-border-strong)] bg-[#0f1215]/90 backdrop-blur-md rounded-[12px] p-[10px_14px] shadow-lg flex flex-col gap-[6px] animate-[node-drift_8s_ease-in-out_infinite] delay-200 z-10">
                  <div className="font-mono text-[11px] text-[var(--lp-ink-faint)] flex items-center gap-[7px]"><span className="w-[6px] h-[6px] rounded-full bg-[var(--lp-ink-faint)] shrink-0"></span>Email</div>
                  <div className="text-[10px] text-[var(--lp-ink)] font-medium">Re: Re: Re: Final assets V4</div>
                </div>
                <div className="absolute top-[42%] left-[2%] border border-[var(--lp-border-strong)] bg-[#0f1215]/90 backdrop-blur-md rounded-[12px] p-[10px_14px] shadow-lg flex flex-col gap-[6px] animate-[node-drift_5s_ease-in-out_infinite_reverse] delay-500 z-10">
                  <div className="font-mono text-[11px] text-[var(--lp-ink-faint)] flex items-center gap-[7px]"><span className="w-[6px] h-[6px] rounded-full bg-[#8fc92a] shrink-0"></span>Sheets</div>
                  <div className="text-[10px] text-[var(--lp-ink-dim)] font-medium">Request access to view</div>
                </div>
                <div className="absolute top-[48%] right-[0%] border border-[var(--lp-border-strong)] bg-[#0f1215]/90 backdrop-blur-md rounded-[12px] p-[10px_14px] shadow-lg flex flex-col gap-[6px] animate-[node-drift_7s_ease-in-out_infinite] delay-700 z-10">
                  <div className="font-mono text-[11px] text-[var(--lp-ink-faint)] flex items-center gap-[7px]"><span className="w-[6px] h-[6px] rounded-full bg-[#5a4fc4] shrink-0"></span>Zoom</div>
                  <div className="text-[10px] text-[var(--lp-ink-dim)] font-medium">Recording expired</div>
                </div>
              </Reveal>

              <Reveal className="flex flex-col mt-0 md:mt-[36px]">
                <div className="flex gap-[18px] py-[22px] border-t border-[var(--lp-border)]">
                  <div className="font-mono text-[13px] text-[var(--lp-ink-faint)] pt-[2px]">01</div>
                  <div><h4 className="text-[15.5px] font-semibold text-[var(--lp-ink)]">Scattered context</h4><p className="text-[14px] text-[var(--lp-ink-dim)] mt-[6px] leading-[1.6]">The decision happened in Slack, the task lives in Trello, and nobody remembers why.</p></div>
                </div>
                <div className="flex gap-[18px] py-[22px] border-t border-[var(--lp-border)]">
                  <div className="font-mono text-[13px] text-[var(--lp-ink-faint)] pt-[2px]">02</div>
                  <div><h4 className="text-[15.5px] font-semibold text-[var(--lp-ink)]">Clients left guessing</h4><p className="text-[14px] text-[var(--lp-ink-dim)] mt-[6px] leading-[1.6]">When progress is buried across tools, &quot;where are we at?&quot; turns into another meeting instead of a quick glance at the board.</p></div>
                </div>
                <div className="flex gap-[18px] py-[22px] border-y border-[var(--lp-border)]">
                  <div className="font-mono text-[13px] text-[var(--lp-ink-faint)] pt-[2px]">03</div>
                  <div><h4 className="text-[15.5px] font-semibold text-[var(--lp-ink)]">No single source of truth</h4><p className="text-[14px] text-[var(--lp-ink-dim)] mt-[6px] leading-[1.6]">Status updates live in someone's head, not in a board everyone can actually see.</p></div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* FEATURES BENTO */}
        <section id="features" className="relative py-[130px]">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-7">
            <Reveal className="max-w-[600px]">
              <span className="inline-flex items-center gap-[8px] font-mono text-[12px] text-[var(--lp-accent)] tracking-widest uppercase before:content-[''] before:w-[14px] before:h-[1px] before:bg-[var(--lp-accent)]">The platform</span>
              <h2 className="font-serif font-normal text-[clamp(2rem,4vw,3rem)] leading-[1.1] tracking-tight mt-[18px]">One workspace. Everything in sync.</h2>
              <p className="text-[16px] leading-[1.7] text-[var(--lp-ink-dim)] mt-[18px] max-w-[480px]">Flowfoundry brings boards, chat, and notifications into a single real-time workspace — so your team plans, delivers, and keeps clients in the loop without ever leaving the app.</p>
            </Reveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-[18px] mt-[64px]">
              <Reveal spotlight className="md:col-span-4 border border-[var(--lp-border)] rounded-[18px] bg-white/5 p-[26px] relative overflow-hidden transition-colors duration-300 hover:border-[var(--lp-accent-line)] hover:bg-white/10">
                <div className="w-[38px] h-[38px] rounded-[10px] bg-[var(--lp-accent-dim)] border border-[var(--lp-accent-line)] flex items-center justify-center text-[var(--lp-accent)] mb-[18px]">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="10" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="2" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="10" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/></svg>
                </div>
                <h3 className="text-[17px] font-semibold text-[var(--lp-ink)] tracking-tight">Drag-and-drop kanban</h3>
                <p className="text-[13.5px] text-[var(--lp-ink-dim)] leading-[1.65] mt-[8px] max-w-[380px]">Visual boards with To Do, In Progress, and Done columns. Drag a card and everyone on the team sees it move, instantly.</p>
                <div className="mt-[18px]">
                  <div className="grid grid-cols-3 gap-[10px] mb-[9px]">
                    <div className="font-mono text-[9.5px] text-[var(--lp-ink-faint)] uppercase tracking-widest flex items-center gap-[5px]"><span className="w-[5px] h-[5px] rounded-full bg-[var(--lp-ink-faint)]"></span>To do</div>
                    <div className="font-mono text-[9.5px] text-[var(--lp-ink-faint)] uppercase tracking-widest flex items-center gap-[5px]"><span className="w-[5px] h-[5px] rounded-full bg-[var(--lp-violet)]"></span>In progress</div>
                    <div className="font-mono text-[9.5px] text-[var(--lp-ink-faint)] uppercase tracking-widest flex items-center gap-[5px]"><span className="w-[5px] h-[5px] rounded-full bg-[var(--lp-accent)]"></span>Done</div>
                  </div>
                  {/* drop zones with a single card that "drags" across the columns */}
                  <div className="relative grid grid-cols-3 gap-[10px]">
                    <div className="h-[42px] rounded-[8px] border border-dashed border-[var(--lp-border)] bg-white/[0.03]"></div>
                    <div className="h-[42px] rounded-[8px] border border-dashed border-[var(--lp-border)] bg-white/[0.03]"></div>
                    <div className="h-[42px] rounded-[8px] border border-dashed border-[var(--lp-border)] bg-white/[0.03]"></div>
                    <div
                      className="absolute top-0 left-0 w-[calc((100%-20px)/3)] h-[42px] rounded-[8px] border border-[var(--lp-accent-line)] bg-[#14171b] shadow-[0_10px_24px_-6px_rgba(0,0,0,0.6)] flex items-center gap-[7px] px-[9px] animate-[kanban-drag_5.5s_cubic-bezier(.65,0,.35,1)_infinite] will-change-transform"
                    >
                      <span className="w-[5px] h-[5px] rounded-full bg-[var(--lp-accent)] shrink-0"></span>
                      <span className="flex-1 h-[4px] rounded-full bg-white/15"></span>
                      <span className="w-[16px] h-[16px] rounded-full shrink-0 bg-gradient-to-br from-[var(--lp-violet)] to-[#5a4fc4]"></span>
                    </div>
                  </div>
                </div>
              </Reveal>

              <Reveal spotlight className="md:col-span-2 border border-[var(--lp-border)] rounded-[18px] bg-white/5 p-[26px] relative overflow-hidden transition-colors duration-300 hover:border-[var(--lp-accent-line)] hover:bg-white/10" delay={0.1}>
                <div className="w-[38px] h-[38px] rounded-[10px] bg-[var(--lp-violet-dim)] border border-[var(--lp-violet-line)] flex items-center justify-center text-[var(--lp-violet)] mb-[18px]">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 4.5A2.5 2.5 0 014.5 2h9A2.5 2.5 0 0116 4.5v5A2.5 2.5 0 0113.5 12H7l-3.5 3v-3H4.5A2.5 2.5 0 012 9.5v-5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
                </div>
                <h3 className="text-[17px] font-semibold text-[var(--lp-ink)] tracking-tight">Workspace chat</h3>
                <p className="text-[13.5px] text-[var(--lp-ink-dim)] leading-[1.65] mt-[8px] max-w-[380px]">Thread-based conversations, right where the work happens.</p>
                <div className="mt-[18px] border border-[var(--lp-border)] rounded-[14px] p-[14px] bg-white/5">
                  <div className="flex gap-[9px] mb-[12px] opacity-0 animate-[msg-in_0.5s_ease_forwards]" style={{animationDelay: '0.2s'}}>
                    <div className="w-[24px] h-[24px] rounded-full shrink-0 bg-gradient-to-br from-[var(--lp-violet)] to-[#5a4fc4]"></div>
                    <div className="text-[12px] leading-[1.5]"><div className="text-[var(--lp-ink)] font-semibold text-[11.5px]">Priya</div><div className="text-[var(--lp-ink-dim)] mt-[2px]">Pushed the new board UI</div></div>
                  </div>
                  <div className="flex gap-[9px] mb-[12px] opacity-0 animate-[msg-in_0.5s_ease_forwards]" style={{animationDelay: '0.9s'}}>
                    <div className="w-[24px] h-[24px] rounded-full shrink-0 bg-gradient-to-br from-[var(--lp-accent)] to-[#8fc92a]"></div>
                    <div className="text-[12px] leading-[1.5]"><div className="text-[var(--lp-ink)] font-semibold text-[11.5px]">Theo</div><div className="text-[var(--lp-ink-dim)] mt-[2px]">Looks great, testing now</div></div>
                  </div>
                  <div className="flex gap-[9px] opacity-0 animate-[msg-in_0.5s_ease_forwards]" style={{animationDelay: '1.6s'}}>
                    <div className="w-[24px] h-[24px] rounded-full shrink-0 bg-gradient-to-br from-[#ffb84d] to-[#e0962b]"></div>
                    <div className="text-[12px] leading-[1.5]"><div className="text-[var(--lp-ink)] font-semibold text-[11.5px]">Sasha</div><div className="text-[var(--lp-ink-dim)] mt-[2px]">🎉 ship it</div></div>
                  </div>
                </div>
              </Reveal>

              <Reveal spotlight className="md:col-span-2 border border-[var(--lp-border)] rounded-[18px] bg-white/5 p-[26px] relative overflow-hidden transition-colors duration-300 hover:border-[var(--lp-accent-line)] hover:bg-white/10" delay={0.2}>
                <div className="w-[38px] h-[38px] rounded-[10px] bg-[var(--lp-accent-dim)] border border-[var(--lp-accent-line)] flex items-center justify-center text-[var(--lp-accent)] mb-[18px]">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 1.5L15.5 4.5V9C15.5 12.6 12.7 15.5 9 16.5C5.3 15.5 2.5 12.6 2.5 9V4.5L9 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
                </div>
                <h3 className="text-[17px] font-semibold text-[var(--lp-ink)] tracking-tight">Real-time everything</h3>
                <p className="text-[13.5px] text-[var(--lp-ink-dim)] leading-[1.65] mt-[8px] max-w-[380px]">Every change appears live for the whole team — no refresh, ever.</p>
                <div className="mt-4">
                  <div className="flex items-center gap-[10px] py-[8px]">
                    <div className="relative w-[22px] h-[22px] rounded-full shrink-0 bg-gradient-to-br from-[var(--lp-violet)] to-[#5a4fc4] after:content-[''] after:absolute after:-right-[1px] after:-bottom-[1px] after:w-[8px] after:h-[8px] after:rounded-full after:bg-[var(--lp-accent)] after:border-[2px] after:border-[#14171b] after:animate-[pulse-ring_2s_infinite]"></div>
                    <span className="text-[12px] text-[var(--lp-ink)]">Maya</span>
                    <span className="text-[11.5px] text-[var(--lp-ink-faint)] font-mono ml-auto">editing task...</span>
                  </div>
                  <div className="flex items-center gap-[10px] py-[8px]">
                    <div className="relative w-[22px] h-[22px] rounded-full shrink-0 bg-gradient-to-br from-[var(--lp-accent)] to-[#8fc92a] after:content-[''] after:absolute after:-right-[1px] after:-bottom-[1px] after:w-[8px] after:h-[8px] after:rounded-full after:bg-[var(--lp-accent)] after:border-[2px] after:border-[#14171b] after:animate-[pulse-ring_2s_infinite]"></div>
                    <span className="text-[12px] text-[var(--lp-ink)]">Theo</span>
                    <span className="text-[11.5px] text-[var(--lp-ink-faint)] font-mono ml-auto">viewing board</span>
                  </div>
                  <div className="flex items-center gap-[10px] py-[8px]">
                    <div className="relative w-[22px] h-[22px] rounded-full shrink-0 bg-gradient-to-br from-[#ffb84d] to-[#e0962b] after:content-[''] after:absolute after:-right-[1px] after:-bottom-[1px] after:w-[8px] after:h-[8px] after:rounded-full after:bg-[var(--lp-accent)] after:border-[2px] after:border-[#14171b] after:animate-[pulse-ring_2s_infinite]"></div>
                    <span className="text-[12px] text-[var(--lp-ink)]">Sasha</span>
                    <span className="text-[11.5px] text-[var(--lp-ink-faint)] font-mono ml-auto">online</span>
                  </div>
                </div>
              </Reveal>

              <Reveal spotlight className="md:col-span-4 border border-[var(--lp-border)] rounded-[18px] bg-white/5 p-[26px] relative overflow-hidden transition-colors duration-300 hover:border-[var(--lp-accent-line)] hover:bg-white/10" delay={0.3}>
                <div className="w-[38px] h-[38px] rounded-[10px] bg-[var(--lp-violet-dim)] border border-[var(--lp-violet-line)] flex items-center justify-center text-[var(--lp-violet)] mb-[18px]">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M14.5 6.5a5.5 5.5 0 00-11 0c0 4-1.5 5-1.5 5h14s-1.5-1-1.5-5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M7.5 14.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.4"/></svg>
                </div>
                <h3 className="text-[17px] font-semibold text-[var(--lp-ink)] tracking-tight">Smart notifications</h3>
                <p className="text-[13.5px] text-[var(--lp-ink-dim)] leading-[1.65] mt-[8px] max-w-[380px]">Assignments, mentions, and workspace invites — surfaced the moment they happen, so nothing ever slips through the cracks.</p>
                <div className="mt-[18px] flex flex-col gap-[9px]">
                  <div className="flex items-center gap-[11px] p-[10px_12px] border border-[var(--lp-border)] rounded-[11px] bg-white/5">
                    <span className="w-[6px] h-[6px] rounded-full bg-[var(--lp-accent)] shrink-0 animate-[pulse-ring_2s_infinite]"></span>
                    <div className="w-[26px] h-[26px] rounded-[8px] flex items-center justify-center shrink-0 bg-[var(--lp-accent-dim)] text-[var(--lp-accent)]"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 4l4.5 3 4.5-3" stroke="currentColor" strokeWidth="1.3"/><rect x="1.5" y="2.5" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/></svg></div>
                    <div className="text-[12px] text-[var(--lp-ink-dim)]"><b className="text-[var(--lp-ink)] font-semibold">Theo</b> assigned you "Fix mobile nav"</div>
                    <span className="ml-auto font-mono text-[10px] text-[var(--lp-ink-faint)] whitespace-nowrap">2m</span>
                  </div>
                  <div className="flex items-center gap-[11px] p-[10px_12px] border border-[var(--lp-border)] rounded-[11px] bg-white/5">
                    <span className="w-[6px] h-[6px] rounded-full bg-[var(--lp-accent)] shrink-0 animate-[pulse-ring_2s_infinite]"></span>
                    <div className="w-[26px] h-[26px] rounded-[8px] flex items-center justify-center shrink-0 bg-[var(--lp-violet-dim)] text-[var(--lp-violet)]"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 3.5A1.5 1.5 0 013 2h7a1.5 1.5 0 011.5 1.5v3a1.5 1.5 0 01-1.5 1.5H4.5L2 10.5v-2H3a1.5 1.5 0 01-1.5-1.5v-3z" stroke="currentColor" strokeWidth="1.2"/></svg></div>
                    <div className="text-[12px] text-[var(--lp-ink-dim)]"><b className="text-[var(--lp-ink)] font-semibold">Sasha</b> mentioned you in #design</div>
                    <span className="ml-auto font-mono text-[10px] text-[var(--lp-ink-faint)] whitespace-nowrap">14m</span>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="relative py-[130px]">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-7">
            <Reveal className="max-w-[600px]">
              <span className="inline-flex items-center gap-[8px] font-mono text-[12px] text-[var(--lp-violet)] tracking-widest uppercase before:content-[''] before:w-[14px] before:h-[1px] before:bg-[var(--lp-violet)]">How it works</span>
              <h2 className="font-serif font-normal text-[clamp(2rem,4vw,3rem)] leading-[1.1] tracking-tight mt-[18px]">From signup to shipping in three steps.</h2>
              <p className="text-[16px] leading-[1.7] text-[var(--lp-ink-dim)] mt-[18px] max-w-[480px]">This is a real sequence — each step unlocks the next, the same way it works inside the app.</p>
            </Reveal>

            <HowItWorksTimeline />
          </div>
        </section>

        <TestimonialCarousel />

        {/* FAQ */}
        <section id="faq" className="relative py-[130px]">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-7 flex flex-col items-center">
            <Reveal className="text-center max-w-[600px]">
              <h2 className="font-serif font-normal text-[clamp(2rem,4vw,3rem)] leading-[1.1] tracking-tight">Questions, answered.</h2>
            </Reveal>
            
            <div className="w-full max-w-[760px] mt-[60px]">
              {[
                { q: "How does Flowfoundry actually work?", a: "Create a workspace, invite your team, then build projects and boards. Add tasks, assign owners, set due dates, and drag cards across To Do, In Progress, and Done. Everything updates live, and conversations stay in built-in workspace chat right next to the work." },
                { q: "Does it work on mobile?", a: "Flowfoundry is fully responsive and works beautifully in any mobile browser, so your team can stay in sync from anywhere." },
                { q: "Can I export my data?", a: "Absolutely. You own your data and can export all of your workspaces, tasks, and conversations at any time." },
                { q: "How secure is my data?", a: "Your data is protected with encryption in transit and at rest, with automatic backups and strict per-workspace access controls." }
              ].map((faq, i) => (
                <FAQItem key={i} q={faq.q} a={faq.a} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="text-center py-[140px] relative overflow-hidden">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(201,255,61,0.1),transparent_70%)] z-0 animate-[cta-pulse_4s_ease-in-out_infinite]"></div>
          <Reveal className="relative z-10 px-5">
            <h2 className="font-serif font-normal text-[clamp(2.2rem,5vw,3.6rem)] tracking-tight leading-[1.08]">Ready to find your flow?</h2>
            <p className="text-[16px] text-[var(--lp-ink-dim)] mt-[20px] mx-auto max-w-[440px]">Bring your team, your boards, and every client update into one calm, real-time workspace.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-[14px] mt-[38px]">
              <Link href="/register" className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-[26px] py-[14px] rounded-[10px] text-[14.5px] font-semibold text-[#06140a] bg-[var(--lp-accent)] hover:-translate-y-[2px] hover:shadow-[0_8px_28px_rgba(201,255,61,0.28)] transition-all">Get started <span className="opacity-70">→</span></Link>
            </div>
            <div className="flex items-center justify-center gap-[22px] mt-[30px] flex-wrap">
              <span className="flex items-center gap-[7px] text-[12.5px] text-[var(--lp-ink-faint)] font-mono"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[var(--lp-accent)]"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> Real-time boards</span>
              <span className="flex items-center gap-[7px] text-[12.5px] text-[var(--lp-ink-faint)] font-mono"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[var(--lp-accent)]"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> Built-in workspace chat</span>
              <span className="flex items-center gap-[7px] text-[12.5px] text-[var(--lp-ink-faint)] font-mono"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[var(--lp-accent)]"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> Live for the whole team</span>
            </div>
          </Reveal>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-[var(--lp-border)] pt-[64px] pb-[36px]">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-7">
            <div className="flex justify-between gap-[60px] flex-wrap pb-[48px] border-b border-[var(--lp-border)]">
              <div>
                <a href="#" className="flex items-center gap-[9px] text-[19px] font-semibold tracking-tight text-[var(--lp-ink)]">
                  <Workflow className="w-[22px] h-[22px] text-[var(--lp-accent)]" />
                  <span>Flow<span className="font-bold">foundry</span></span>
                </a>
                <p className="text-[13.5px] text-[var(--lp-ink-faint)] mt-[14px] max-w-[280px] leading-[1.6]">The all-in-one project management platform built for modern teams.</p>
              </div>
              <div className="flex gap-[64px] flex-wrap">
                <div>
                  <h5 className="text-[12px] uppercase tracking-widest text-[var(--lp-ink-faint)] font-mono mb-[16px]">Product</h5>
                  <a href="#features" className="block text-[13.5px] text-[var(--lp-ink-dim)] mb-[12px] hover:text-[var(--lp-accent)] transition-colors">Features</a>
                  <a href="#how" className="block text-[13.5px] text-[var(--lp-ink-dim)] mb-[12px] hover:text-[var(--lp-accent)] transition-colors">How it works</a>
                  <a href="#faq" className="block text-[13.5px] text-[var(--lp-ink-dim)] mb-[12px] hover:text-[var(--lp-accent)] transition-colors">FAQ</a>
                </div>
                <div>
                  <h5 className="text-[12px] uppercase tracking-widest text-[var(--lp-ink-faint)] font-mono mb-[16px]">Resources</h5>
                  <a href="#faq" className="block text-[13.5px] text-[var(--lp-ink-dim)] mb-[12px] hover:text-[var(--lp-accent)] transition-colors">Help center</a>
                  <a href="#" className="block text-[13.5px] text-[var(--lp-ink-dim)] mb-[12px] hover:text-[var(--lp-accent)] transition-colors">Documentation</a>
                  <a href="#" className="block text-[13.5px] text-[var(--lp-ink-dim)] mb-[12px] hover:text-[var(--lp-accent)] transition-colors">Blog</a>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center flex-wrap gap-[16px] pt-[28px] text-[12.5px] text-[var(--lp-ink-faint)] font-mono">
              <div>© {new Date().getFullYear()} Flowfoundry. All rights reserved.</div>
              <div className="flex gap-4">
                <a href="#" className="hover:text-[var(--lp-ink)] transition-colors">Privacy</a>
                <a href="#" className="hover:text-[var(--lp-ink)] transition-colors">Terms</a>
              </div>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}

// Simple FAQ Component
function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Reveal delay={index * 0.1}>
      <div className="border-b border-[var(--lp-border)]">
        <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-[20px] py-[24px] px-1 bg-transparent border-none cursor-pointer text-left text-[var(--lp-ink)] text-[16px] font-medium font-sans">
          <span>{q}</span>
          <span className={`w-[26px] h-[26px] rounded-full shrink-0 border border-[var(--lp-border-strong)] flex items-center justify-center text-[var(--lp-accent)] transition-all duration-300 relative ${open ? "bg-[var(--lp-accent-dim)] rotate-180" : ""}`}>
            <span className="absolute bg-current w-[9px] h-[1.4px]"></span>
            <span className={`absolute bg-current w-[1.4px] h-[9px] transition-opacity duration-250 ${open ? "opacity-0" : "opacity-100"}`}></span>
          </span>
        </button>
        <div className="overflow-hidden transition-all duration-400 ease-[cubic-bezier(.16,1,.3,1)]" style={{ maxHeight: open ? "200px" : "0" }}>
          <p className="px-1 pb-[24px] text-[14.5px] leading-[1.7] text-[var(--lp-ink-dim)] max-w-[600px]">{a}</p>
        </div>
      </div>
    </Reveal>
  );
}
