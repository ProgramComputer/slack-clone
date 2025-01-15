import '~/styles/style.scss'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import UserContext from 'lib/UserContext'
import { supabase } from 'lib/Store'
import { jwtDecode } from 'jwt-decode'
import { updateUserStatus } from 'lib/Store'
import { AgentMessagesProvider } from 'lib/AgentMessagesProvider'

export default function SupabaseSlackClone({ Component, pageProps }) {
  const [userLoaded, setUserLoaded] = useState(false)
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const router = useRouter()

  useEffect(() => {
    async function saveSession(session) {
      setSession(session)
      const currentUser = session?.user
      if (session) {
        const jwt = jwtDecode(session.access_token)
        currentUser.appRole = jwt.user_role

        // Update user status to ONLINE and get current status
        const { data: updatedUser } = await updateUserStatus(currentUser.id, 'ONLINE')
        if (updatedUser) {
          currentUser.status = updatedUser.status
        }
      }
      setUser(currentUser ?? null)
      setUserLoaded(!!currentUser)
      if (currentUser && router.pathname === '/') {
        router.push('/channels/[id]', '/channels/1')
      }

      supabase.auth.getSession().then(({ data: { session } }) => saveSession(session))

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_OUT') {
            if (user?.id) {
              await updateUserStatus(user.id, 'OFFLINE')
            }
            saveSession(null)
          } else if (session) {
            saveSession(session)
          }
        }
      )

      // Set up status subscription
      const statusSubscription = supabase
        .channel('public:users')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users'
          },
          (payload) => {
            if (payload.new && user?.id === payload.new.id) {
              setUser(prev => ({ ...prev, status: payload.new.status }))
            }
          }
        )
        .subscribe()

      // Handle window/tab close
      const handleBeforeUnload = async () => {
        if (user?.id) {
          await updateUserStatus(user.id, 'OFFLINE')
        }
      }
      window.addEventListener('beforeunload', handleBeforeUnload)

      return () => {
        subscription.unsubscribe()
        statusSubscription.unsubscribe()
        window.removeEventListener('beforeunload', handleBeforeUnload)
        if (user?.id) {
          updateUserStatus(user.id, 'OFFLINE')
        }
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => saveSession(session))

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          if (user?.id) {
            await updateUserStatus(user.id, 'OFFLINE')
          }
          saveSession(null)
        } else if (session) {
          saveSession(session)
        }
      }
    )

    // Set up status subscription
    const statusSubscription = supabase
      .channel('public:users')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users'
        },
        (payload) => {
          if (payload.new && user?.id === payload.new.id) {
            setUser(prev => ({ ...prev, status: payload.new.status }))
          }
        }
      )
      .subscribe()

    // Handle window/tab close
    const handleBeforeUnload = async () => {
      if (user?.id) {
        await updateUserStatus(user.id, 'OFFLINE')
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      subscription.unsubscribe()
      statusSubscription.unsubscribe()
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (user?.id) {
        updateUserStatus(user.id, 'OFFLINE')
      }
    }
  }, [])

  const signOut = async () => {
    if (user?.id) {
      await updateUserStatus(user.id, 'OFFLINE')
    }
    const { error } = await supabase.auth.signOut()
    if (!error) {
      router.push('/')
    }
  }

  return (
    <UserContext.Provider
      value={{
        userLoaded,
        user,
        signOut,
      }}
    >
      <AgentMessagesProvider>
        <Component {...pageProps} />
      </AgentMessagesProvider>
    </UserContext.Provider>
  )
}
