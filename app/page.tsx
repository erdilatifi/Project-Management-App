"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useInView } from "framer-motion";
import { Workflow } from "lucide-react";

// Helper for revealing elements on scroll
function Reveal({ children, className = "", delay = 0, style = {} }: { children: React.ReactNode; className?: string; delay?: number; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.8s cubic-bezier(.16,1,.3,1) ${delay}s, transform 0.8s cubic-bezier(.16,1,.3,1) ${delay}s`,
        ...style
      }}
    >
      {children}
    </div>
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

  // For the infinite tape, duplicate the content so it loops smoothly
  const tapeItems = [
    { name: "Priya", action: "moved a task", project: "Redesign" },
    { name: "Theo", action: "commented on", project: "Marketing Site" },
    { name: "Sasha", action: "created workspace", project: "Engineering" },
    { name: "Maya", action: "invited", project: "Alex" },
    { name: "Alex", action: "completed", project: "Q3 Planning" },
  ];
  // Duplicate a few times to ensure the marquee covers the screen
  const marqueeItems = [...tapeItems, ...tapeItems, ...tapeItems, ...tapeItems];

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
        <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 border-b ${scrolled ? "bg-[#050607]/80 backdrop-blur-md border-[var(--lp-border)]" : "border-transparent bg-transparent"}`}>
          <div className="mx-auto max-w-[1180px] px-4 sm:px-7 py-3 sm:py-[18px] flex items-center justify-between">
            <Link href="/" className="flex items-center gap-[9px] text-[16px] sm:text-[19px] font-semibold tracking-tight text-[var(--lp-ink)]">
              <Workflow className="w-[22px] h-[22px] text-[var(--lp-accent)]" />
              <span>Flow<span className="font-bold">foundry</span></span>
              <span className="hidden sm:inline-block font-mono text-[10.5px] text-[var(--lp-accent)] border border-[var(--lp-accent-line)] bg-[var(--lp-accent-dim)] px-2 py-[3px] rounded-full ml-1.5 tracking-wider">FREE</span>
            </Link>
            <div className="hidden md:flex items-center gap-9 text-[13.5px] text-[var(--lp-ink-dim)]">
              <a href="#problem" className="hover:text-[var(--lp-ink)] transition-colors">Why Flowfoundry</a>
              <a href="#features" className="hover:text-[var(--lp-ink)] transition-colors">Features</a>
              <a href="#how" className="hover:text-[var(--lp-ink)] transition-colors">How it works</a>
              <a href="#faq" className="hover:text-[var(--lp-ink)] transition-colors">FAQ</a>
            </div>
            <div className="flex items-center gap-3 sm:gap-[18px]">
              <Link href="/login" className="hidden sm:inline-flex items-center gap-2 px-4 py-[9px] sm:px-[20px] sm:py-[10px] rounded-[9px] text-[12.5px] sm:text-[13.5px] font-semibold text-[var(--lp-ink-dim)] border border-[var(--lp-border)] bg-white/5 hover:bg-white/10 hover:text-[var(--lp-ink)] hover:border-[var(--lp-border-strong)] transition-all">Sign in</Link>
              <Link href="/register" className="inline-flex items-center gap-2 px-4 py-[9px] sm:px-[20px] sm:py-[10px] rounded-[9px] text-[12.5px] sm:text-[13.5px] font-semibold text-[#06140a] bg-[var(--lp-accent)] hover:-translate-y-[2px] hover:shadow-[0_8px_28px_rgba(201,255,61,0.28)] transition-all">Start for free</Link>
            </div>
          </div>
        </nav>

        {/* HERO */}
        <header className="relative pt-[160px] overflow-hidden">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-7">
            <Reveal className="max-w-[760px] mx-auto text-center">
              <span className="inline-flex items-center gap-2 border border-[var(--lp-border-strong)] bg-white/5 pr-[14px] pl-[8px] py-[7px] rounded-full text-[12.5px] text-[var(--lp-ink-dim)] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--lp-accent)] animate-[pulse-ring_2.2s_infinite]"></span> 
                100% free and open-source, forever
              </span>
              <h1 className="font-serif font-normal text-[clamp(2.6rem,6vw,4.6rem)] leading-[1.04] tracking-tight my-[26px] text-[var(--lp-ink)]">
                Project management,<br/>
                <em className="not-italic font-light text-transparent bg-clip-text animate-[gradient-flow_6s_ease-in-out_infinite]" style={{
                  backgroundImage: "linear-gradient(100deg, var(--lp-accent) 10%, #eaffb0 50%, var(--lp-accent) 90%)",
                  backgroundSize: "200% auto"
                }}>without the catch.</em>
              </h1>
              <p className="text-[17px] leading-[1.65] text-[var(--lp-ink-dim)] max-w-[540px] mx-auto">
                Real-time kanban boards, workspace chat, and team collaboration — built on Next.js and Supabase. No pricing tiers, no seat limits, no credit card.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-[14px] mt-[38px] px-1 sm:px-0">
                <Link href="/register" className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-[26px] py-[14px] rounded-[10px] text-[14.5px] font-semibold text-[#06140a] bg-[var(--lp-accent)] hover:-translate-y-[2px] hover:shadow-[0_8px_28px_rgba(201,255,61,0.28)] transition-all">Start for free <span className="opacity-70">→</span></Link>
                <a href="#how" className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-[26px] py-[14px] rounded-[10px] text-[14.5px] font-semibold text-[var(--lp-ink-dim)] border border-[var(--lp-border)] bg-white/5 hover:bg-white/10 hover:text-[var(--lp-ink)] hover:border-[var(--lp-border-strong)] transition-all">Watch the demo</a>
              </div>
              <div className="flex items-center justify-center gap-2.5 mt-[22px] text-[12.5px] text-[var(--lp-ink-faint)] font-mono flex-wrap">
                <span className="text-[var(--lp-accent)] tracking-widest">★★★★★</span>
                <span>Open source on GitHub</span>
                <span className="opacity-40">·</span>
                <span>MIT licensed</span>
                <span className="opacity-40">·</span>
                <span>Unlimited workspaces</span>
              </div>
            </Reveal>
          </div>

          <Reveal className="relative mt-[60px] border-y border-[var(--lp-border)] bg-white/5 overflow-hidden" delay={0.2}>
            <div className="absolute top-0 bottom-0 left-0 w-[120px] bg-gradient-to-r from-[var(--lp-bg)] to-transparent z-10 pointer-events-none"></div>
            <div className="absolute top-0 bottom-0 right-0 w-[120px] bg-gradient-to-l from-[var(--lp-bg)] to-transparent z-10 pointer-events-none"></div>
            <div className="flex w-max animate-[scroll-left_42s_linear_infinite]">
              {marqueeItems.map((item, i) => (
                <div key={i} className="flex items-center gap-[9px] px-[26px] py-[13px] font-mono text-[12.5px] text-[var(--lp-ink-dim)] border-r border-[var(--lp-border)] whitespace-nowrap">
                  <div className="w-4 h-4 rounded-[5px] shrink-0" style={{ background: `linear-gradient(135deg, ${i%2==0 ? 'var(--lp-accent)' : 'var(--lp-violet)'}, ${i%2==0 ? '#8fc92a' : '#5a4fc4'})` }}></div>
                  <span className="font-medium text-[var(--lp-ink)]">{item.name}</span>
                  <span className="text-[var(--lp-ink-faint)]">{item.action}</span>
                  <span className={i%2==0 ? "text-[var(--lp-accent)]" : "text-[var(--lp-violet)]"}>{item.project}</span>
                </div>
              ))}
            </div>
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
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-[16px] p-[22px]">
                {/* Column 1 */}
                <div className="min-h-[380px]">
                  <div className="flex items-center justify-between px-1 pb-[12px]">
                    <div className="flex items-center gap-[8px] text-[12.5px] font-semibold text-[var(--lp-ink-dim)]">
                      <span className="w-[7px] h-[7px] rounded-full bg-[var(--lp-ink-faint)]"></span>To Do
                    </div>
                    <span className="font-mono text-[11px] text-[var(--lp-ink-faint)] bg-white/5 px-[7px] py-[2px] rounded-full">3</span>
                  </div>
                  <div className="min-h-[300px] rounded-[14px] border border-dashed border-[var(--lp-border)] p-[8px] flex flex-col gap-[8px] bg-white/5">
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
                    <div className="border border-[var(--lp-border)] rounded-[11px] bg-[#14171b]/90 p-[12px_13px] hover:border-[var(--lp-border-strong)] transition-colors cursor-grab">
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
                </div>
                
                {/* Column 2 */}
                <div className="min-h-[380px]">
                  <div className="flex items-center justify-between px-1 pb-[12px]">
                    <div className="flex items-center gap-[8px] text-[12.5px] font-semibold text-[var(--lp-ink-dim)]">
                      <span className="w-[7px] h-[7px] rounded-full bg-[var(--lp-violet)]"></span>In Progress
                    </div>
                    <span className="font-mono text-[11px] text-[var(--lp-ink-faint)] bg-white/5 px-[7px] py-[2px] rounded-full">2</span>
                  </div>
                  <div className="min-h-[300px] rounded-[14px] border border-dashed border-[var(--lp-border)] p-[8px] flex flex-col gap-[8px] bg-white/5">
                    <div className="border border-[var(--lp-border)] rounded-[11px] bg-[#14171b]/90 p-[12px_13px] hover:border-[var(--lp-border-strong)] transition-colors cursor-grab">
                      <div className="flex items-center justify-between gap-[8px]"><span className="font-mono text-[9.5px] font-semibold px-[6px] py-[2px] rounded-[5px] tracking-wider text-[#ffb84d] bg-[#ffb84d]/10">P2</span></div>
                      <div className="text-[12.5px] text-[var(--lp-ink)] mt-[9px] leading-[1.4] font-medium">Build kanban drag-and-drop</div>
                      <div className="flex items-center justify-between mt-[11px]">
                        <div className="flex"><div className="w-[19px] h-[19px] rounded-full border-[1.5px] border-[#14171b] bg-gradient-to-br from-[var(--lp-accent)] to-[#8fc92a]"></div></div>
                        <span className="font-mono text-[9.5px] text-[var(--lp-amber)] flex items-center gap-[4px]">Due today</span>
                      </div>
                    </div>
                    <div className="h-0 opacity-0 border border-dashed border-[var(--lp-border-strong)] rounded-[11px] bg-[var(--lp-accent)]/5 transition-all duration-300"></div>
                    <div className="border border-[var(--lp-border)] rounded-[11px] bg-[#14171b]/90 p-[12px_13px] hover:border-[var(--lp-border-strong)] transition-colors cursor-grab">
                      <div className="flex items-center justify-between gap-[8px]"><span className="font-mono text-[9.5px] font-semibold px-[6px] py-[2px] rounded-[5px] tracking-wider text-[var(--lp-violet)] bg-[var(--lp-violet-dim)]">P3</span></div>
                      <div className="text-[12.5px] text-[var(--lp-ink)] mt-[9px] leading-[1.4] font-medium">Set up real-time subscriptions</div>
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
                    <span className="font-mono text-[11px] text-[var(--lp-ink-faint)] bg-white/5 px-[7px] py-[2px] rounded-full">2</span>
                  </div>
                  <div className="min-h-[300px] rounded-[14px] border border-dashed border-[var(--lp-border)] p-[8px] flex flex-col gap-[8px] bg-white/5">
                    <div className="border border-[var(--lp-border)] rounded-[11px] bg-[#14171b]/90 p-[12px_13px] hover:border-[var(--lp-border-strong)] transition-colors cursor-grab">
                      <div className="flex items-center justify-between gap-[8px]"><span className="font-mono text-[9.5px] font-semibold px-[6px] py-[2px] rounded-[5px] tracking-wider text-[var(--lp-violet)] bg-[var(--lp-violet-dim)]">P3</span></div>
                      <div className="text-[12.5px] text-[var(--lp-ink)] mt-[9px] leading-[1.4] font-medium">Supabase auth integration</div>
                      <div className="flex items-center justify-between mt-[11px]">
                        <div className="flex"><div className="w-[19px] h-[19px] rounded-full border-[1.5px] border-[#14171b] bg-gradient-to-br from-[var(--lp-violet)] to-[#5a4fc4]"></div></div>
                        <span className="font-mono text-[9.5px] text-[var(--lp-ink-faint)] flex items-center gap-[4px]">Completed</span>
                      </div>
                    </div>
                    <div className="border border-[var(--lp-border)] rounded-[11px] bg-[#14171b]/90 p-[12px_13px] hover:border-[var(--lp-border-strong)] transition-colors cursor-grab">
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

        <section className="pt-[70px]">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-7 text-center">
            <Reveal>
              <p className="font-mono text-[11.5px] text-[var(--lp-ink-faint)] tracking-[0.1em] uppercase">Built in the open, with</p>
              <div className="flex items-center justify-center gap-6 sm:gap-[56px] flex-wrap mt-[50px] opacity-55">
                <span className="font-serif italic text-[19px] text-[var(--lp-ink-dim)]">Next.js</span>
                <span className="font-serif italic text-[19px] text-[var(--lp-ink-dim)]">Supabase</span>
                <span className="font-serif italic text-[19px] text-[var(--lp-ink-dim)]">TypeScript</span>
                <span className="font-serif italic text-[19px] text-[var(--lp-ink-dim)]">Tailwind</span>
                <span className="font-serif italic text-[19px] text-[var(--lp-ink-dim)]">shadcn/ui</span>
              </div>
            </Reveal>
          </div>
        </section>

        {/* PROBLEM */}
        <section id="problem" className="relative py-[130px]">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-7">
            <Reveal className="max-w-[600px]">
              <span className="inline-flex items-center gap-[8px] font-mono text-[12px] text-[var(--lp-accent)] tracking-widest uppercase before:content-[''] before:w-[14px] before:h-[1px] before:bg-[var(--lp-accent)]">The problem</span>
              <h2 className="font-serif font-normal text-[clamp(2rem,4vw,3rem)] leading-[1.1] tracking-tight mt-[18px]">Your team's work lives in eight tabs. Your focus lives in none.</h2>
              <p className="text-[16px] leading-[1.7] text-[var(--lp-ink-dim)] mt-[18px] max-w-[480px]">Tasks in one app, chat in another, files somewhere else, and a paid seat for every tool. Stitching it together isn't project management — it's tab management.</p>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-12 md:gap-[60px] items-center mt-[70px]">
              <Reveal className="relative h-[420px] border border-[var(--lp-border)] rounded-[20px] overflow-hidden" style={{ background: "radial-gradient(ellipse at center, rgba(255,93,74,0.06), transparent 65%), rgba(255,255,255,0.012)" }}>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[64px] h-[64px] rounded-full border border-dashed border-[#ff5d4a]/30 flex items-center justify-center animate-[center-pulse_3s_ease-in-out_infinite] after:content-['?'] after:font-serif after:italic after:text-[24px] after:text-[#ff5d4a] after:opacity-60 z-10"></div>
                <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
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
                      stroke="rgba(255,93,74,0.22)"
                      strokeWidth="1"
                      strokeDasharray="3 6"
                      className="animate-[dash-flow_1.6s_linear_infinite]"
                    />
                  ))}
                </svg>
                <div className="absolute top-[10%] left-[8%] border border-[var(--lp-border-strong)] bg-[#0f1215]/90 rounded-[12px] p-[10px_13px] font-mono text-[11px] text-[var(--lp-ink-faint)] flex items-center gap-[7px] animate-[node-drift_6s_ease-in-out_infinite_reverse]"><span className="w-[6px] h-[6px] rounded-full bg-[var(--lp-red)] shrink-0"></span>Trello board</div>
                <div className="absolute top-[14%] right-[8%] border border-[var(--lp-border-strong)] bg-[#0f1215]/90 rounded-[12px] p-[10px_13px] font-mono text-[11px] text-[var(--lp-ink-faint)] flex items-center gap-[7px] animate-[node-drift_6s_ease-in-out_infinite]"><span className="w-[6px] h-[6px] rounded-full bg-[var(--lp-red)] shrink-0"></span>Slack #general</div>
                <div className="absolute bottom-[16%] left-[6%] border border-[var(--lp-border-strong)] bg-[#0f1215]/90 rounded-[12px] p-[10px_13px] font-mono text-[11px] text-[var(--lp-ink-faint)] flex items-center gap-[7px] animate-[node-drift_6s_ease-in-out_infinite_reverse]"><span className="w-[6px] h-[6px] rounded-full bg-[var(--lp-red)] shrink-0"></span>Notion docs</div>
                <div className="absolute bottom-[10%] right-[10%] border border-[var(--lp-border-strong)] bg-[#0f1215]/90 rounded-[12px] p-[10px_13px] font-mono text-[11px] text-[var(--lp-ink-faint)] flex items-center gap-[7px] animate-[node-drift_6s_ease-in-out_infinite]"><span className="w-[6px] h-[6px] rounded-full bg-[var(--lp-red)] shrink-0"></span>Email threads</div>
                <div className="absolute top-[44%] left-[2%] border border-[var(--lp-border-strong)] bg-[#0f1215]/90 rounded-[12px] p-[10px_13px] font-mono text-[11px] text-[var(--lp-ink-faint)] flex items-center gap-[7px] animate-[node-drift_6s_ease-in-out_infinite_reverse]"><span className="w-[6px] h-[6px] rounded-full bg-[var(--lp-red)] shrink-0"></span>Google Sheets</div>
                <div className="absolute top-[50%] right-[0%] border border-[var(--lp-border-strong)] bg-[#0f1215]/90 rounded-[12px] p-[10px_13px] font-mono text-[11px] text-[var(--lp-ink-faint)] flex items-center gap-[7px] animate-[node-drift_6s_ease-in-out_infinite]"><span className="w-[6px] h-[6px] rounded-full bg-[var(--lp-red)] shrink-0"></span>Zoom recordings</div>
              </Reveal>

              <Reveal className="flex flex-col mt-0 md:mt-[36px]">
                <div className="flex gap-[18px] py-[22px] border-t border-[var(--lp-border)]">
                  <div className="font-mono text-[13px] text-[var(--lp-ink-faint)] pt-[2px]">01</div>
                  <div><h4 className="text-[15.5px] font-semibold text-[var(--lp-ink)]">Scattered context</h4><p className="text-[14px] text-[var(--lp-ink-dim)] mt-[6px] leading-[1.6]">The decision happened in Slack, the task lives in Trello, and nobody remembers why.</p></div>
                </div>
                <div className="flex gap-[18px] py-[22px] border-t border-[var(--lp-border)]">
                  <div className="font-mono text-[13px] text-[var(--lp-ink-faint)] pt-[2px]">02</div>
                  <div><h4 className="text-[15.5px] font-semibold text-[var(--lp-ink)]">Per-seat pricing</h4><p className="text-[14px] text-[var(--lp-ink-dim)] mt-[6px] leading-[1.6]">Every new teammate is another line item, until "growing the team" starts to feel like a cost center.</p></div>
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
              <p className="text-[16px] leading-[1.7] text-[var(--lp-ink-dim)] mt-[18px] max-w-[480px]">Flowfoundry brings boards, chat, and notifications into a single real-time workspace — and keeps it free, no matter how big your team gets.</p>
            </Reveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-[18px] mt-[64px]">
              <Reveal className="md:col-span-4 border border-[var(--lp-border)] rounded-[18px] bg-white/5 p-[26px] relative overflow-hidden transition-all duration-300 hover:border-[var(--lp-border-strong)] hover:bg-white/10 hover:-translate-y-[3px]">
                <div className="w-[38px] h-[38px] rounded-[10px] bg-[var(--lp-accent-dim)] border border-[var(--lp-accent-line)] flex items-center justify-center text-[var(--lp-accent)] mb-[18px]">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="10" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="2" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="10" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/></svg>
                </div>
                <h3 className="text-[17px] font-semibold text-[var(--lp-ink)] tracking-tight">Drag-and-drop kanban</h3>
                <p className="text-[13.5px] text-[var(--lp-ink-dim)] leading-[1.65] mt-[8px] max-w-[380px]">Visual boards with To Do, In Progress, and Done columns. Permission-based moves, optimistic updates, and changes that sync to everyone instantly.</p>
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

              <Reveal className="md:col-span-2 border border-[var(--lp-border)] rounded-[18px] bg-white/5 p-[26px] relative overflow-hidden transition-all duration-300 hover:border-[var(--lp-border-strong)] hover:bg-white/10 hover:-translate-y-[3px]" delay={0.1}>
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

              <Reveal className="md:col-span-2 border border-[var(--lp-border)] rounded-[18px] bg-white/5 p-[26px] relative overflow-hidden transition-all duration-300 hover:border-[var(--lp-border-strong)] hover:bg-white/10 hover:-translate-y-[3px]" delay={0.2}>
                <div className="w-[38px] h-[38px] rounded-[10px] bg-[var(--lp-accent-dim)] border border-[var(--lp-accent-line)] flex items-center justify-center text-[var(--lp-accent)] mb-[18px]">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 1.5L15.5 4.5V9C15.5 12.6 12.7 15.5 9 16.5C5.3 15.5 2.5 12.6 2.5 9V4.5L9 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
                </div>
                <h3 className="text-[17px] font-semibold text-[var(--lp-ink)] tracking-tight">Real-time everything</h3>
                <p className="text-[13.5px] text-[var(--lp-ink-dim)] leading-[1.65] mt-[8px] max-w-[380px]">Supabase subscriptions push every change live — no refresh, ever.</p>
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

              <Reveal className="md:col-span-4 border border-[var(--lp-border)] rounded-[18px] bg-white/5 p-[26px] relative overflow-hidden transition-all duration-300 hover:border-[var(--lp-border-strong)] hover:bg-white/10 hover:-translate-y-[3px]" delay={0.3}>
                <div className="w-[38px] h-[38px] rounded-[10px] bg-[var(--lp-violet-dim)] border border-[var(--lp-violet-line)] flex items-center justify-center text-[var(--lp-violet)] mb-[18px]">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M14.5 6.5a5.5 5.5 0 00-11 0c0 4-1.5 5-1.5 5h14s-1.5-1-1.5-5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M7.5 14.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.4"/></svg>
                </div>
                <h3 className="text-[17px] font-semibold text-[var(--lp-ink)] tracking-tight">Smart notifications</h3>
                <p className="text-[13.5px] text-[var(--lp-ink-dim)] leading-[1.65] mt-[8px] max-w-[380px]">Assignments, mentions, and workspace invites — surfaced the moment they happen, with a polling fallback so nothing slips through.</p>
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

            <div className="mt-[80px]">
              {/* Step 1 */}
              <div className="grid grid-cols-[80px_1fr] gap-0">
                <div className="flex flex-col items-center">
                  <div className="w-[38px] h-[38px] rounded-full border border-[var(--lp-accent)] text-[#06140a] bg-[var(--lp-accent)] shadow-[0_0_0_6px_var(--lp-accent-dim)] font-mono text-[13px] flex items-center justify-center shrink-0 transition-all duration-400">1</div>
                  <div className="w-[1px] flex-1 bg-[var(--lp-border)] my-[8px] min-h-[60px] relative overflow-hidden after:content-[''] after:absolute after:left-0 after:-top-[40%] after:w-full after:h-[40%] after:bg-gradient-to-b after:from-transparent after:via-[var(--lp-accent)] after:to-transparent after:animate-[connector-flow_2.4s_linear_infinite] after:opacity-70"></div>
                </div>
                <Reveal className="pl-0 pb-[64px] pl-[28px] sm:pl-[28px]">
                  <h3 className="text-[20px] font-semibold text-[var(--lp-ink)] tracking-tight">Create a workspace, invite your team</h3>
                  <p className="text-[14.5px] text-[var(--lp-ink-dim)] mt-[10px] leading-[1.7] max-w-[480px]">Spin up an unlimited workspace in seconds. Invite teammates by email — no seat limits, no approval queue, no card on file.</p>
                  <div className="mt-[20px] border border-[var(--lp-border)] rounded-[14px] p-[16px] bg-white/5 max-w-[480px]">
                    <div className="flex items-center gap-[10px] flex-wrap">
                      <span className="flex items-center gap-[7px] font-mono text-[11.5px] text-[var(--lp-ink-dim)] border border-[var(--lp-border)] rounded-full px-[12px] py-[6px]"><span className="w-[6px] h-[6px] rounded-full bg-[var(--lp-accent)]"></span>maya@studio.co</span>
                      <span className="flex items-center gap-[7px] font-mono text-[11.5px] text-[var(--lp-ink-dim)] border border-[var(--lp-border)] rounded-full px-[12px] py-[6px]"><span className="w-[6px] h-[6px] rounded-full bg-[var(--lp-accent)]"></span>theo@studio.co</span>
                      <span className="flex items-center gap-[7px] font-mono text-[11.5px] text-[var(--lp-ink-dim)] border border-[var(--lp-border)] rounded-full px-[12px] py-[6px]"><span className="w-[6px] h-[6px] rounded-full bg-[var(--lp-ink-faint)] animate-[pulse-fade_1.6s_ease-in-out_infinite]"></span>sasha@studio.co</span>
                      <span className="flex items-center gap-[7px] font-mono text-[11.5px] text-[var(--lp-ink-faint)] border border-[var(--lp-border)] rounded-full px-[12px] py-[6px]">+ invite more</span>
                    </div>
                  </div>
                </Reveal>
              </div>
              {/* Step 2 */}
              <div className="grid grid-cols-[80px_1fr] gap-0">
                <div className="flex flex-col items-center">
                  <div className="w-[38px] h-[38px] rounded-full border border-[var(--lp-accent)] text-[#06140a] bg-[var(--lp-accent)] shadow-[0_0_0_6px_var(--lp-accent-dim)] font-mono text-[13px] flex items-center justify-center shrink-0 transition-all duration-400">2</div>
                  <div className="w-[1px] flex-1 bg-[var(--lp-border)] my-[8px] min-h-[60px] relative overflow-hidden after:content-[''] after:absolute after:left-0 after:-top-[40%] after:w-full after:h-[40%] after:bg-gradient-to-b after:from-transparent after:via-[var(--lp-accent)] after:to-transparent after:animate-[connector-flow_2.4s_linear_infinite] after:opacity-70" style={{ animationDelay: '1.2s' }}></div>
                </div>
                <Reveal className="pl-0 pb-[64px] pl-[28px] sm:pl-[28px]">
                  <h3 className="text-[20px] font-semibold text-[var(--lp-ink)] tracking-tight">Build the board, assign the work</h3>
                  <p className="text-[14.5px] text-[var(--lp-ink-dim)] mt-[10px] leading-[1.7] max-w-[480px]">Create projects, add tasks, set due dates, and assign them out. Everyone sees the same board, updating in real-time.</p>
                </Reveal>
              </div>
              {/* Step 3 */}
              <div className="grid grid-cols-[80px_1fr] gap-0">
                <div className="flex flex-col items-center">
                  <div className="w-[38px] h-[38px] rounded-full border border-[var(--lp-accent)] text-[#06140a] bg-[var(--lp-accent)] shadow-[0_0_0_6px_var(--lp-accent-dim)] font-mono text-[13px] flex items-center justify-center shrink-0 transition-all duration-400">3</div>
                </div>
                <Reveal className="pl-0 pb-[64px] pl-[28px] sm:pl-[28px]">
                  <h3 className="text-[20px] font-semibold text-[var(--lp-ink)] tracking-tight">Discuss inline, never lose context</h3>
                  <p className="text-[14.5px] text-[var(--lp-ink-dim)] mt-[10px] leading-[1.7] max-w-[480px]">Use the built-in workspace chat to discuss features, share links, and celebrate wins without ever tabbing over to Slack.</p>
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        {/* QUOTE */}
        <section className="border-y border-[var(--lp-border)] bg-white/5 py-[100px]">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-7 flex flex-col items-center text-center">
            <Reveal>
              <div className="font-serif italic text-[80px] text-[var(--lp-accent)] opacity-50 leading-[0.5] h-[40px]">"</div>
              <blockquote className="font-serif font-normal italic text-[clamp(1.5rem,3.2vw,2.3rem)] leading-[1.35] tracking-tight text-[var(--lp-ink)] max-w-[780px]">
                I spent a week trying to convince my team to pay $12/user for another tool. Then we found Flowfoundry. It does exactly what we need, faster, and for free. We moved everything over the same day.
              </blockquote>
              <div className="mt-[28px] flex items-center justify-center gap-[12px]">
                <div className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-[var(--lp-accent)] to-[#6b8a1f]"></div>
                <div className="text-left">
                  <div className="text-[14px] font-semibold text-[var(--lp-ink)]">David K.</div>
                  <div className="text-[12.5px] text-[var(--lp-ink-faint)] mt-[1px]">Lead Developer at Studio42</div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="relative py-[130px]">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-7 flex flex-col items-center">
            <Reveal className="text-center max-w-[600px]">
              <h2 className="font-serif font-normal text-[clamp(2rem,4vw,3rem)] leading-[1.1] tracking-tight">Questions, answered.</h2>
            </Reveal>
            
            <div className="w-full max-w-[760px] mt-[60px]">
              {[
                { q: "Is Flowfoundry really free?", a: "Yes. Our core features including unlimited workspaces and team members are completely free forever. Since it's open source, you can also self-host it." },
                { q: "Do you have mobile apps?", a: "Flowfoundry is fully responsive and works beautifully on all mobile browsers as a progressive web app." },
                { q: "Can I export my data?", a: "Yes. You can export all your workspace data, tasks, and conversations at any time." },
                { q: "How secure is my data?", a: "We use enterprise-grade encryption for data at rest and in transit via Supabase. Your data is backed up daily and secured by RLS." }
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
            <p className="text-[16px] text-[var(--lp-ink-dim)] mt-[20px] mx-auto max-w-[440px]">Join thousands of teams managing their projects without limits.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-[14px] mt-[38px]">
              <Link href="/register" className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-[26px] py-[14px] rounded-[10px] text-[14.5px] font-semibold text-[#06140a] bg-[var(--lp-accent)] hover:-translate-y-[2px] hover:shadow-[0_8px_28px_rgba(201,255,61,0.28)] transition-all">Start for free <span className="opacity-70">→</span></Link>
            </div>
            <div className="flex items-center justify-center gap-[22px] mt-[30px] flex-wrap">
              <span className="flex items-center gap-[7px] text-[12.5px] text-[var(--lp-ink-faint)] font-mono"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[var(--lp-accent)]"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> No credit card required</span>
              <span className="flex items-center gap-[7px] text-[12.5px] text-[var(--lp-ink-faint)] font-mono"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[var(--lp-accent)]"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> Unlimited workspaces</span>
              <span className="flex items-center gap-[7px] text-[12.5px] text-[var(--lp-ink-faint)] font-mono"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[var(--lp-accent)]"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> Cancel anytime</span>
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
                <p className="text-[13.5px] text-[var(--lp-ink-faint)] mt-[14px] max-w-[280px] leading-[1.6]">The open-source project management platform built for modern teams.</p>
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
                  <a href="#" className="block text-[13.5px] text-[var(--lp-ink-dim)] mb-[12px] hover:text-[var(--lp-accent)] transition-colors">GitHub</a>
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
