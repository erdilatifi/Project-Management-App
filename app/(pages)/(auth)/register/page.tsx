'use client'
import React, { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { SignUp, SignInWithGoogle } from '@/app/actions/AuthActions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { UserPlus, Mail, Lock, CheckCircle2, Loader2 } from 'lucide-react'
import { useAuth } from '@/app/context/ContextApiProvider'

const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(32, 'Username must be at most 32 characters')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Only letters, numbers, _, ., - allowed')
    .transform((s) => s.trim()),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters long'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type RegisterFormData = z.infer<typeof registerSchema>

const RegisterPage = () => {
  const router = useRouter()
  const { user, loading: isCheckingAuth } = useAuth()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  useEffect(() => {
    if (!isCheckingAuth && user) {
      router.replace('/')
    }
  }, [user, isCheckingAuth, router])

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const result = await SignUp(data.email, data.password, data.username)

      if (result?.error) {
        setError('root', { message: result.error })
        toast.error(result.error)
      } else if (result?.success) {
        toast.success('Account created! Please check your email to confirm your account.')
        router.push('/login')
      }
    } catch (error) {
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
    } catch (error) {
      toast.error('Failed to sign in with Google')
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium tracking-wide">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex w-full">
      {/* Left side: Beautiful immersive background */}
      <div className="hidden lg:flex w-1/2 bg-zinc-950 items-center justify-center relative overflow-hidden">
        {/* Background textures */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-[5000ms]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen"></div>
        
        <div className="relative z-10 text-white max-w-xl p-12">
           <div className="flex items-center gap-3 mb-12 opacity-90 hover:opacity-100 transition-opacity">
             <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(var(--primary),0.5)]">
               <svg className="w-6 h-6 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
             </div>
             <span className="text-2xl font-bold tracking-widest uppercase">Flowfoundry</span>
           </div>
           <h1 className="text-6xl font-black mb-8 leading-[1.1] tracking-tight">Join the workflow revolution.</h1>
           <p className="text-xl text-zinc-400 font-medium leading-relaxed">Streamline your tasks, manage projects efficiently, and collaborate with your team like never before.</p>
        </div>
      </div>

      {/* Right side: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 bg-background relative">
        <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] lg:hidden"></div>
        <Card className="w-full max-w-md shadow-2xl border-border/50 relative z-10 bg-background/80 backdrop-blur-2xl">
          <CardHeader className="space-y-2 pb-8 pt-8">
            <div className="flex items-center justify-center mb-4 lg:hidden">
              <div className="p-3 bg-primary/10 rounded-xl">
                <UserPlus className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight text-center">
              Create an account
            </CardTitle>
            <CardDescription className="text-center text-base font-medium">
              Enter your details to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2.5">
                <Label htmlFor="username" className="text-sm font-semibold">Username</Label>
                <div className="relative">
                  <Input
                    id="username"
                    {...register('username')}
                    placeholder="yourname"
                    type="text"
                    className="pl-3 h-11 bg-muted/50 border-border/50 focus:bg-background"
                    aria-invalid={!!errors.username}
                  />
                </div>
                {errors.username && (
                  <p className="text-destructive text-xs font-medium mt-1">{errors.username.message}</p>
                )}
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="email" className="text-sm font-semibold">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    {...register('email')}
                    placeholder="you@example.com"
                    type="email"
                    className="pl-10 h-11 bg-muted/50 border-border/50 focus:bg-background"
                    aria-invalid={!!errors.email}
                  />
                </div>
                {errors.email && (
                  <p className="text-destructive text-xs font-medium mt-1">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    {...register('password')}
                    placeholder="••••••••"
                    type="password"
                    className="pl-10 h-11 bg-muted/50 border-border/50 focus:bg-background"
                    aria-invalid={!!errors.password}
                  />
                </div>
                {errors.password && (
                  <p className="text-destructive text-xs font-medium mt-1">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="confirmPassword" className="text-sm font-semibold">Confirm Password</Label>
                <div className="relative">
                  <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    {...register('confirmPassword')}
                    placeholder="••••••••"
                    type="password"
                    className="pl-10 h-11 bg-muted/50 border-border/50 focus:bg-background"
                    aria-invalid={!!errors.confirmPassword}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-destructive text-xs font-medium mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>

              {errors.root && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-destructive text-xs font-medium text-center">{errors.root.message}</p>
                </div>
              )}

              <Button type="submit" disabled={isSubmitting} className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20" size="lg">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Sign Up
                  </>
                )}
              </Button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center text-xs uppercase font-semibold">
                <span className="bg-background px-3 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-11 text-sm font-semibold border-border hover:bg-muted/50 transition-colors"
              size="lg"
              onClick={handleGoogleSignIn}
            >
              <svg className="w-5 h-5 mr-2.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign up with Google
            </Button>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pb-8">
            <div className="text-sm font-medium text-center text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:text-primary/80 hover:underline transition-colors">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

export default RegisterPage
