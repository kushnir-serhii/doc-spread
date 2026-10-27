import { useMutation } from '@tanstack/react-query'
import { signIn, signUp } from '@/lib/mock'

export const useSignIn = () =>
  useMutation({
    mutationFn: (input: { email: string; password: string }) => signIn(input),
  })

export const useSignUp = () =>
  useMutation({
    mutationFn: (input: { name: string; email: string; password: string }) => signUp(input),
  })
