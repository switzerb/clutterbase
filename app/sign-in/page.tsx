'use client'

import { useActionState, useState } from 'react'
import { Alert, Button, Card, Input, Label, Spinner, Tabs, TextField } from '@heroui/react'
import { createClient } from '@/lib/supabase/client'
import { signInWithPassword, signInWithMagicLink, type SignInState } from './actions'

function signInWithGoogle() {
  const supabase = createClient()
  supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  })
}

export default function SignInPage() {
  const [mode, setMode] = useState('magic-link')

  const [passwordState, passwordAction, passwordPending] = useActionState<SignInState, FormData>(
    signInWithPassword,
    null
  )
  const [magicState, magicAction, magicPending] = useActionState<SignInState, FormData>(
    signInWithMagicLink,
    null
  )

  if (magicState?.sent) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <Card.Content>
            <Alert status="success">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Check your email</Alert.Title>
                <Alert.Description>We sent you a sign-in link.</Alert.Description>
              </Alert.Content>
            </Alert>
          </Card.Content>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <Card.Header>
          <Card.Title>Sign in to Clutterbase</Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-col gap-4">
          <Button className="w-full" variant="outline" onPress={signInWithGoogle}>
            Sign in with Google
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-current opacity-20" />
            <span className="text-xs opacity-50">or</span>
            <div className="h-px flex-1 bg-current opacity-20" />
          </div>

          <Tabs
            className="w-full"
            selectedKey={mode}
            onSelectionChange={(key) => setMode(key as string)}
          >
            <Tabs.ListContainer>
              <Tabs.List aria-label="Sign-in method">
                <Tabs.Tab id="magic-link">
                  Magic link
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="password">
                  Password
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>

            <Tabs.Panel id="magic-link" className="pt-4">
              <form action={magicAction} className="flex flex-col gap-4">
                <TextField name="email" type="email" isRequired>
                  <Label>Email</Label>
                  <Input placeholder="you@example.com" variant="secondary" />
                </TextField>
                {magicState?.error && (
                  <Alert status="danger">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Description>{magicState.error}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                )}
                <Button className="w-full" type="submit" isPending={magicPending}>
                  {({ isPending }) => (
                    <>
                      {isPending && <Spinner size="sm" color="current" />}
                      {isPending ? 'Sending…' : 'Send magic link'}
                    </>
                  )}
                </Button>
              </form>
            </Tabs.Panel>

            <Tabs.Panel id="password" className="pt-4">
              <form action={passwordAction} className="flex flex-col gap-4">
                <TextField name="email" type="email" isRequired>
                  <Label>Email</Label>
                  <Input placeholder="you@example.com" variant="secondary" />
                </TextField>
                <TextField name="password" type="password" isRequired>
                  <Label>Password</Label>
                  <Input placeholder="••••••••" variant="secondary" />
                </TextField>
                {passwordState?.error && (
                  <Alert status="danger">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Description>{passwordState.error}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                )}
                <Button className="w-full" type="submit" isPending={passwordPending}>
                  {({ isPending }) => (
                    <>
                      {isPending && <Spinner size="sm" color="current" />}
                      {isPending ? 'Signing in…' : 'Sign in'}
                    </>
                  )}
                </Button>
              </form>
            </Tabs.Panel>
          </Tabs>
        </Card.Content>
      </Card>
    </main>
  )
}