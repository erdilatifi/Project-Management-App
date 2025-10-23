'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { SignIn, SignInWithGoogle } from '@/app/actions/AuthActions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { LogIn, Mail, Lock, Loader2 } from 'lucide-react'
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
      router.replace('/')
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
        router.push('/')
        router.refresh()
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
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="w-full min-w-[350px]  shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-2">
            <div className="p-3 bg-primary/10 rounded-full">
              <LogIn className="w-6 h-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Welcome back
          </CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  {...register('email')}
                  placeholder="you@example.com"
                  type="email"
                  className="pl-10"
                  aria-invalid={!!errors.email}
                />
              </div>
              {errors.email && (
                <p className="text-destructive text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  {...register('password')}
                  placeholder="••••••••"
                  type="password"
                  className="pl-10"
                  aria-invalid={!!errors.password}
                />
              </div>
              {errors.password && (
                <p className="text-destructive text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            {errors.root && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-destructive text-sm text-center">{errors.root.message}</p>
              </div>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
              {isSubmitting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Logging in...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            size="lg"
            onClick={handleGoogleSignIn}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
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
            Sign in with Google
          </Button>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

export default LoginPage
