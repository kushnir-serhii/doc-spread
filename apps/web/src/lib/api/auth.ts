import { useMutation } from '@tanstack/react-query'
import { signIn } from '@/lib/mock'

export const useSignIn = () =>
  useMutation({
    mutationFn: (input: { email: string; password: string }) => signIn(input),
  })
