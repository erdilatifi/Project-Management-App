'use client';

import { useState, FormEvent, ReactNode, useEffect } from 'react';
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
      <h2 className="text-4xl font-bold tracking-tight sm:text-5xl bg-linear-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
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
    <div className="group rounded-2xl border-2 bg-linear-to-br from-card/50 to-card/30 backdrop-blur-sm p-8 text-center transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
      {Icon && <Icon className="mx-auto mb-3 h-8 w-8 text-primary" />}
      <p className="text-4xl font-bold tracking-tight bg-linear-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">{value}</p>
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

// Interactive Dashboard Preview Component
function InteractiveDashboard() {
  const [draggedCard, setDraggedCard] = useState<number | null>(null);
  const [columns, setColumns] = useState({
    todo: [0, 1],
    inProgress: [2, 3, 4],
    done: [5, 6]
  });

  const taskData = [
    { title: 'Design new landing page', priority: 'high', assignees: 2 },
    { title: 'Update API documentation', priority: 'medium', assignees: 1 },
    { title: 'Fix mobile navigation bug', priority: 'high', assignees: 2 },
    { title: 'Implement dark mode', priority: 'medium', assignees: 3 },
    { title: 'Add user authentication', priority: 'high', assignees: 2 },
    { title: 'Write unit tests', priority: 'low', assignees: 1 },
    { title: 'Deploy to production', priority: 'medium', assignees: 2 }
  ];

  const priorityColors = {
    high: 'from-red-500/30 to-red-500/10',
    medium: 'from-yellow-500/30 to-yellow-500/10',
    low: 'from-green-500/30 to-green-500/10'
  };

  const handleDragStart = (cardId: number) => {
    setDraggedCard(cardId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (columnKey: 'todo' | 'inProgress' | 'done') => {
    if (draggedCard === null) return;
    
    setColumns(prev => {
      const newColumns = { ...prev };
      // Remove from all columns
      Object.keys(newColumns).forEach(key => {
        newColumns[key as keyof typeof newColumns] = newColumns[key as keyof typeof newColumns].filter(id => id !== draggedCard);
      });
      // Add to target column
      newColumns[columnKey] = [...newColumns[columnKey], draggedCard];
      return newColumns;
    });
    setDraggedCard(null);
  };

  const columnNames = {
    todo: 'To Do',
    inProgress: 'In Progress',
    done: 'Done'
  };

  return (
    <div className="grid flex-1 grid-cols-3 gap-3">
      {(Object.keys(columns) as Array<keyof typeof columns>).map((colKey) => (
        <div 
          key={colKey}
          className="space-y-2 rounded-xl border border-border/50 bg-muted/20 p-3 backdrop-blur-sm transition-all"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(colKey)}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{columnNames[colKey]}</span>
            <span className="text-xs text-muted-foreground/60">{columns[colKey].length}</span>
          </div>
          {columns[colKey].map((cardId) => {
            const task = taskData[cardId];
            return (
              <div 
                key={cardId}
                draggable
                onDragStart={() => handleDragStart(cardId)}
                className="group cursor-move rounded-lg border border-border/50 bg-card p-2.5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 active:cursor-grabbing active:scale-95"
                style={{ opacity: draggedCard === cardId ? 0.5 : 1 }}
              >
                <div className={`mb-2 h-1 w-full rounded bg-gradient-to-r ${priorityColors[task.priority as keyof typeof priorityColors]}`} />
                <div className="mb-1.5 text-[10px] font-medium text-foreground/90 leading-tight">{task.title}</div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex -space-x-1">
                    {[...Array(task.assignees)].map((_, i) => (
                      <div key={i} className="h-3 w-3 rounded-full bg-gradient-to-br from-primary/60 to-primary/40 ring-1 ring-card" />
                    ))}
                  </div>
                  <div className="text-[8px] text-muted-foreground/60 uppercase tracking-wider">{task.priority}</div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function Page() {
  return (
    <div className="relative bg-background text-foreground overflow-hidden">
      {/* Premium gradient background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        <div className="absolute inset-0 bg-grid-slate-100/[0.02] mask-[radial-gradient(ellipse_at_center,black_50%,transparent_85%)]" />
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
            <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-7xl bg-linear-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent leading-tight">
              Ship projects 2× faster.
              <br />
              <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">Zero learning curve.</span>
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

          {/* App preview - Premium animated dashboard */}
          <div className="mt-20">
            <div className="relative mx-auto max-w-6xl">
              {/* Glowing background effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/30 via-primary/20 to-primary/30 blur-3xl animate-pulse" />
              
              {/* Main container */}
              <div className="relative overflow-hidden rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-card via-card/95 to-card/90 shadow-2xl ring-1 ring-primary/10">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-500/80" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                    <div className="h-3 w-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="ml-4 flex-1 rounded-md bg-background/50 px-3 py-1 text-xs text-muted-foreground">
                    flowfoundry.app/workspace
                  </div>
                </div>

                {/* Dashboard content */}
                <div className="w-full bg-gradient-to-br from-background via-background to-muted/20 p-4" style={{ height: '500px' }}>
                  <div className="grid h-full grid-cols-12 gap-3">
                    {/* Sidebar */}
                    <div className="col-span-3 space-y-2">
                      {/* Active workspace */}
                      <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-2.5 shadow-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-5 w-5 rounded-lg bg-primary/40" />
                          <div className="flex-1">
                            <div className="text-[9px] font-semibold text-primary/80">Marketing Team</div>
                            <div className="text-[7px] text-primary/60">12 members</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Navigation items */}
                      {[
                        { icon: '📊', label: 'Dashboard', count: null },
                        { icon: '📁', label: 'Projects', count: '8' },
                        { icon: '✓', label: 'Tasks', count: '24' },
                        { icon: '👥', label: 'Team', count: '12' }
                      ].map((item, i) => (
                        <div key={i} className="group rounded-lg border border-border/50 bg-card/50 p-2 backdrop-blur-sm transition-all hover:border-primary/30 hover:shadow-md cursor-pointer">
                          <div className="flex items-center gap-2">
                            <span className="text-xs">{item.icon}</span>
                            <span className="text-[9px] font-medium text-foreground/80 group-hover:text-primary transition-colors flex-1">{item.label}</span>
                            {item.count && <span className="text-[8px] text-muted-foreground/60">{item.count}</span>}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Main content */}
                    <div className="col-span-9 space-y-3">
                      {/* Header with stats */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Total Tasks', value: '24', trend: '+12%' },
                          { label: 'In Progress', value: '8', trend: '+5%' },
                          { label: 'Completed', value: '16', trend: '+8%' }
                        ].map((stat, i) => (
                          <div key={i} className="group rounded-lg border border-border/50 bg-gradient-to-br from-card to-card/80 p-2.5 backdrop-blur-sm transition-all hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5">
                            <div className="text-[8px] text-muted-foreground/70 uppercase tracking-wide mb-1">{stat.label}</div>
                            <div className="flex items-end justify-between">
                              <div className="text-lg font-bold text-foreground">{stat.value}</div>
                              <div className="text-[8px] text-green-500 font-medium">{stat.trend}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Interactive Kanban board preview */}
                      <InteractiveDashboard />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </header>

      {/* SOCIAL PROOF - Metrics */}
      <section className="relative w-full border-y bg-gradient-to-br from-muted/50 via-background to-muted/30 py-20 sm:py-28 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse delay-700" />
        </div>
        
        <Container>
          <div className="grid gap-8 sm:grid-cols-3">
            {/* Stat 1 - Active Users */}
            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/5 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500" />
              <div className="relative rounded-3xl border-2 bg-gradient-to-br from-card via-card/95 to-card/90 backdrop-blur-sm p-8 text-center transition-all duration-500 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2">
                <div className="mb-4 inline-flex rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 p-4 ring-2 ring-primary/20 group-hover:ring-primary/40 group-hover:scale-110 transition-all duration-500">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <p className="text-5xl font-bold tracking-tight bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
                  50K+
                </p>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Active Users</p>
                <p className="mt-2 text-xs text-muted-foreground/70">Growing daily</p>
              </div>
            </div>

            {/* Stat 2 - Projects Shipped */}
            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/5 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500" />
              <div className="relative rounded-3xl border-2 bg-gradient-to-br from-card via-card/95 to-card/90 backdrop-blur-sm p-8 text-center transition-all duration-500 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2">
                <div className="mb-4 inline-flex rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 p-4 ring-2 ring-primary/20 group-hover:ring-primary/40 group-hover:scale-110 transition-all duration-500">
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <p className="text-5xl font-bold tracking-tight bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
                  1M+
                </p>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Projects Shipped</p>
                <p className="mt-2 text-xs text-muted-foreground/70">And counting</p>
              </div>
            </div>

            {/* Stat 3 - Uptime */}
            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/5 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500" />
              <div className="relative rounded-3xl border-2 bg-gradient-to-br from-card via-card/95 to-card/90 backdrop-blur-sm p-8 text-center transition-all duration-500 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2">
                <div className="mb-4 inline-flex rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 p-4 ring-2 ring-primary/20 group-hover:ring-primary/40 group-hover:scale-110 transition-all duration-500">
                  <Globe className="h-8 w-8 text-primary" />
                </div>
                <p className="text-5xl font-bold tracking-tight bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
                  99.9%
                </p>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Uptime SLA</p>
                <p className="mt-2 text-xs text-muted-foreground/70">Always reliable</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* FEATURES - Creative Grid Layout */}
      <Section id="features">
        <Container>
          <SectionTitle
            eyebrow="Everything you need"
            title="Built for speed, designed for clarity"
            subtitle="Powerful features that stay out of your way. No bloat, no complexity—just what you need to ship faster."
          />
          {/* Apple-style asymmetric grid */}
          <div className="grid gap-6 auto-rows-fr">
            {/* Row 1: Large + Small */}
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-2 group relative overflow-hidden transition-all duration-500 hover:-translate-y-2">
                <Card className="h-full border-2 transition-all duration-500 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm">
                  <CardContent className="p-8 h-full flex flex-col justify-between">
                    <div>
                      <div className="mb-6 inline-flex rounded-2xl bg-primary/10 p-4 ring-1 ring-primary/20 group-hover:ring-primary/40 group-hover:scale-110 transition-all duration-500">
                        <Workflow className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="mb-3 text-2xl font-bold">Workspace Management</h3>
                      <p className="text-base leading-relaxed text-muted-foreground">Create unlimited workspaces for different teams. Organize projects, invite members, and manage permissions with role-based access control.</p>
                    </div>
                    <Badge className="mt-6 w-fit">Most Popular</Badge>
                  </CardContent>
                </Card>
              </div>
              <div className="group relative transition-all duration-500 hover:-translate-y-2">
                <Card className="h-full border-2 transition-all duration-500 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-6 h-full flex flex-col">
                    <div className="mb-4 inline-flex rounded-2xl bg-primary/10 p-3 ring-1 ring-primary/20 group-hover:ring-primary/40 group-hover:scale-110 transition-all duration-500">
                      <LayoutDashboard className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mb-2 text-xl font-semibold">Project Boards</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">Visual kanban boards with drag-and-drop task management. Track progress at a glance.</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Row 2: Three equal columns */}
            <div className="grid gap-6 md:grid-cols-3">
              <div className="group relative transition-all duration-500 hover:-translate-y-2">
                <Card className="h-full border-2 transition-all duration-500 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="mb-4 inline-flex rounded-2xl bg-primary/10 p-3 ring-1 ring-primary/20 group-hover:ring-primary/40 group-hover:scale-110 transition-all duration-500">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mb-2 text-xl font-semibold">Team Collaboration</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">Invite team members, assign roles, and collaborate in real-time across workspaces.</p>
                  </CardContent>
                </Card>
              </div>
              <div className="group relative transition-all duration-500 hover:-translate-y-2">
                <Card className="h-full border-2 transition-all duration-500 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="mb-4 inline-flex rounded-2xl bg-primary/10 p-3 ring-1 ring-primary/20 group-hover:ring-primary/40 group-hover:scale-110 transition-all duration-500">
                      <MessageSquare className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mb-2 text-xl font-semibold">Workspace Chat</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">Built-in messaging for each workspace. Keep conversations organized and contextual.</p>
                  </CardContent>
                </Card>
              </div>
              <div className="group relative transition-all duration-500 hover:-translate-y-2">
                <Card className="h-full border-2 transition-all duration-500 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="mb-4 inline-flex rounded-2xl bg-primary/10 p-3 ring-1 ring-primary/20 group-hover:ring-primary/40 group-hover:scale-110 transition-all duration-500">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mb-2 text-xl font-semibold">Task Management</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">Create, assign, and track tasks with deadlines, priorities, and status updates.</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Row 3: Small + Large */}
            <div className="grid gap-6 md:grid-cols-3">
              <div className="group relative transition-all duration-500 hover:-translate-y-2">
                <Card className="h-full border-2 transition-all duration-500 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-6 h-full flex flex-col">
                    <div className="mb-4 inline-flex rounded-2xl bg-primary/10 p-3 ring-1 ring-primary/20 group-hover:ring-primary/40 group-hover:scale-110 transition-all duration-500">
                      <ShieldCheck className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mb-2 text-xl font-semibold">Secure Access</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">Role-based permissions with owner, admin, member, and viewer roles.</p>
                  </CardContent>
                </Card>
              </div>
              <div className="md:col-span-2 group relative overflow-hidden transition-all duration-500 hover:-translate-y-2">
                <Card className="h-full border-2 transition-all duration-500 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm">
                  <CardContent className="p-8 h-full flex flex-col justify-between">
                    <div>
                      <div className="mb-6 inline-flex rounded-2xl bg-primary/10 p-4 ring-1 ring-primary/20 group-hover:ring-primary/40 group-hover:scale-110 transition-all duration-500">
                        <Zap className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="mb-3 text-2xl font-bold">Real-time Notifications</h3>
                      <p className="text-base leading-relaxed text-muted-foreground">Stay updated with instant notifications for task assignments, mentions, and workspace activities. Never miss important updates.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
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
      <section className="w-full bg-linear-to-br from-primary/5 via-background to-background border-y py-20 sm:py-32">
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

      {/* FAQ - Creative Grid */}
      <Section id="faq">
        <Container>
          <SectionTitle title="Frequently asked questions" subtitle="Everything you need to know about Flowfoundry." />
          <div className="mx-auto max-w-5xl">
            {/* Creative asymmetric grid */}
            <div className="grid gap-6 auto-rows-fr">
              {/* Row 1: Large spanning card */}
              <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-2 group border-2 bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm hover:border-primary/30 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                  <CardHeader>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">How do I create a workspace?</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-sm text-muted-foreground leading-relaxed">
                    Sign up and click "Create Workspace" from your dashboard. Give it a name, and you're ready to invite team members and create projects. It takes less than a minute to get started!
                  </CardContent>
                </Card>
                <Card className="group border-2 bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:shadow-xl transition-all duration-500 hover:-translate-y-2">
                  <CardHeader>
                    <CardTitle className="text-base group-hover:text-primary transition-colors">Multiple workspaces?</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-sm text-muted-foreground leading-relaxed">
                    Yes! Create unlimited workspaces for different teams or projects.
                  </CardContent>
                </Card>
              </div>

              {/* Row 2: Two equal cards */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="group border-2 bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:shadow-xl transition-all duration-500 hover:-translate-y-2">
                  <CardHeader>
                    <CardTitle className="text-base group-hover:text-primary transition-colors">What are the different roles?</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-sm text-muted-foreground leading-relaxed">
                    We have 4 roles: Owner (full control), Admin (manage members & projects), Member (create & edit), and Viewer (read-only access).
                  </CardContent>
                </Card>
                <Card className="group border-2 bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:shadow-xl transition-all duration-500 hover:-translate-y-2">
                  <CardHeader>
                    <CardTitle className="text-base group-hover:text-primary transition-colors">How does task management work?</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-sm text-muted-foreground leading-relaxed">
                    Create projects within workspaces, then add tasks with deadlines and priorities. Assign to team members and track progress visually.
                  </CardContent>
                </Card>
              </div>

              {/* Row 3: Small + Large */}
              <div className="grid gap-6 md:grid-cols-3">
                <Card className="group border-2 bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:shadow-xl transition-all duration-500 hover:-translate-y-2">
                  <CardHeader>
                    <CardTitle className="text-base group-hover:text-primary transition-colors">Mobile friendly?</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-sm text-muted-foreground leading-relaxed">
                    Fully responsive on all devices. Works perfectly on mobile browsers.
                  </CardContent>
                </Card>
                <Card className="md:col-span-2 group border-2 bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm hover:border-primary/30 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                  <CardHeader>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">How do I invite team members?</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-sm text-muted-foreground leading-relaxed">
                    Go to your workspace's People page, search for users by email or username, and send invitations. They'll receive instant notifications to join your workspace.
                  </CardContent>
                </Card>
              </div>
            </div>
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
