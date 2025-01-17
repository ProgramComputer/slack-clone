import Layout from '~/components/Layout'
import Message from '~/components/Message'
import MessageInput from '~/components/MessageInput'
import { useRouter } from 'next/router'
import { useStore } from '~/lib/Store'
import { useContext, useEffect, useRef, useState } from 'react'
import UserContext from '~/lib/UserContext'
import ThreadView from '~/components/ThreadView'
import { useRAGMessages as useRAGMessages } from '~/lib/hooks/useRAGMessages'

const ChannelsPage = () => {
  const router = useRouter()
  const { user, userLoaded } = useContext(UserContext)
  const messagesEndRef = useRef(null)
  const [activeThread, setActiveThread] = useState(null)
  const [prevMessagesLength, setPrevMessagesLength] = useState(0)
  const { agentMessages: ragMessages } = useRAGMessages()

  const { id: channelId, highlight, recipient } = router.query
  const { messages, channels } = useStore({ channelId })

  // Get the current channel and check if it's a DM
  const currentChannel = channels.find(c => c.id === Number(channelId))
  const otherParticipantId = recipient;
  // Combine regular messages with agent messages
  const allMessages = [...messages, ...ragMessages].sort((a, b) => 
    new Date(a.inserted_at) - new Date(b.inserted_at)
  )

  // Redirect if user is not authenticated
  useEffect(() => {
    if (userLoaded && !user) {
      router.push('/login')
    }
  }, [userLoaded, user, router])

  // Only scroll to bottom when new messages are added
  useEffect(() => {
    if ((messages.length + ragMessages.length) > prevMessagesLength && !highlight) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    setPrevMessagesLength(messages.length + ragMessages.length)
  }, [messages.length, ragMessages.length, prevMessagesLength, highlight])

  // Show loading state while checking authentication
  if (!userLoaded || !user) {
    return <div>Loading...</div>
  }

  return (
    <Layout 
      channels={channels} 
      activeChannelId={channelId} 
    >
      <div className="flex h-full">
        <div className={`flex-1 flex flex-col ${activeThread ? 'w-7/12' : 'w-full'}`}>
          <div className="flex-1 overflow-y-auto px-4">
            {allMessages.map((message) => (
              <Message 
                key={message.id} 
                message={message}
                highlight={message.id === parseInt(highlight)}
                onThreadClick={!message.isRAGMessage && !message.isRagResponse ? setActiveThread : undefined}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-4 border-t">
            <MessageInput 
              channelId={channelId} 
              userId={user.id} 
              placeholder={""}
              otherParticipantId={otherParticipantId}
            />
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
