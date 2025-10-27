'use client';

import { useState, FormEvent, ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Check, Mail, Workflow, Github, Twitter, Linkedin, Sparkles,
  ShieldCheck, Clock, LayoutDashboard, BarChart3, Zap, Star, ArrowRight,
} from 'lucide-react';

/** Utility */
function cn(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(' ');
}

/* =========================================================================
   Layout primitives
   ========================================================================= */
function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto max-w-7xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>;
}

function Section({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn('py-20 sm:py-28', className)}>
      {children}
    </section>
  );
}

function SectionTitle({ eyebrow, title, subtitle, center = true }:
  { eyebrow?: string; title: string; subtitle?: string; center?: boolean }) {
  return (
    <div className={cn('mb-10', center && 'text-center')}>
      {eyebrow && (
        <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{eyebrow}</span>
        </div>
      )}
      <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {subtitle && <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

/* =========================================================================
   Email capture (demo-only)
   ========================================================================= */
function EmailCapture() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      setTimeout(() => {
        setEmail('');
        setSubmitted(false);
      }, 2200);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-md gap-2">
      <div className="relative flex-1">
        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="pl-10"
          disabled={submitted}
          aria-label="Email address"
        />
      </div>
      <Button type="submit" className="h-10 rounded-xl px-6" disabled={submitted}>
        {submitted ? 'Thanks!' : 'Start free'}
      </Button>
    </form>
  );
}

/* =========================================================================
   Cards
   ========================================================================= */
function FeatureCard({ icon: Icon, title, description }:
  { icon: any; title: string; description: string }) {
  return (
    <div className="transition-transform duration-200 hover:-translate-y-0.5">
      <Card className="h-full border-2 transition-all hover:shadow-lg">
        <CardContent className="p-6">
          <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <h3 className="mb-2 text-xl font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border bg-card p-6 text-center">
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function PricingCard({
  name, price, description, features, popular,
}: {
  name: string; price: string; description: string; features: string[]; popular?: boolean;
}) {
  return (
    <div className="h-full transition-all duration-200 hover:-translate-y-0.5">
      <Card className={cn('relative h-full flex flex-col border-2', popular ? 'border-primary shadow-xl' : 'border-border')}>
        {popular && (
          <div className="absolute -top-4 left-0 right-0 mx-auto w-fit">
            <span className="rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground shadow">
              Most Popular
            </span>
          </div>
        )}
        <CardHeader>
          <CardTitle className="text-2xl">{name}</CardTitle>
          <CardDescription className="text-muted-foreground">{description}</CardDescription>
          <div className="mt-4">
            <span className="text-4xl font-bold">{price}</span>
            {price !== 'Free' && <span className="ml-1 text-muted-foreground">/month</span>}
          </div>
        </CardHeader>
        <CardContent className="flex-1">
          <ul className="space-y-3">
            {features.map((feature, i) => (
              <li key={i} className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm text-muted-foreground">{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter>
          <Button className={cn('w-full', popular && 'bg-primary text-primary-foreground hover:bg-primary/90')} variant={popular ? 'default' : 'outline'}>
            Get Started
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function Testimonial({ quote, author, role }: { quote: string; author: string; role: string }) {
  const initials = author.split(' ').map((n) => n[0]).join('').toUpperCase();
  return (
    <div className="h-full transition-all duration-200 hover:-translate-y-0.5">
      <Card className="h-full border-2">
        <CardContent className="p-6">
          <p className="mb-6 text-lg italic text-muted-foreground">“{quote}”</p>
          <div className="flex items-center gap-4">
            <Avatar><AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback></Avatar>
            <div>
              <p className="font-semibold">{author}</p>
              <p className="text-sm text-muted-foreground">{role}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* =========================================================================
   Page
   ========================================================================= */
export default function Page() {
  return (
    <div className="bg-background text-foreground">
      {/* Decorative background */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-grid-slate-100/5 [mask-image:radial-gradient(ellipse_at_center,black,transparent_65%)]"
      />
      {/* HERO */}
      <header className="relative overflow-hidden border-b">
        <Container className="py-24 sm:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>New: Real‑time tasks & notifications</span>
            </div>
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl">
              Flowfoundry — Project Management that actually ships.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-balance text-muted-foreground">
              Plan projects, track tasks, and keep your team aligned with clean workflows,
              instant updates, and a delightful UI. No clutter. Just momentum.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild className="h-11 rounded-xl px-6">
                <Link href="/workspaces">Launch app <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-xl px-6">
                <Link href="#features">See features</Link>
              </Button>
            </div>
            <div className="mt-10">
              <EmailCapture />
            </div>
          </div>

          {/* App mockup */}
          <div className="mt-16">
            <div className="relative mx-auto max-w-5xl overflow-hidden rounded-2xl border bg-card shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
              <div className="aspect-[16/9] w-full">
                <div className="flex h-full items-center justify-center">
                  <div className="grid w-full grid-cols-3 gap-4 p-6 sm:p-8">
                    <div className="col-span-1 space-y-3">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-10 rounded-md border bg-muted/40" />
                      ))}
                    </div>
                    <div className="col-span-2 space-y-4">
                      <div className="h-10 rounded-md border bg-muted/40" />
                      <div className="h-48 rounded-md border bg-muted/40" />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="h-24 rounded-md border bg-muted/40" />
                        <div className="h-24 rounded-md border bg-muted/40" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">UI preview — no real data.</p>
          </div>
        </Container>
      </header>

      {/* Trust logos / metrics */}
      <Section className="bg-muted/40">
        <Container>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat value="2x faster" label="from idea to ship" />
            <Stat value="98.7%" label="on‑time delivery rate" />
            <Stat value="10k+" label="tasks completed each week" />
          </div>
        </Container>
      </Section>

      {/* FEATURES */}
      <Section id="features">
        <Container>
          <SectionTitle
            eyebrow="Do more with less"
            title="Everything you need to move fast"
            subtitle="Opinions baked‑in, but flexible where it matters. Built for clarity, speed, and focus."
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={LayoutDashboard}
              title="Lightning‑fast Kanban"
              description="Create, assign, and drag tasks with optimistic updates and real‑time sync."
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Secure by default"
              description="Role‑based access and tight RLS policies keep your data locked down."
            />
            <FeatureCard
              icon={Clock}
              title="On time, every time"
              description="Due‑today, overdue, and weekly views make it impossible to miss deadlines."
            />
            <FeatureCard
              icon={BarChart3}
              title="Progress you can see"
              description="Beautiful reports and burn‑down charts keep stakeholders aligned."
            />
            <FeatureCard
              icon={Zap}
              title="Automations"
              description="Trigger assignees, labels, and alerts with simple, powerful rules."
            />
            <FeatureCard
              icon={Star}
              title="Delightful UX"
              description="Keyboard‑first, zero‑lag UI that your team will actually enjoy."
            />
          </div>
        </Container>
      </Section>

      {/* PRICING */}
      <Section id="pricing" className="bg-muted/40">
        <Container>
          <SectionTitle
            eyebrow="Straightforward tiers"
            title="Simple, honest pricing"
            subtitle="Start free. Upgrade when your team is ready to scale."
          />
          <div className="grid gap-6 md:grid-cols-3">
            <PricingCard
              name="Starter"
              price="Free"
              description="For solo builders validating projects."
              features={[
                'Unlimited personal projects',
                'Basic tasks & comments',
                'Community support',
              ]}
            />
            <PricingCard
              name="Team"
              price="$12"
              description="Best for growing teams who need structure."
              popular
              features={[
                'Everything in Starter',
                'Workspaces & roles',
                'Notifications & real‑time updates',
                'Due dates & filters',
              ]}
            />
            <PricingCard
              name="Business"
              price="$29"
              description="Advanced control and priority support."
              features={[
                'Everything in Team',
                'Advanced permissions',
                'Audit logs',
                'SLA support',
              ]}
            />
          </div>
        </Container>
      </Section>

      {/* TESTIMONIALS */}
      <Section id="testimonials">
        <Container>
          <SectionTitle
            eyebrow="What customers say"
            title="Loved by fast‑moving teams"
            subtitle="A few words from our early users."
          />
          <div className="grid gap-6 md:grid-cols-3">
            <Testimonial
              quote="We shipped a full feature set in half the time. The real‑time board is ridiculously smooth."
              author="Maya Patel"
              role="Product Lead, Nova Labs"
            />
            <Testimonial
              quote="Finally a PM tool that stays out of the way. Clear, fast, and the filters are exactly right."
              author="Daniel Cooper"
              role="CTO, FinEdge"
            />
            <Testimonial
              quote="Setup took minutes. Our team actually enjoys using it — which I never thought I would say."
              author="Ava Nguyen"
              role="Engineering Manager, Orbit"
            />
          </div>
        </Container>
      </Section>

      {/* FAQ */}
      <Section id="faq" className="bg-muted/40">
        <Container>
          <SectionTitle title="Frequently asked questions" subtitle="Everything you need to know." />
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['Is there a free plan?', 'Yes, the Starter plan is free forever for personal use.'],
              ['Can I cancel anytime?', 'Absolutely. Your subscription stops at the end of the billing period.'],
              ['Do you offer discounts?', 'We offer startup and education discounts — contact support.'],
              ['Is my data secure?', 'Yes. We use RBAC and strict RLS policies in our database.'],
            ].map(([q, a]) => (
              <Card key={q}>
                <CardHeader><CardTitle className="text-base">{q}</CardTitle></CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground">{a}</CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* CTA */}
      <Section>
        <Container>
          <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 to-transparent p-8 sm:p-12">
            <div className="relative z-10">
              <h3 className="text-2xl font-semibold">Ready to ship faster?</h3>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Join builders who moved their roadmap to Flowfoundry and never looked back.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="h-11 rounded-xl px-6"><Link href="/workspaces">Create your workspace</Link></Button>
                <Button asChild variant="outline" className="h-11 rounded-xl px-6"><Link href="#pricing">View pricing</Link></Button>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* FOOTER */}
      <footer className="border-t bg-muted/50">
        <Container>
          <div className="py-12 md:py-16">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              <div className="col-span-2 md:col-span-1">
                <Link href="/" className="flex items-center space-x-2">
                  <Workflow className="h-6 w-6 text-primary" />
                  <span className="text-xl font-bold">Flowfoundry</span>
                </Link>
                <p className="mt-4 text-sm text-muted-foreground">
                  Ship work faster. Keep everyone aligned.
                </p>
              </div>
              <div>
                <h3 className="mb-4 text-sm font-semibold">Product</h3>
                <ul className="space-y-3">
                  {[
                    { label: 'Features', href: '#features' },
                    { label: 'Pricing', href: '#pricing' },
                    { label: 'FAQ', href: '#faq' },
                  ].map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-4 text-sm font-semibold">Company</h3>
                <ul className="space-y-3">
                  {[
                    { label: 'About', href: '#' },
                    { label: 'Blog', href: '#' },
                    { label: 'Careers', href: '#' },
                  ].map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-4 text-sm font-semibold">Legal</h3>
                <ul className="space-y-3">
                  {[
                    { label: 'Privacy', href: '/privacy' },
                    { label: 'Terms', href: '/terms' },
                  ].map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 md:flex-row">
              <p className="text-sm text-muted-foreground">
                &copy; {new Date().getFullYear()} Flowfoundry. All rights reserved.
              </p>
              <div className="flex space-x-4">
                {[
                  { icon: Twitter, href: '#', label: 'Twitter' },
                  { icon: Github, href: '#', label: 'GitHub' },
                  { icon: Linkedin, href: '#', label: 'LinkedIn' },
                ].map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={social.label}
                  >
                    <social.icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </footer>
    </div>
  );
}
