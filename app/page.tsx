/**
 * Landing Page Component
 * 
 * Main marketing page featuring:
 * - Hero section with call-to-action
 * - Interactive Kanban board demo
 * - Feature showcase with animations
 * - Customer testimonials
 * - Comparison table
 * - FAQ section with infinite scroll
 * 
 * @component
 */
'use client';

import { useState, FormEvent, ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Check, Mail, Workflow, Github, Twitter, Linkedin, Sparkles, ShieldCheck,
  Clock, LayoutDashboard, Zap, Star, ArrowRight, Users,
  TrendingUp, Globe, MessageSquare, CheckCircle2, X
} from 'lucide-react';

function cn(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(' ');
}

const vp = { once: false, amount: 0.35, margin: '-8% 0% -8% 0%' };

const fadeOnly = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  viewport: vp
};

const heroFade = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 1, ease: [0.22, 1, 0.36, 1] }
};

const heroStagger = {
  animate: { transition: { staggerChildren: 0.15, delayChildren: 0.2 } }
};

const elevate = {
  initial: { opacity: 0, y: 24, filter: 'blur(6px)' },
  whileInView: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  viewport: vp
};

const slideLeft = {
  initial: { opacity: 0, x: -36 },
  whileInView: { opacity: 1, x: 0 },
  transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
  viewport: vp
};

const slideRight = {
  initial: { opacity: 0, x: 36 },
  whileInView: { opacity: 1, x: 0 },
  transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
  viewport: vp
};

const scalePop = {
  initial: { opacity: 0, scale: 0.94 },
  whileInView: { opacity: 1, scale: 1 },
  transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  viewport: vp
};

const stagger = {
  initial: {},
  whileInView: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
  viewport: vp
};

const zoomIn = {
  initial: { opacity: 0, scale: 0.9, y: 30 },
  whileInView: { opacity: 1, scale: 1, y: 0 },
  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  viewport: vp
};

const rotateIn = {
  initial: { opacity: 0, rotateX: -15, y: 20 },
  whileInView: { opacity: 1, rotateX: 0, y: 0 },
  transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] },
  viewport: vp
};

const slideUp = {
  initial: { opacity: 0, y: 50 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  viewport: vp
};

const fadeScale = {
  initial: { opacity: 0, scale: 0.92 },
  whileInView: { opacity: 1, scale: 1 },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  viewport: vp
};

const staggerFast = {
  initial: {},
  whileInView: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
  viewport: vp
};

const staggerSlow = {
  initial: {},
  whileInView: { transition: { staggerChildren: 0.18, delayChildren: 0.15 } },
  viewport: vp
};

function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto max-w-7xl px-3 sm:px-6 lg:px-8', className)}>{children}</div>;
}

function Section({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn('py-20 sm:py-32', className)}>
      {children}
    </section>
  );
}

function SectionTitle({ eyebrow, title, subtitle, center = true }: { eyebrow?: string; title: string; subtitle?: string; center?: boolean }) {
  return (
    <motion.div className={cn('mb-16', center && 'text-center')} variants={elevate}>
      {eyebrow && (
        <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border bg-card/50 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>{eyebrow}</span>
        </div>
      )}
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl bg-linear-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
        {title}
      </h2>
      {subtitle && <p className="mx-auto mt-3 sm:mt-4 max-w-2xl text-base sm:text-lg text-muted-foreground px-2">{subtitle}</p>}
    </motion.div>
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
    <form onSubmit={handleSubmit} className="mx-auto flex flex-col sm:flex-row max-w-md gap-2 px-3 sm:px-0">
      <div className="relative flex-1">
        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-10 h-11 bg-background/50 backdrop-blur-sm" disabled={submitted} aria-label="Email address" />
      </div>
      <Button type="submit" className="h-11 px-6 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all sm:w-auto w-full" disabled={submitted}>
        {submitted ? 'Thanks!' : 'Get Started'}
      </Button>
    </form>
  );
}

function Testimonial({ quote, author, role, company }: { quote: string; author: string; role: string; company?: string }) {
  const initials = author.split(' ').map((n) => n[0]).join('').toUpperCase();
  return (
    <motion.div className="h-full transition-all duration-300 hover:-translate-y-1" variants={scalePop}>
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
    </motion.div>
  );
}

function ComparisonRow({ feature, us, them }: { feature: string; us: boolean; them: boolean }) {
  return (
    <motion.div className="grid grid-cols-3 gap-4 border-b py-4 last:border-0" variants={elevate}>
      <div className="text-sm font-medium">{feature}</div>
      <div className="flex justify-center">{us ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <X className="h-5 w-5 text-muted-foreground/30" />}</div>
      <div className="flex justify-center">{them ? <CheckCircle2 className="h-5 w-5 text-muted-foreground/50" /> : <X className="h-5 w-5 text-muted-foreground/30" />}</div>
    </motion.div>
  );
}

/**
 * Interactive Kanban Board Demo
 * 
 * Lightweight drag-and-drop demo without animations for optimal performance.
 * Showcases task management capabilities with smooth CSS transitions.
 */
function InteractiveDashboard() {
  const [draggedCard, setDraggedCard] = useState<number | null>(null);
  const [columns, setColumns] = useState({ 
    todo: [0, 1], 
    inProgress: [2, 3, 4], 
    done: [5, 6] 
  });
  
  // Sample task data for demo purposes
  const taskData = [
    { title: 'Design new landing page', priority: 'high', assignees: 2 },
    { title: 'Update API documentation', priority: 'medium', assignees: 1 },
    { title: 'Fix mobile navigation bug', priority: 'high', assignees: 2 },
    { title: 'Implement dark mode', priority: 'medium', assignees: 3 },
    { title: 'Add user authentication', priority: 'high', assignees: 2 },
    { title: 'Write unit tests', priority: 'low', assignees: 1 },
    { title: 'Deploy to production', priority: 'medium', assignees: 2 }
  ];
  
  const priorityColors: Record<string, string> = { 
    high: 'from-red-500/30 to-red-500/10', 
    medium: 'from-yellow-500/30 to-yellow-500/10', 
    low: 'from-green-500/30 to-green-500/10' 
  };
  
  const handleDragStart = (cardId: number) => setDraggedCard(cardId);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  
  const handleDrop = (columnKey: 'todo' | 'inProgress' | 'done') => {
    if (draggedCard === null) return;
    
    setColumns(prev => {
      const next = { ...prev };
      // Remove card from all columns
      Object.keys(next).forEach(key => {
        next[key as keyof typeof next] = next[key as keyof typeof next].filter(id => id !== draggedCard);
      });
      // Add to target column
      next[columnKey] = [...next[columnKey], draggedCard];
      return next;
    });
    setDraggedCard(null);
  };
  
  const columnNames = { todo: 'To Do', inProgress: 'In Progress', done: 'Done' };
  
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
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {columnNames[colKey]}
            </span>
            <span className="text-xs text-muted-foreground/60">{columns[colKey].length}</span>
          </div>
          {columns[colKey].map((cardId) => {
            const task = taskData[cardId];
            return (
              <div 
                key={cardId} 
                draggable 
                onDragStart={() => handleDragStart(cardId)} 
                className="group cursor-move rounded-lg border border-border/50 bg-card p-2.5 shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 active:scale-95" 
                style={{ 
                  opacity: draggedCard === cardId ? 0.5 : 1,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <div className={`mb-2 h-1 w-full rounded bg-gradient-to-r ${priorityColors[task.priority]}`} />
                <div className="mb-1.5 text-[10px] font-medium text-foreground/90 leading-tight">
                  {task.title}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex -space-x-1">
                    {[...Array(task.assignees)].map((_, i) => (
                      <div 
                        key={i} 
                        className="h-3 w-3 rounded-full bg-gradient-to-br from-primary/60 to-primary/40 ring-1 ring-card" 
                      />
                    ))}
                  </div>
                  <div className="text-[8px] text-muted-foreground/60 uppercase tracking-wider">
                    {task.priority}
                  </div>
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
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        <div className="absolute inset-0 bg-grid-slate-100/[0.02] mask-[radial-gradient(ellipse_at_center,black_50%,transparent_85%)]" />
      </div>

      <header className="relative border-b">
        <Container className="py-24 sm:py-32 lg:py-40">
          <motion.div className="mx-auto max-w-4xl text-center" initial="initial" animate="animate" variants={heroStagger}>
            <motion.div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border bg-card/50 backdrop-blur-sm px-4 py-1.5 text-sm font-medium shadow-lg" variants={heroFade}>
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Trusted by 10,000+ teams worldwide</span>
            </motion.div>
            <motion.h1 className="text-balance text-5xl font-bold tracking-tight sm:text-7xl bg-linear-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent leading-tight" variants={heroFade}>
              Ship projects 2× faster.
              <br />
              <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">Zero learning curve.</span>
            </motion.h1>
            <motion.p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground" variants={heroFade}>
              The project management tool your team will actually love. Real-time collaboration, beautiful design, and powerful features that stay out of your way.
            </motion.p>
            <motion.div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row" variants={heroFade}>
              <Button asChild size="lg" className="h-12 px-8 text-base shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all">
                <Link href="/workspaces">
                  Start for free <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base border-2 hover:bg-accent/50">
                <Link href="#features">See how it works</Link>
              </Button>
            </motion.div>
            <motion.div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground" variants={heroFade}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Free forever</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Unlimited workspaces</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Setup in 5 minutes</span>
              </div>
            </motion.div>
          </motion.div>

          <motion.div variants={fadeOnly} initial="initial" whileInView="whileInView" className="mt-20">
            <div className="relative mx-auto max-w-6xl">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/30 via-primary/20 to-primary/30 blur-3xl" />
              <div className="relative overflow-hidden rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-card via-card/95 to-card/90 shadow-2xl ring-1 ring-primary/10">
                <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-500/80" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                    <div className="h-3 w-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="ml-4 flex-1 rounded-md bg-background/50 px-3 py-1 text-xs text-muted-foreground">flowfoundry.app/workspace</div>
                </div>
                <div className="w-full bg-gradient-to-br from-background via-background to-muted/20 p-4" style={{ height: '500px' }}>
                  <div className="grid h-full grid-cols-12 gap-3">
                    <div className="hidden md:block col-span-3 space-y-2">
                      <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-2.5 shadow-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-5 w-5 rounded-lg bg-primary/40" />
                          <div className="flex-1">
                            <div className="text-[9px] font-semibold text-primary/80">Marketing Team</div>
                            <div className="text-[7px] text-primary/60">12 members</div>
                          </div>
                        </div>
                      </div>
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
                    <div className="col-span-12 md:col-span-9 space-y-3">
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
                      <InteractiveDashboard />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </Container>
      </header>

      <Section className="relative w-full border-y bg-gradient-to-br from-muted/50 via-background to-muted/30 py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>
        <Container>
          <motion.div className="grid gap-8 sm:grid-cols-3" initial="initial" whileInView="whileInView" variants={staggerFast}>
            {[
              { icon: Users, value: '50K+', label: 'Active Users', sub: 'Growing daily' },
              { icon: TrendingUp, value: '1M+', label: 'Projects Shipped', sub: 'And counting' },
              { icon: Globe, value: '99.9%', label: 'Uptime SLA', sub: 'Always reliable' }
            ].map((s, i) => (
              <motion.div key={i} className="group relative" variants={scalePop}>
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/5 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500" />
                <div className="relative rounded-3xl border-2 bg-gradient-to-br from-card via-card/95 to-card/90 backdrop-blur-sm p-8 text-center transition-all duration-500 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2">
                  <div className="mb-4 inline-flex rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 p-4 ring-2 ring-primary/20 group-hover:ring-primary/40 group-hover:scale-110 transition-all duration-500">
                    <s.icon className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-5xl font-bold tracking-tight bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent mb-2">{s.value}</p>
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</p>
                  <p className="mt-2 text-xs text-muted-foreground/70">{s.sub}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </Section>

      <Section id="features">
        <Container>
          <SectionTitle eyebrow="Everything you need" title="Built for speed, designed for clarity" subtitle="Powerful features that stay out of your way. No bloat, no complexity—just what you need to ship faster." />
          <motion.div className="grid gap-6 auto-rows-fr" initial="initial" whileInView="whileInView" variants={staggerSlow}>
            <motion.div className="grid gap-6 md:grid-cols-3" variants={fadeScale}>
              <motion.div className="md:col-span-2 group relative overflow-hidden transition-all duration-500 hover:-translate-y-2" variants={rotateIn}>
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
              </motion.div>
              <motion.div className="group relative transition-all duration-500 hover:-translate-y-2" variants={zoomIn}>
                <Card className="h-full border-2 transition-all duration-500 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-6 h-full flex flex-col">
                    <div className="mb-4 inline-flex rounded-2xl bg-primary/10 p-3 ring-1 ring-primary/20 group-hover:ring-primary/40 group-hover:scale-110 transition-all duration-500">
                      <LayoutDashboard className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mb-2 text-xl font-semibold">Project Boards</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">Visual kanban boards with drag-and-drop task management. Track progress at a glance.</p>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
            <motion.div className="grid gap-6 md:grid-cols-3" variants={fadeScale}>
              {[
                { icon: Users, title: 'Team Collaboration', desc: 'Invite team members, assign roles, and collaborate in real-time across workspaces.' },
                { icon: MessageSquare, title: 'Workspace Chat', desc: 'Built-in messaging for each workspace. Keep conversations organized and contextual.' },
                { icon: Clock, title: 'Task Management', desc: 'Create, assign, and track tasks with deadlines, priorities, and status updates.' }
              ].map((f, i) => (
                <motion.div key={i} className="group relative transition-all duration-500 hover:-translate-y-2" variants={slideUp}>
                  <Card className="h-full border-2 transition-all duration-500 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-6 h-full flex flex-col">
                      <div className="mb-4 inline-flex rounded-2xl bg-primary/10 p-3 ring-1 ring-primary/20 group-hover:ring-primary/40 group-hover:scale-110 transition-all duration-500">
                        <f.icon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="mb-2 text-xl font-semibold">{f.title}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
            <motion.div className="grid gap-6 md:grid-cols-3" variants={fadeScale}>
              <motion.div className="group relative transition-all duration-500 hover:-translate-y-2" variants={scalePop}>
                <Card className="h-full border-2 transition-all duration-500 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-6 h-full flex flex-col">
                    <div className="mb-4 inline-flex rounded-2xl bg-primary/10 p-3 ring-1 ring-primary/20 group-hover:ring-primary/40 group-hover:scale-110 transition-all duration-500">
                      <ShieldCheck className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mb-2 text-xl font-semibold">Secure Access</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">Role-based permissions with owner, admin, member, and viewer roles.</p>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div className="md:col-span-2 group relative overflow-hidden transition-all duration-500 hover:-translate-y-2" variants={rotateIn}>
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
              </motion.div>
            </motion.div>
          </motion.div>
        </Container>
      </Section>

      <Section className="w-full bg-muted/30">
        <Container>
          <SectionTitle eyebrow="Why choose us" title="Flowfoundry vs. the rest" subtitle="See how we stack up against traditional project management tools." />
          <motion.div initial="initial" whileInView="whileInView" variants={zoomIn}>
            <Card className="mx-auto max-w-3xl border-2 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="grid grid-cols-3 gap-4 border-b-2 pb-4 mb-4">
                  <div className="text-sm font-semibold">Feature</div>
                  <div className="text-center text-sm font-semibold text-primary">Flowfoundry</div>
                  <div className="text-center text-sm font-semibold text-muted-foreground">Others</div>
                </div>
                <ComparisonRow feature="Quick setup (5 min)" us={true} them={false} />
                <ComparisonRow feature="Real-time collaboration" us={true} them={false} />
                <ComparisonRow feature="100% free forever" us={true} them={false} />
                <ComparisonRow feature="Unlimited workspaces" us={true} them={false} />
                <ComparisonRow feature="Beautiful UI" us={true} them={false} />
                <ComparisonRow feature="Mobile responsive" us={true} them={true} />
                <ComparisonRow feature="Dark mode" us={true} them={false} />
                <ComparisonRow feature="Built-in messaging" us={true} them={false} />
              </CardContent>
            </Card>
          </motion.div>
        </Container>
      </Section>

      <Section id="testimonials">
        <Container>
          <SectionTitle eyebrow="Customer love" title="Trusted by fast-moving teams" subtitle="Join thousands of teams who've transformed their workflow with Flowfoundry." />
          <motion.div className="grid gap-8 md:grid-cols-3" initial="initial" whileInView="whileInView" variants={staggerFast}>
            <Testimonial quote="We cut our sprint planning time in half. The real-time board is incredibly smooth and the UI is gorgeous." author="Sarah Chen" role="Engineering Lead" company="TechCorp" />
            <Testimonial quote="Finally, a PM tool that doesn't get in the way. Setup took 5 minutes and our team was productive immediately." author="Marcus Johnson" role="Product Manager" company="StartupXYZ" />
            <Testimonial quote="The best investment we made this year. Our team velocity doubled and everyone actually enjoys using it." author="Emily Rodriguez" role="CTO" company="InnovateLabs" />
          </motion.div>
        </Container>
      </Section>

      <Section className="w-full bg-linear-to-br from-primary/5 via-background to-background border-y" id="get-started">
        <Container>
          <motion.div className="mx-auto max-w-4xl text-center" initial="initial" whileInView="whileInView" variants={fadeScale}>
            <Badge className="mb-6 shadow-lg">100% Free Forever</Badge>
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">Start managing projects today</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">Join thousands of teams using Flowfoundry. Completely free with unlimited workspaces, projects, and team members.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button asChild size="lg" className="h-14 px-10 text-lg shadow-xl shadow-primary/25">
                <Link href="/workspaces">Get Started Free</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-14 px-10 text-lg border-2">
                <Link href="#features">Explore Features</Link>
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Unlimited everything</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Always free</span>
              </div>
            </div>
          </motion.div>
        </Container>
      </Section>

      <Section id="faq" className="overflow-hidden">
        <Container>
          <SectionTitle title="Frequently asked questions" subtitle="Everything you need to know about Flowfoundry." />
        </Container>
        
        <div className="space-y-6">
          {/* Row 1 - Scrolls Right */}
          <div className="relative group/row">
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
            <motion.div
              className="flex gap-6"
              animate={{ x: [0, -1000] }}
              transition={{
                duration: 30,
                repeat: Infinity,
                ease: "linear",
                repeatType: "loop"
              }}
              style={{ willChange: "transform" }}
              whileHover={{ x: [0, -1000], transition: { duration: 30, repeat: Infinity, ease: "linear", repeatType: "loop" } }}
              onHoverStart={(e) => { if (e.currentTarget) (e.currentTarget as HTMLElement).style.animationPlayState = 'paused'; }}
              onHoverEnd={(e) => { if (e.currentTarget) (e.currentTarget as HTMLElement).style.animationPlayState = 'running'; }}
            >
              {[...Array(3)].map((_, setIndex) => (
                <div key={setIndex} className="flex gap-6 shrink-0">
                  <Card className="w-[500px] shrink-0 group border-2 bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm hover:border-primary/30 hover:shadow-2xl transition-all duration-500">
                    <CardHeader>
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">How do I create a workspace?</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-sm text-muted-foreground leading-relaxed">
                      Sign up and click "Create Workspace" from your dashboard. Give it a name, invite members, and start projects instantly.
                    </CardContent>
                  </Card>
                  <Card className="w-[350px] shrink-0 group border-2 bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:shadow-xl transition-all duration-500">
                    <CardHeader>
                      <CardTitle className="text-base group-hover:text-primary transition-colors">Multiple workspaces?</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-sm text-muted-foreground leading-relaxed">
                      Yes—create unlimited workspaces for different teams or clients.
                    </CardContent>
                  </Card>
                  <Card className="w-[400px] shrink-0 group border-2 bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:shadow-xl transition-all duration-500">
                    <CardHeader>
                      <CardTitle className="text-base group-hover:text-primary transition-colors">Is it free?</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-sm text-muted-foreground leading-relaxed">
                      Flowfoundry has a generous free plan for small teams.
                    </CardContent>
                  </Card>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Row 2 - Scrolls Left */}
          <div className="relative group/row">
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
            <motion.div
              className="flex gap-6"
              animate={{ x: [-1000, 0] }}
              transition={{
                duration: 35,
                repeat: Infinity,
                ease: "linear",
                repeatType: "loop"
              }}
              style={{ willChange: "transform" }}
            >
              {[...Array(3)].map((_, setIndex) => (
                <div key={setIndex} className="flex gap-6 shrink-0">
                  <Card className="w-[400px] shrink-0 group border-2 bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:shadow-xl transition-all duration-500">
                    <CardHeader>
                      <CardTitle className="text-base group-hover:text-primary transition-colors">What are the different roles?</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-sm text-muted-foreground leading-relaxed">
                      Owner, Admin, Member, and Viewer roles to match your team's needs.
                    </CardContent>
                  </Card>
                  <Card className="w-[450px] shrink-0 group border-2 bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:shadow-xl transition-all duration-500">
                    <CardHeader>
                      <CardTitle className="text-base group-hover:text-primary transition-colors">How does task management work?</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-sm text-muted-foreground leading-relaxed">
                      Create projects, add tasks, assign members, set due dates, and track visually.
                    </CardContent>
                  </Card>
                  <Card className="w-[380px] shrink-0 group border-2 bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:shadow-xl transition-all duration-500">
                    <CardHeader>
                      <CardTitle className="text-base group-hover:text-primary transition-colors">Real-time updates?</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-sm text-muted-foreground leading-relaxed">
                      All changes sync instantly across your team.
                    </CardContent>
                  </Card>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Row 3 - Scrolls Right (Faster) */}
          <div className="relative group/row">
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
            <motion.div
              className="flex gap-6"
              animate={{ x: [0, -1000] }}
              transition={{
                duration: 25,
                repeat: Infinity,
                ease: "linear",
                repeatType: "loop"
              }}
              style={{ willChange: "transform" }}
            >
              {[...Array(3)].map((_, setIndex) => (
                <div key={setIndex} className="flex gap-6 shrink-0">
                  <Card className="w-[350px] shrink-0 group border-2 bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:shadow-xl transition-all duration-500">
                    <CardHeader>
                      <CardTitle className="text-base group-hover:text-primary transition-colors">Mobile friendly?</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-sm text-muted-foreground leading-relaxed">
                      Fully responsive on all devices. Works perfectly on mobile browsers.
                    </CardContent>
                  </Card>
                  <Card className="w-[500px] shrink-0 group border-2 bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm hover:border-primary/30 hover:shadow-2xl transition-all duration-500">
                    <CardHeader>
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">How do I invite team members?</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-sm text-muted-foreground leading-relaxed">
                      Go to your workspace's People page, enter their email address, and send an invitation. They'll receive instant notifications to join your workspace.
                    </CardContent>
                  </Card>
                  <Card className="w-[400px] shrink-0 group border-2 bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:shadow-xl transition-all duration-500">
                    <CardHeader>
                      <CardTitle className="text-base group-hover:text-primary transition-colors">Can I export data?</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-sm text-muted-foreground leading-relaxed">
                      Yes, you can export your workspace data anytime in multiple formats.
                    </CardContent>
                  </Card>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </Section>

      <motion.footer className="w-full border-t bg-muted/30" initial="initial" whileInView="whileInView" variants={staggerSlow} viewport={vp}>
        <Container>
          <motion.div className="py-16" variants={fadeScale}>
            <div className="grid grid-cols-2 gap-12 md:grid-cols-4">
              <motion.div className="col-span-2 md:col-span-1" variants={slideUp}>
                <Link href="/" className="flex items-center space-x-2 mb-4">
                  <Workflow className="h-7 w-7 text-primary" />
                  <span className="text-xl font-bold">Flowfoundry</span>
                </Link>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">Ship work faster. Keep everyone aligned. Built for modern teams.</p>
                <div className="flex space-x-3">
                  {[
                    { icon: Twitter, href: '#', label: 'Twitter' },
                    { icon: Github, href: '#', label: 'GitHub' },
                    { icon: Linkedin, href: '#', label: 'LinkedIn' }
                  ].map((social) => (
                    <a key={social.label} href={social.href} className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background/50 text-muted-foreground transition-all hover:border-primary/50 hover:text-foreground hover:shadow-lg" aria-label={social.label}>
                      <social.icon className="h-4 w-4" />
                    </a>
                  ))}
                </div>
              </motion.div>
              <motion.div variants={slideUp}>
                <h3 className="mb-4 text-sm font-semibold">Product</h3>
                <ul className="space-y-3">
                  {[
                    { label: 'Features', href: '#features' },
                    { label: 'Get Started', href: '#get-started' },
                    { label: 'FAQ', href: '#faq' },
                    { label: 'Testimonials', href: '#testimonials' }
                  ].map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
              <motion.div variants={slideUp}>
                <h3 className="mb-4 text-sm font-semibold">Company</h3>
                <ul className="space-y-3">
                  {[
                    { label: 'About', href: '#' },
                    { label: 'Blog', href: '#' },
                    { label: 'Careers', href: '#' },
                    { label: 'Contact', href: '#' }
                  ].map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
              <motion.div variants={slideUp}>
                <h3 className="mb-4 text-sm font-semibold">Legal</h3>
                <ul className="space-y-3">
                  {[
                    { label: 'Privacy', href: '/privacy' },
                    { label: 'Terms', href: '/terms' },
                    { label: 'Security', href: '#' },
                    { label: 'Status', href: '#' }
                  ].map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
            <motion.div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 md:flex-row" variants={fadeOnly}>
              <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Flowfoundry. All rights reserved.</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  All systems operational
                </span>
              </div>
            </motion.div>
          </motion.div>
        </Container>
      </motion.footer>
    </div>
  );
}
