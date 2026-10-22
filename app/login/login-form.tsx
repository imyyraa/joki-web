'use client'

import { useActionState } from 'react'
import { login } from './actions'

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, undefined)
  const kelas =
    'mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm'

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={kelas}
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={kelas}
        />
      </div>
      {state?.error && (
        <p className="rounded-md border border-red-600/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Masuk...' : 'Masuk'}
      </button>
    </form>
  )
}