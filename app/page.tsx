'use client';

import { useState, FormEvent, ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Check, Mail, Workflow, Github, Twitter, Linkedin, Sparkles, ShieldCheck,
  Clock, LayoutDashboard, BarChart3, Zap, Star, ArrowRight, Users,
  TrendingUp, Globe, MessageSquare, CheckCircle2, X
} from 'lucide-react';

function cn(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(' ');
}

function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto max-w-7xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>;
}

function Section({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return <section id={id} className={cn('py-20 sm:py-32', className)}>{children}</section>;
}

function SectionTitle({ eyebrow, title, subtitle, center = true }: { eyebrow?: string; title: string; subtitle?: string; center?: boolean }) {
  return (
    <div className={cn('mb-16', center && 'text-center')}>
      {eyebrow && (
        <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border bg-card/50 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>{eyebrow}</span>
        </div>
      )}
      <h2 className="text-4xl font-bold tracking-tight sm:text-5xl bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
        {title}
      </h2>
      {subtitle && <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function EmailCapture() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      setTimeout(() => { setEmail(''); setSubmitted(false); }, 2200);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-md gap-2">
      <div className="relative flex-1">
        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)}
          required className="pl-10 h-11 bg-background/50 backdrop-blur-sm" disabled={submitted} aria-label="Email address" />
      </div>
      <Button type="submit" className="h-11 px-6 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all" disabled={submitted}>
        {submitted ? 'Thanks!' : 'Get Started'}
      </Button>
    </form>
  );
}

function FeatureCard({ icon: Icon, title, description, popular }: { icon: any; title: string; description: string; popular?: boolean }) {
  return (
    <div className="group relative transition-all duration-300 hover:-translate-y-1">
      {popular && (
        <Badge className="absolute -top-3 left-4 z-10 shadow-lg">Most Popular</Badge>
      )}
      <Card className="h-full border-2 transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="mb-4 inline-flex rounded-2xl bg-primary/10 p-3 ring-1 ring-primary/20 group-hover:ring-primary/40 transition-all group-hover:scale-110 duration-300">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <h3 className="mb-2 text-xl font-semibold">{title}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ value, label, icon: Icon }: { value: string; label: string; icon?: any }) {
  return (
    <div className="group rounded-2xl border-2 bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm p-8 text-center transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
      {Icon && <Icon className="mx-auto mb-3 h-8 w-8 text-primary" />}
      <p className="text-4xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">{value}</p>
      <p className="mt-2 text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

function Testimonial({ quote, author, role, company }: { quote: string; author: string; role: string; company?: string }) {
  const initials = author.split(' ').map((n) => n[0]).join('').toUpperCase();
  return (
    <div className="h-full transition-all duration-300 hover:-translate-y-1">
      <Card className="h-full border-2 bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:shadow-xl transition-all">
        <CardContent className="p-6">
          <div className="mb-4 flex gap-1">
            {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-primary text-primary" />)}
          </div>
          <p className="mb-6 text-base leading-relaxed text-muted-foreground">"{quote}"</p>
          <div className="flex items-center gap-3">
            <Avatar className="ring-2 ring-primary/20">
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{author}</p>
              <p className="text-sm text-muted-foreground">{role}{company && `, ${company}`}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ComparisonRow({ feature, us, them }: { feature: string; us: boolean; them: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-4 border-b py-4 last:border-0">
      <div className="text-sm font-medium">{feature}</div>
      <div className="flex justify-center">
        {us ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <X className="h-5 w-5 text-muted-foreground/30" />}
      </div>
      <div className="flex justify-center">
        {them ? <CheckCircle2 className="h-5 w-5 text-muted-foreground/50" /> : <X className="h-5 w-5 text-muted-foreground/30" />}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <div className="relative bg-background text-foreground overflow-hidden">
      {/* Premium gradient background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        <div className="absolute inset-0 bg-grid-slate-100/[0.02] [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_85%)]" />
      </div>

      {/* HERO */}
      <header className="relative border-b">
        <Container className="py-24 sm:py-32 lg:py-40">
          <div className="mx-auto max-w-4xl text-center">
            {/* Trust badge */}
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border bg-card/50 backdrop-blur-sm px-4 py-1.5 text-sm font-medium shadow-lg">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Trusted by 10,000+ teams worldwide</span>
            </div>

            {/* Hero headline */}
            <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-7xl bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent leading-tight">
              Ship projects 2× faster.
              <br />
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Zero learning curve.</span>
            </h1>

            {/* Subcopy */}
            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground">
              The project management tool your team will actually love. Real-time collaboration, 
              beautiful design, and powerful features that stay out of your way.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" className="h-12 px-8 text-base shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all">
                <Link href="/workspaces">
                  Start for free <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base border-2 hover:bg-accent/50">
                <Link href="#features">See how it works</Link>
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Free forever</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>No credit card</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Setup in 5 minutes</span>
              </div>
            </div>
          </div>

          {/* App preview */}
          <div className="mt-20">
            <div className="relative mx-auto max-w-6xl">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 blur-3xl" />
              <div className="relative overflow-hidden rounded-2xl border-2 bg-card shadow-2xl ring-1 ring-primary/10">
                <div className="aspect-video w-full bg-gradient-to-br from-muted/50 to-muted/30">
                  <div className="flex h-full items-center justify-center p-8">
                    <div className="grid w-full grid-cols-3 gap-6">
                      <div className="col-span-1 space-y-3">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="h-12 rounded-lg border-2 bg-background/50 backdrop-blur-sm" />
                        ))}
                      </div>
                      <div className="col-span-2 space-y-4">
                        <div className="h-12 rounded-lg border-2 bg-background/50 backdrop-blur-sm" />
                        <div className="h-56 rounded-lg border-2 bg-gradient-to-br from-primary/5 to-transparent backdrop-blur-sm" />
                        <div className="grid grid-cols-2 gap-4">
                          <div className="h-28 rounded-lg border-2 bg-background/50 backdrop-blur-sm" />
                          <div className="h-28 rounded-lg border-2 bg-background/50 backdrop-blur-sm" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </header>

      {/* SOCIAL PROOF - Metrics */}
      {/* METRICS - Full width background */}
      <section className="w-full border-y bg-muted/30 py-20 sm:py-28">
        <Container>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat value="50K+" label="Active users" icon={Users} />
            <Stat value="1M+" label="Projects shipped" icon={TrendingUp} />
            <Stat value="99.9%" label="Uptime SLA" icon={Globe} />
          </div>
        </Container>
      </section>

      {/* FEATURES */}
      <Section id="features">
        <Container>
          <SectionTitle
            eyebrow="Everything you need"
            title="Built for speed, designed for clarity"
            subtitle="Powerful features that stay out of your way. No bloat, no complexity—just what you need to ship faster."
          />
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard icon={LayoutDashboard} title="Drag & drop Kanban" description="Intuitive boards with real-time sync. Move tasks instantly with optimistic updates." popular />
            <FeatureCard icon={Zap} title="Lightning fast" description="Sub-50ms response times. Every interaction feels instant, even with large datasets." />
            <FeatureCard icon={ShieldCheck} title="Enterprise security" description="SOC 2 compliant with role-based access control and end-to-end encryption." />
            <FeatureCard icon={Clock} title="Smart deadlines" description="Automatic categorization: overdue, today, this week. Never miss a deadline again." />
            <FeatureCard icon={MessageSquare} title="Real-time chat" description="Built-in messaging with threads, mentions, and file sharing. No context switching." />
            <FeatureCard icon={BarChart3} title="Powerful insights" description="Beautiful reports and analytics. Track velocity, burndown, and team performance." />
          </div>
        </Container>
      </Section>

      {/* COMPARISON - Full width background */}
      <section className="w-full bg-muted/30 py-20 sm:py-32">
        <Container>
          <SectionTitle
            eyebrow="Why choose us"
            title="Flowfoundry vs. the rest"
            subtitle="See how we stack up against traditional project management tools."
          />
          <Card className="mx-auto max-w-3xl border-2 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="grid grid-cols-3 gap-4 border-b-2 pb-4 mb-4">
                <div className="text-sm font-semibold">Feature</div>
                <div className="text-center text-sm font-semibold text-primary">Flowfoundry</div>
                <div className="text-center text-sm font-semibold text-muted-foreground">Others</div>
              </div>
              <ComparisonRow feature="Setup time" us={true} them={false} />
              <ComparisonRow feature="Real-time collaboration" us={true} them={false} />
              <ComparisonRow feature="Free forever plan" us={true} them={false} />
              <ComparisonRow feature="No learning curve" us={true} them={false} />
              <ComparisonRow feature="Beautiful UI" us={true} them={false} />
              <ComparisonRow feature="Mobile responsive" us={true} them={true} />
              <ComparisonRow feature="Dark mode" us={true} them={false} />
              <ComparisonRow feature="API access" us={true} them={true} />
            </CardContent>
          </Card>
        </Container>
      </section>

      {/* TESTIMONIALS */}
      <Section id="testimonials">
        <Container>
          <SectionTitle
            eyebrow="Customer love"
            title="Trusted by fast-moving teams"
            subtitle="Join thousands of teams who've transformed their workflow with Flowfoundry."
          />
          <div className="grid gap-8 md:grid-cols-3">
            <Testimonial
              quote="We cut our sprint planning time in half. The real-time board is incredibly smooth and the UI is gorgeous."
              author="Sarah Chen"
              role="Engineering Lead"
              company="TechCorp"
            />
            <Testimonial
              quote="Finally, a PM tool that doesn't get in the way. Setup took 5 minutes and our team was productive immediately."
              author="Marcus Johnson"
              role="Product Manager"
              company="StartupXYZ"
            />
            <Testimonial
              quote="The best investment we made this year. Our team velocity doubled and everyone actually enjoys using it."
              author="Emily Rodriguez"
              role="CTO"
              company="InnovateLabs"
            />
          </div>
        </Container>
      </Section>

      {/* PRICING CTA - Full width background */}
      <section className="w-full bg-gradient-to-br from-primary/5 via-background to-background border-y py-20 sm:py-32">
        <Container>
          <div className="mx-auto max-w-4xl text-center">
            <Badge className="mb-6 shadow-lg">Limited Time Offer</Badge>
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">
              Start shipping faster today
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join 10,000+ teams who've transformed their workflow. Free forever for small teams, 
              with premium features available as you grow.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button asChild size="lg" className="h-14 px-10 text-lg shadow-xl shadow-primary/25">
                <Link href="/workspaces">Start free trial</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-14 px-10 text-lg border-2">
                <Link href="#features">View pricing</Link>
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Cancel anytime</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>No credit card required</span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <Section id="faq">
        <Container>
          <SectionTitle title="Frequently asked questions" subtitle="Everything you need to know about Flowfoundry." />
          <div className="mx-auto max-w-3xl grid gap-6 md:grid-cols-2">
            {[
              ['Is it really free?', 'Yes! Free forever for teams up to 10 members. No credit card required, no hidden fees.'],
              ['How long does setup take?', 'Most teams are up and running in under 5 minutes. Create a workspace, invite your team, and start shipping.'],
              ['Can I migrate from other tools?', 'Absolutely. We offer free migration assistance and import tools for popular PM platforms.'],
              ['Is my data secure?', 'Yes. We\'re SOC 2 compliant with enterprise-grade encryption, regular backups, and strict access controls.'],
              ['Do you offer support?', 'Yes! Free email support for all users, plus priority chat support for premium plans.'],
              ['Can I cancel anytime?', 'Of course. No contracts, no commitments. Cancel with one click and export all your data.'],
            ].map(([q, a]) => (
              <Card key={q} className="border-2 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all">
                <CardHeader><CardTitle className="text-base">{q}</CardTitle></CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground leading-relaxed">{a}</CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* FOOTER - Full width background */}
      <footer className="w-full border-t bg-muted/30">
        <Container>
          <div className="py-16">
            <div className="grid grid-cols-2 gap-12 md:grid-cols-4">
              <div className="col-span-2 md:col-span-1">
                <Link href="/" className="flex items-center space-x-2 mb-4">
                  <Workflow className="h-7 w-7 text-primary" />
                  <span className="text-xl font-bold">Flowfoundry</span>
                </Link>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Ship work faster. Keep everyone aligned. Built for modern teams.
                </p>
                <div className="flex space-x-3">
                  {[
                    { icon: Twitter, href: '#', label: 'Twitter' },
                    { icon: Github, href: '#', label: 'GitHub' },
                    { icon: Linkedin, href: '#', label: 'LinkedIn' },
                  ].map((social) => (
                    <a key={social.label} href={social.href}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background/50 text-muted-foreground transition-all hover:border-primary/50 hover:text-foreground hover:shadow-lg"
                      aria-label={social.label}>
                      <social.icon className="h-4 w-4" />
                    </a>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="mb-4 text-sm font-semibold">Product</h3>
                <ul className="space-y-3">
                  {[
                    { label: 'Features', href: '#features' },
                    { label: 'Pricing', href: '#pricing' },
                    { label: 'FAQ', href: '#faq' },
                    { label: 'Changelog', href: '#' },
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
                <h3 className="mb-4 text-sm font-semibold">Company</h3>
                <ul className="space-y-3">
                  {[
                    { label: 'About', href: '#' },
                    { label: 'Blog', href: '#' },
                    { label: 'Careers', href: '#' },
                    { label: 'Contact', href: '#' },
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
                    { label: 'Security', href: '#' },
                    { label: 'Status', href: '#' },
                  ].map((link) => (
                    <li key={link.label}>
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
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  All systems operational
                </span>
              </div>
            </div>
          </div>
        </Container>
      </footer>
    </div>
  );
}
