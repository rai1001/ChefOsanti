import type { AuthResult, LoginInput } from '../domain/types'

export async function fakeLogin(input: LoginInput): Promise<AuthResult> {
  await new Promise((resolve) => setTimeout(resolve, 150))
  return {
    message: `Login placeholder para ${input.email}`,
  }
}
