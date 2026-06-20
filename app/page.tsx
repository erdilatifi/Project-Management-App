"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Workflow, Star, ArrowRight,
  LayoutDashboard, Users
} from "lucide-react";

/* Constants for Theme */
const ACCENT = "#14B8A6";
const BORDER = "rgba(255,255,255,0.08)";
const BORDER_STRONG = "rgba(255,255,255,0.12)";
const ACCENT_SOFT = "rgba(20,184,166,0.14)";
const ACCENT_LINE = "rgba(20,184,166,0.26)";

// Common Reveal Component
function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.7s cubic-bezier(0.25,0.46,0.45,0.94) ${delay}s, transform 0.7s cubic-bezier(0.25,0.46,0.45,0.94) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: React.ReactNode; subtitle: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2
        className="font-semibold text-white/90"
        style={{ fontSize: "clamp(1.75rem,3.8vw,2.8rem)", lineHeight: 1.12, letterSpacing: "-0.03em" }}
      >
        {title}
      </h2>
      <p className="mx-auto mt-4 max-w-lg text-[15px] leading-[1.65] text-zinc-500">
        {subtitle}
      </p>
    </div>
  );
}

function MiniField({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div
      className={`rounded-[16px] border px-3 py-2.5 ${wide ? "sm:col-span-2" : ""}`}
      style={{ borderColor: BORDER, background: "rgba(255,255,255,0.03)" }}
    >
      <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-white/38">
        {label}
      </p>
      <p className="mt-1 text-[11px] font-medium text-white/88">{value}</p>
    </div>
  );
}

function StepPreviewCard({
  eyebrow, title, description, active, cardTransform, children, className = "",
}: {
  eyebrow: string; title: string; description: string; active: 1 | 2 | 3; cardTransform: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <div
        className="overflow-hidden rounded-[28px] border p-4 sm:p-5"
        style={{
          transform: cardTransform,
          transformOrigin: "center top",
          borderColor: BORDER,
          background: "rgba(10,12,16,0.96)",
          boxShadow: "0 24px 72px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.03)",
          backdropFilter: "blur(18px)",
          willChange: "transform",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-teal-300/90">
              {eyebrow}
            </p>
            <h3 className="mt-2 text-[21px] font-semibold tracking-[-0.05em] text-white sm:text-[24px]">
              {title}
            </h3>
          </div>
          <div className="flex gap-1.5 pt-1">
            {[1, 2, 3].map((item) => (
              <span
                key={item}
                className="h-1.5 rounded-full"
                style={{
                  width: item === active ? 22 : 8,
                  background: item <= active ? ACCENT : "rgba(255,255,255,0.12)",
                }}
              />
            ))}
          </div>
        </div>
        <p className="mt-2.5 max-w-90 text-[12px] leading-5 text-white/48">
          {description}
        </p>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function HeroFlow() {
  const [activeStep, setActiveStep] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let fired = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fired) {
          fired = true;
          observer.disconnect();
          const t1 = setTimeout(() => setActiveStep(1), 300);
          const t2 = setTimeout(() => setActiveStep(2), 1600);
          const t3 = setTimeout(() => setActiveStep(3), 2900);
          return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
        }
      },
      { threshold: 0.55 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const stepOne = (
    <StepPreviewCard
      eyebrow="Step 1" title="Create a Workspace" description="Set up your team's environment in seconds."
      active={1} cardTransform="perspective(1800px) rotateX(16deg) rotateY(-18deg) scale(0.82)"
      className="w-full lg:w-86.25"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <MiniField label="Workspace Name" value="Marketing Team" wide />
        <MiniField label="URL Slug" value="flowfoundry.app/marketing" wide />
      </div>
      <div className="mt-3 rounded-[18px] border p-3.5" style={{ borderColor: BORDER, background: "rgba(255,255,255,0.03)" }}>
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/38">Workspace Type</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {["Development", "Marketing", "Design"].map((type) => (
            <span key={type} className="rounded-full border px-2.5 py-1 text-[10px] text-white/72"
              style={{
                borderColor: type === "Marketing" ? ACCENT_LINE : BORDER,
                background: type === "Marketing" ? ACCENT_SOFT : "rgba(255,255,255,0.02)",
              }}>
              {type}
            </span>
          ))}
        </div>
      </div>
    </StepPreviewCard>
  );

  const stepTwo = (
    <StepPreviewCard
      eyebrow="Step 2" title="Organize Tasks" description="Visual Kanban boards make tracking progress effortless."
      active={2} cardTransform="perspective(1800px) rotateX(12deg) rotateY(16deg) scale(0.78)"
      className="w-full lg:w-97.5"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <MiniField label="To Do" value="12 tasks" />
        <MiniField label="In Progress" value="4 tasks" />
        <MiniField label="Done" value="8 tasks" />
      </div>
      <div className="mt-3 rounded-[18px] border p-3" style={{ borderColor: BORDER, background: "rgba(255,255,255,0.03)" }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold text-white/92">Active Sprint</p>
            <p className="mt-1 text-[10px] text-white/42">March 20th - April 3rd</p>
          </div>
          <span className="rounded-full border px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-white/40" style={{ borderColor: BORDER }}>
            On Track
          </span>
        </div>
        <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
          <MiniField label="Priority" value="High" />
          <MiniField label="Assignees" value="3 Members" />
        </div>
      </div>
    </StepPreviewCard>
  );

  const stepThree = (
    <StepPreviewCard
      eyebrow="Step 3" title="Invite the Team" description="Bring everyone together with role-based access."
      active={3} cardTransform="perspective(1800px) rotateX(8deg) rotateY(0deg) scale(0.74)"
      className="w-full lg:w-107.5"
    >
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/38">Member Roles</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {["Owner", "Admin", "Member"].map((role) => {
            const active = role === "Admin";
            return (
              <div key={role} className="rounded-[16px] border px-2.5 py-2.5"
                style={{
                  borderColor: active ? `${ACCENT}55` : BORDER,
                  background: active ? `${ACCENT}14` : "rgba(255,255,255,0.02)",
                  boxShadow: active ? `0 0 0 1px ${ACCENT}30 inset` : "none",
                }}>
                <p className="text-[11px] font-semibold text-white/92">{role}</p>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3 rounded-[16px] border px-3.5 py-2.5" style={{ borderColor: BORDER, background: "rgba(255,255,255,0.03)" }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold text-white/92">Invite via link</p>
            <p className="mt-1 text-[10px] text-white/42">Anyone with the link can join as a Member</p>
          </div>
        </div>
      </div>
      <div className="mt-3.5 flex items-center justify-between gap-3">
        <button type="button" className="rounded-[15px] border px-3.5 py-2 text-[11px] font-medium text-white/72" style={{ borderColor: BORDER, background: "rgba(255,255,255,0.02)" }}>Back</button>
        <Button asChild className="rounded-[15px] px-3.5 py-2 text-[11px] font-semibold h-8" style={{ background: ACCENT }}>
          <Link href="/login">Go to Workspace</Link>
        </Button>
      </div>
    </StepPreviewCard>
  );

  return (
    <>
      <div className="mt-8 space-y-3 lg:hidden">
        <motion.div whileHover={{ y: -2 }}><div>{stepOne}</div></motion.div>
        <motion.div whileHover={{ y: -2 }}><div>{stepTwo}</div></motion.div>
        <motion.div whileHover={{ y: -2 }}><div>{stepThree}</div></motion.div>
      </div>
      <div id="hero-flow" ref={containerRef} className="relative mt-8 hidden h-140 lg:block">
        <div className="absolute -top-6 left-1/2 flex -translate-x-1/2 items-center gap-2">
          {[1, 2, 3].map((n) => (
            <motion.div key={n} className="h-0.5 rounded-full"
              animate={{
                width: activeStep >= n ? 28 : 8,
                background: activeStep >= n ? "rgba(20,184,166,0.9)" : "rgba(255,255,255,0.12)",
                opacity: activeStep >= n ? 1 : 0.5,
              }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          ))}
        </div>
        {activeStep >= 1 && (
          <motion.div key="card1" className="absolute right-[8%] top-6 z-10"
            style={{ willChange: "transform, opacity" }}
            initial={{ opacity: 0, x: 48, y: -16, scale: 0.94 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }} whileHover={{ y: -5 }}>
            {stepOne}
          </motion.div>
        )}
        {activeStep >= 2 && (
          <motion.div key="card2" className="absolute left-[6%] top-23 z-20"
            style={{ willChange: "transform, opacity" }}
            initial={{ opacity: 0, x: -48, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }} whileHover={{ y: -5 }}>
            {stepTwo}
          </motion.div>
        )}
        {activeStep >= 3 && (
          <motion.div key="card3" className="absolute left-1/2 top-33 z-30 -translate-x-1/2"
            style={{ willChange: "transform, opacity" }}
            initial={{ opacity: 0, y: 40, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }} whileHover={{ y: -5 }}>
            {stepThree}
          </motion.div>
        )}
      </div>
    </>
  );
}

const FAQ_ITEMS = [
  { q: "Is Flowfoundry really free?", a: "Yes. Our core features including unlimited workspaces and team members are completely free forever." },
  { q: "Do you have mobile apps?", a: "Flowfoundry is fully responsive and works beautifully on all mobile browsers as a progressive web app." },
  { q: "Can I export my data?", a: "Yes. You can export all your workspace data, tasks, and conversations at any time." },
  { q: "How secure is my data?", a: "We use enterprise-grade encryption for data at rest and in transit. Your data is backed up daily." },
];

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Reveal delay={index * 0.05}>
      <motion.div className="group border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-start justify-between gap-6 py-5 text-left">
          <span className="text-[14.5px] font-semibold text-white/90 leading-snug">{q}</span>
          <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.25 }}
            className="mt-0.5 shrink-0 flex h-5 w-5 items-center justify-center rounded-full text-teal-400"
            style={{ background: open ? "rgba(20,184,166,0.15)" : "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="none">
              <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </motion.span>
        </button>
        <motion.div initial={false} animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }} transition={{ duration: 0.3, ease: "easeInOut" }} className="overflow-hidden">
          <p className="pb-5 text-[13.5px] leading-6 text-zinc-400">{a}</p>
        </motion.div>
      </motion.div>
    </Reveal>
  );
}

function FAQSection() {
  return (
    <section id="faq" className="relative overflow-hidden py-20 lg:py-32" style={{ background: "#08090d" }}>
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 0.65px, transparent 0.65px)",
        backgroundSize: "26px 26px",
        maskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, rgba(0,0,0,0.9) 0%, transparent 100%)",
      }} />
      <div className="relative z-10 mx-auto max-w-2xl px-5 lg:px-8">
        <Reveal>
          <SectionHeader
            title={<>Questions <span style={{ backgroundImage: "linear-gradient(90deg,#5eead4,#14b8a6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>answered clearly.</span></>}
            subtitle="Everything you need to know about Flowfoundry."
          />
        </Reveal>
        <div className="mt-14">
          {FAQ_ITEMS.map(({ q, a }, i) => (
            <FAQItem key={q} q={q} a={a} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Page() {
  return (
    <div className="relative text-foreground overflow-hidden" style={{ background: "#08090d", minHeight: "100vh" }}>
      
      {/* Dynamic Hero Section */}
      <header className="relative pt-24 pb-10 sm:pt-32 lg:pt-40 lg:pb-20 border-b" style={{ borderColor: BORDER }}>
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <Reveal>
              <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium shadow-lg"
                style={{ borderColor: BORDER, background: "rgba(255,255,255,0.03)" }}>
                <Star className="h-4 w-4" style={{ color: ACCENT }} />
                <span className="text-zinc-400">Trusted by 10,000+ teams worldwide</span>
              </div>
              <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-7xl leading-tight text-white/90">
                Ship projects 2× faster.
                <br />
                <span style={{ backgroundImage: "linear-gradient(90deg,#5eead4,#14b8a6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  Zero learning curve.
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-zinc-400">
                The project management tool your team will actually love. Real-time collaboration, beautiful design, and powerful features that stay out of your way.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button asChild size="lg" className="h-12 px-8 text-base shadow-xl border-0 text-slate-950 font-semibold" style={{ background: ACCENT }}>
                  <Link href="/login">Start for free <ArrowRight className="ml-2 h-5 w-5" /></Link>
                </Button>
              </div>
            </Reveal>
            <HeroFlow />
          </div>
        </div>
      </header>

      {/* Feature Highlight Cards */}
      <section className="py-20 lg:py-32 relative">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <Reveal>
            <SectionHeader title="Built for speed, designed for clarity" subtitle="Powerful features that stay out of your way." />
          </Reveal>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { icon: Workflow, title: "Workspace Management", desc: "Create unlimited workspaces for different teams. Organize projects and invite members effortlessly." },
              { icon: LayoutDashboard, title: "Project Boards", desc: "Visual kanban boards with drag-and-drop task management. Track progress at a glance." },
              { icon: Users, title: "Team Collaboration", desc: "Invite team members, assign roles, and collaborate in real-time across workspaces." }
            ].map((f, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <Card className="h-full border bg-card/50 backdrop-blur-sm" style={{ borderColor: BORDER, background: "rgba(255,255,255,0.02)" }}>
                  <CardContent className="p-6 h-full flex flex-col">
                    <div className="mb-4 inline-flex rounded-2xl p-3" style={{ background: ACCENT_SOFT, border: `1px solid ${ACCENT_LINE}` }}>
                      <f.icon className="h-6 w-6" style={{ color: ACCENT }} />
                    </div>
                    <h3 className="mb-2 text-xl font-semibold text-white/90">{f.title}</h3>
                    <p className="text-sm leading-relaxed text-zinc-400">{f.desc}</p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <FAQSection />

      {/* Footer */}
      <footer className="w-full border-t py-12" style={{ borderColor: BORDER, background: "#0a0c10" }}>
        <div className="mx-auto max-w-7xl px-5 lg:px-8 text-center text-sm text-zinc-500">
          <p>© {new Date().getFullYear()} Flowfoundry. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
