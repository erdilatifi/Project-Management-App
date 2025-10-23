'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ResetPassword } from '@/app/actions/AuthActions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Mail, ArrowLeft, KeyRound } from 'lucide-react'

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

const ForgotPasswordPage = () => {
  const [emailSent, setEmailSent] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      const result = await ResetPassword(data.email)

      if (result?.error) {
        setError('root', { message: result.error })
        toast.error(result.error)
      } else if (result?.success) {
        setEmailSent(true)
        toast.success('Password reset email sent! Please check your inbox.')
      }
    } catch (error) {
      const errorMessage = 'Something went wrong. Please try again.'
      setError('root', { message: errorMessage })
      toast.error(errorMessage)
    }
  }

  if (emailSent) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <Card className="w-full min-w-[350px] shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-2">
              <div className="p-3 bg-green-500/10 rounded-full">
                <Mail className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center">
              Check your email
            </CardTitle>
            <CardDescription className="text-center">
              We've sent you a password reset link. Please check your inbox and follow the instructions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground text-center">
                  Didn't receive the email? Check your spam folder or try again in a few minutes.
                </p>
              </div>
              <Link href="/login" className="block">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="w-full min-w-[350px] shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-2">
            <div className="p-3 bg-primary/10 rounded-full">
              <KeyRound className="w-6 h-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Forgot password?
          </CardTitle>
          <CardDescription className="text-center">
            Enter your email address and we'll send you a link to reset your password
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

            {errors.root && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-destructive text-sm text-center">{errors.root.message}</p>
              </div>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
              {isSubmitting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send reset link
                </>
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Link href="/login" className="w-full">
            <Button variant="ghost" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}

export default ForgotPasswordPage
