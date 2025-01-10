import Layout from '~/components/Layout'
import Message from '~/components/Message'
import MessageInput from '~/components/MessageInput'
import { useRouter } from 'next/router'
import { useStore } from '~/lib/Store'
import { useContext, useEffect, useRef, useState } from 'react'
import UserContext from '~/lib/UserContext'
import ThreadView from '~/components/ThreadView'

const ChannelsPage = () => {
  const router = useRouter()
  const { user, userLoaded } = useContext(UserContext)
  const messagesEndRef = useRef(null)
  const [activeThread, setActiveThread] = useState(null)
  const [prevMessagesLength, setPrevMessagesLength] = useState(0)

  const { id: channelId, highlight } = router.query
  const { messages, channels } = useStore({ channelId })

  // Redirect if user is not authenticated
  useEffect(() => {
    if (userLoaded && !user) {
      router.push('/login')
    }
  }, [userLoaded, user, router])

  // Only scroll to bottom when new messages are added
  useEffect(() => {
    if (messages.length > prevMessagesLength && !highlight) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    setPrevMessagesLength(messages.length)
  }, [messages.length, prevMessagesLength, highlight])

  // Show loading state while checking authentication
  if (!userLoaded || !user) {
    return <div>Loading...</div>
  }

  return (
    <Layout channels={channels} activeChannelId={channelId}>
      <div className="flex h-full">
        <div className={`flex-1 flex flex-col ${activeThread ? 'w-7/12' : 'w-full'}`}>
          <div className="flex-1 overflow-y-auto px-4">
            {messages.map((message) => (
              <Message 
                key={message.id} 
                message={message}
                highlight={message.id === parseInt(highlight)}
                onThreadClick={setActiveThread}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-4 border-t">
            <MessageInput channelId={channelId} userId={user.id} />
          </div>
        </div>
        
        {activeThread && (
          <div className="w-5/12 border-l">
            <ThreadView 
              parentMessage={activeThread} 
              onClose={() => setActiveThread(null)} 
            />
          </div>
        )}
      </div>
    </Layout>
  )
}

export default ChannelsPage
