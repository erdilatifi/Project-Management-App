'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { UpdatePassword } from '@/app/actions/AuthActions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Lock, CheckCircle2, KeyRound } from 'lucide-react'

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters long'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

const ResetPasswordPage = () => {
  const router = useRouter()
  const [isSuccess, setIsSuccess] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      const result = await UpdatePassword(data.password)

      if (result?.error) {
        setError('root', { message: result.error })
        toast.error(result.error)
      } else if (result?.success) {
        setIsSuccess(true)
        toast.success('Password updated successfully!')
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      }
    } catch (error) {
      const errorMessage = 'Something went wrong. Please try again.'
      setError('root', { message: errorMessage })
      toast.error(errorMessage)
    }
  }

  if (isSuccess) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <Card className="w-full min-w-[350px] shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-2">
              <div className="p-3 bg-green-500/10 rounded-full">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center">
              Password updated!
            </CardTitle>
            <CardDescription className="text-center">
              Your password has been successfully updated. Redirecting to login...
            </CardDescription>
          </CardHeader>
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
            Reset your password
          </CardTitle>
          <CardDescription className="text-center">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  {...register('confirmPassword')}
                  placeholder="••••••••"
                  type="password"
                  className="pl-10"
                  aria-invalid={!!errors.confirmPassword}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-destructive text-sm mt-1">{errors.confirmPassword.message}</p>
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
                  Updating password...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 mr-2" />
                  Update password
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default ResetPasswordPage
