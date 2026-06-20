'use client'
import React, { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { SignIn, SignInWithGoogle } from '@/app/actions/AuthActions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Mail, Lock, Loader2, Workflow, ArrowRight } from 'lucide-react'
import { useAuth } from '@/app/context/ContextApiProvider'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
})

type LoginFormData = z.infer<typeof loginSchema>

const LoginPage = () => {
  const router = useRouter()
  const { user, loading: isCheckingAuth, refreshAuth } = useAuth()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    if (!isCheckingAuth && user) {
      router.replace('/workspaces')
    }
  }, [user, isCheckingAuth, router])

  const onSubmit = async (data: LoginFormData) => {
    try {
      const result = await SignIn(data.email, data.password)

      if (result?.error) {
        setError('root', { message: result.error })
        toast.error(result.error)
      } else if (result?.success) {
        // Refresh auth context to immediately update navbar
        await refreshAuth()
        toast.success('Successfully logged in!')
        router.push('/workspaces')
        router.refresh()
      }
    } catch {
      const errorMessage = 'Something went wrong. Please try again.'
      setError('root', { message: errorMessage })
      toast.error(errorMessage)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      const result = await SignInWithGoogle()
      if (result?.data?.url) {
        window.location.href = result.data.url
      } else if (result?.error) {
        toast.error(result.error)
      }
    } catch {
      toast.error('Failed to sign in with Google')
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="landing-page flex justify-center items-center min-h-screen" style={{ background: 'var(--lp-bg)' }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--lp-accent)]" />
          <p className="text-[var(--lp-ink-dim)] font-medium tracking-wide">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title={<>Pick up right where <em className="not-italic text-[var(--lp-accent)]">your team</em> left off.</>}
      subtitle="Your boards, conversations, and notifications are exactly where you left them — synced in real time across the whole team."
    >
      <div className="mb-8">
        <h2 className="text-[26px] font-semibold tracking-tight text-[var(--lp-ink)]">Sign in</h2>
        <p className="text-[14px] text-[var(--lp-ink-dim)] mt-2">
          New to Flowfoundry?{' '}
          <Link href="/register" className="text-[var(--lp-accent)] font-semibold hover:underline underline-offset-4">
            Create an account
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <Field label="Email address" htmlFor="email" error={errors.email?.message}>
          <Mail className="auth-field-icon" />
          <Input
            id="email"
            {...register('email')}
            placeholder="you@example.com"
            type="email"
            className="auth-input"
            aria-invalid={!!errors.email}
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
          aside={
            <Link href="/auth/reset-password" className="text-xs font-semibold text-[var(--lp-ink-dim)] hover:text-[var(--lp-accent)] transition-colors">
              Forgot password?
            </Link>
          }
        >
          <Lock className="auth-field-icon" />
          <Input
            id="password"
            {...register('password')}
            placeholder="••••••••"
            type="password"
            className="auth-input"
            aria-invalid={!!errors.password}
          />
        </Field>

        {errors.root && (
          <div className="p-3 rounded-lg border border-[var(--lp-red)]/30 bg-[var(--lp-red)]/10">
            <p className="text-[var(--lp-red)] text-xs font-medium text-center">{errors.root.message}</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full rounded-xl text-[15px] font-semibold bg-[var(--lp-accent)] text-[#06140a] hover:bg-[#d6ff63] hover:shadow-[0_10px_30px_-8px_rgba(201,255,61,0.5)] transition-all border-0"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </form>

      <div className="relative my-7">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-[var(--lp-border)]" />
        </div>
        <div className="relative flex justify-center text-[11px] uppercase tracking-widest font-mono">
          <span className="px-3 text-[var(--lp-ink-faint)]" style={{ background: 'var(--lp-surface)' }}>or</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="h-12 w-full rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2.5 text-[var(--lp-ink)] border border-[var(--lp-border-strong)] bg-white/[0.03] hover:bg-white/[0.07] transition-colors"
      >
        <GoogleIcon />
        Continue with Google
      </button>
    </AuthShell>
  )
}

/* ---------- Shared auth layout + field primitives ---------- */

function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string
  title: React.ReactNode
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="landing-page min-h-screen w-full flex font-sans selection:bg-[var(--lp-accent)] selection:text-[#050607]" style={{ background: 'var(--lp-bg)', color: 'var(--lp-ink)' }}>
      {/* Left brand panel */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden border-r border-[var(--lp-border)]">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '52px 52px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 30% 30%, black 0%, transparent 80%)',
        }} />
        <div className="absolute inset-0 animate-[mesh-drift_22s_ease-in-out_infinite]" style={{
          background: 'radial-gradient(700px 500px at 20% 20%, rgba(201,255,61,0.12), transparent 60%), radial-gradient(700px 600px at 90% 90%, rgba(139,124,246,0.12), transparent 60%)',
        }} />
        <div className="relative z-10 flex flex-col justify-between p-14">
          <Link href="/" className="flex items-center gap-[10px] text-[20px] font-semibold tracking-tight text-[var(--lp-ink)] w-fit">
            <Workflow className="w-[24px] h-[24px] text-[var(--lp-accent)]" />
            <span>Flow<span className="font-bold">foundry</span></span>
          </Link>

          <div className="max-w-[440px]">
            <span className="inline-flex items-center gap-2 font-mono text-[11.5px] text-[var(--lp-accent)] tracking-widest uppercase mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--lp-accent)] animate-[pulse-ring_2.2s_infinite]" />
              {eyebrow}
            </span>
            <h1 className="font-serif font-normal text-[clamp(2.2rem,3.4vw,3.2rem)] leading-[1.08] tracking-tight text-[var(--lp-ink)] text-balance">
              {title}
            </h1>
            <p className="text-[15.5px] leading-[1.7] text-[var(--lp-ink-dim)] mt-6">{subtitle}</p>
          </div>

          <div className="flex items-center gap-3 text-[12.5px] text-[var(--lp-ink-faint)] font-mono">
            <span className="text-[var(--lp-accent)] tracking-widest">★★★★★</span>
            <span>Loved by modern teams</span>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-5 sm:p-8 relative">
        <div className="absolute inset-0 lg:hidden" style={{
          background: 'radial-gradient(700px 500px at 50% 0%, rgba(201,255,61,0.08), transparent 60%)',
        }} />
        <div className="relative z-10 w-full max-w-[420px]">
          {/* mobile logo */}
          <Link href="/" className="lg:hidden flex items-center gap-[10px] text-[20px] font-semibold tracking-tight text-[var(--lp-ink)] w-fit mb-10">
            <Workflow className="w-[24px] h-[24px] text-[var(--lp-accent)]" />
            <span>Flow<span className="font-bold">foundry</span></span>
          </Link>

          <div className="rounded-[20px] border border-[var(--lp-border)] p-7 sm:p-9 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.8)]" style={{ background: 'var(--lp-surface)' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  htmlFor,
  error,
  aside,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  aside?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={htmlFor} className="text-[13px] font-semibold text-[var(--lp-ink-dim)]">{label}</Label>
        {aside}
      </div>
      <div className="relative">{children}</div>
      {error && <p className="text-[var(--lp-red)] text-xs font-medium">{error}</p>}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

export default LoginPage
