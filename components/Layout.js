import Link from 'next/link'
import { useContext, useEffect, useState, useRef } from 'react'
import UserContext from '~/lib/UserContext'
import { addChannel, fetchDirectMessageChannels, createOrFetchDMChannel, supabase, updateUserStatus } from '~/lib/Store'
import SidebarItem from '~/components/SidebarItem'
import { FaSearch, FaPlus, FaMoon, FaCog, FaSignOutAlt } from 'react-icons/fa'
import { useRouter } from 'next/router'
import StatusIndicator from './StatusIndicator'
import ProfilePicture from '~/components/ProfilePicture'
import { PhoneButton } from './voice-chat/phone-button'
import { VoiceModal } from './voice-chat/voice-modal'
import { useVoiceChat } from '~/lib/hooks/useVoiceChat'
import { toast } from 'sonner'

export default function Layout({ channels, activeChannelId, children }) {
  const { signOut, user } = useContext(UserContext)
  const [directMessages, setDirectMessages] = useState([])
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)
  const router = useRouter()
  const [isDMModalOpen, setDMModalOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchType, setSearchType] = useState(null) // 'channels', 'users', or 'messages'
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const searchInputRef = useRef(null)
  const [isVoiceChatOpen, setIsVoiceChatOpen] = useState(false)

  // Get the current channel
  let currentChannel = channels.find((c) => c.id === Number(activeChannelId));
  // Initialize voice chat
  const { status, isAISpeaking, currentText, connect, disconnect, audioElement, audioStream, localStream } = useVoiceChat(
    currentChannel?.other_participant?.id
  )

  // Fetch direct message channels and set up status listener
  useEffect(() => {
    const fetchDMChannels = async () => {
      if (user) {
        const dms = await fetchDirectMessageChannels(user.id)
        setDirectMessages(dms)
      }
    }
    fetchDMChannels()

    // Listen for user status changes
    const statusListener = supabase
      .channel('public:users')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users'
        },
        (payload) => {
          if (payload.new?.status) {
            // Update status in directMessages
            setDirectMessages(prevDMs => 
              prevDMs.map(dm => {
                if (dm.other_participant?.id === payload.new.id) {
                  return {
                    ...dm,
                    other_participant: {
                      ...dm.other_participant,
                      status: payload.new.status
                    }
                  }
                }
                return dm
              })
            )
          }
        }
      )
      .subscribe()

    // Listen for new DM messages
    const dmMessageListener = supabase
      .channel('public:dm_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          const newMessage = payload.new;
          
          // First check if this is a DM channel
          const { data: channels, error } = await supabase
            .from('channels')
            .select('*')
            .eq('id', newMessage.channel_id)
            .eq('is_direct', true);

          // If we found a DM channel
          if (channels && channels.length > 0) {
            const channel = channels[0];
            
            // Then check if the current user is a member
            const { data: channelsWithMembers, error: membersError } = await supabase
              .from('channels')
              .select(`
                *,
                channel_members!inner(user_id)
              `)
              .eq('id', channel.id);

            if (channelsWithMembers && channelsWithMembers.length > 0) {
              const channelWithMembers = channelsWithMembers[0];
              const isUserInvolved = channelWithMembers.channel_members.some(
                member => member.user_id === user.id
              );

              if (isUserInvolved) {
                // Fetch the updated DM channels to include the new message
                const dms = await fetchDirectMessageChannels(user.id);
                setDirectMessages(dms);
              }
            }
          }
        }
      )
      .subscribe()

    return () => {
      statusListener.unsubscribe()
      dmMessageListener.unsubscribe()
    }
  }, [user])

  // Handler for selecting a user from the DMModal
  const handleSelectUser = async (recipient) => {
    if (recipient.id === user.id) {
      alert('You cannot message yourself!')
      return
    }
    // Create or fetch existing DM channel
    const channel = await createOrFetchDMChannel(user.id, recipient.id)
    if (channel) {
      // Update directMessages state immediately
      setDirectMessages(prevDMs => {
        // Check if this channel already exists in the list
        const exists = prevDMs.some(dm => dm.id === channel.id);
        if (!exists) {
          // Add the new channel to the list
          return [...prevDMs, channel];
        }
        return prevDMs;
      });
      router.push(`/channels/${channel.id}?recipient=${recipient.id}`)
      setDMModalOpen(false)
    }
  }

  // Function to handle adding a new channel
  const handleAddChannel = async () => {
    const channelName = prompt('Enter the new channel name:')
    if (channelName) {
      const { data, error } = await addChannel(channelName, user.id)
      if (error) {
        alert('Error adding channel: ' + error.message)
      }
    }
  }

  // Get display name based on channel type
  const getDisplayName = () => {
    if (!currentChannel) return '';
    
    if (currentChannel.is_direct) {
      // Use the other_participant's username from the directMessages array
      const dmChannel = directMessages.find(dm => dm.id === currentChannel.id);
      return dmChannel?.other_participant?.username || 'Direct Message';
    }
    return `#${currentChannel.slug || 'Unnamed Channel'}`;
  };

  // Unified search handler
  const handleSearch = async (query) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    switch (searchType) {
      case 'channels':
        const { data: channels } = await supabase
          .from('channels')
          .select('*')
          .eq('is_direct', false)
          .ilike('slug', `%${query}%`)
        setSearchResults(channels || [])
        break
      
      case 'users':
        const { data: users } = await supabase
          .from('users')
          .select('id, username')
          .or(`username.ilike.%${query}%`)
          .neq('id', user.id)
        setSearchResults(users || [])
        break
      
      case 'messages':
        // First get the embedding for the search query
        const { data: embedding } = await supabase.functions.invoke('create-embedding', {
          body: { text: query }
        })

        // Get results from both regular search and semantic search
        const [textSearchResult, semanticSearchResult] = await Promise.all([
          // Regular text search
          supabase
            .from('messages')
            .select(`
              id,
              message,
              inserted_at,
              user_id,
              channel_id,
              users:user_id (username),
              channels:channel_id (slug, is_direct)
            `)
            .eq('channel_id', activeChannelId)
            .ilike('message', `%${query}%`)
            .order('inserted_at', { ascending: false })
            .limit(10),

          // Semantic search using match_messages_hybrid
          supabase.rpc('match_messages_hybrid', {
            query_text: query,
            query_embedding: embedding.embedding,
            match_threshold: 0.5,
            match_count: 10,
            vector_weight: 0.7
          }, {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
          }
        })
        ])

        // Get full message details for semantic search results
        const semanticMessages = semanticSearchResult.data?.length > 0
          ? await supabase
              .from('messages')
              .select(`
                id,
                message,
                inserted_at,
                user_id,
                channel_id,
                users:user_id (username),
                channels:channel_id (slug, is_direct)
              `)
              .in('id', semanticSearchResult.data.map(r => r.id))
          : { data: [] }

        // Combine and deduplicate results
        const combinedResults = [
          ...(textSearchResult.data || []),
          ...(semanticMessages.data || [])
        ].reduce((acc, curr) => {
          if (!acc.some(item => item.id === curr.id)) {
            acc.push(curr)
          }
          return acc
        }, [])

        // Sort by date
        combinedResults.sort((a, b) => 
          new Date(b.inserted_at) - new Date(a.inserted_at)
        )

        setSearchResults(combinedResults.slice(0, 10))
        break
    }
  }

  // Start search with specific type
  const startSearch = (type) => {
    setSearchType(type)
    setIsSearchOpen(true)
    setSearchQuery('')
    setSearchResults([])
    setTimeout(() => searchInputRef.current?.focus(), 100)
  }

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        startSearch('messages')
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
      setIsUserMenuOpen(false)
    } catch (error) {
      console.error('Error during sign out:', error)
    }
  }

  const handleVoiceChatToggle = () => {
    if (isVoiceChatOpen) {
      disconnect()
      setIsVoiceChatOpen(false)
    } else {
      connect()
      setIsVoiceChatOpen(true)
    }
  }

  const renderHeader = () => {
    const isDM = currentChannel?.is_direct
    const otherParticipant = currentChannel?.other_participant
    return (
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          {isDM && otherParticipant && (
            <div className="flex items-center gap-2">
              <ProfilePicture userId={otherParticipant?.id} size={32} />
              <StatusIndicator status={otherParticipant?.status} />
            </div>
          )}
          <h1 className="text-xl font-semibold">
            {getDisplayName()}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {isDM && (
            <PhoneButton 
              onClick={handleVoiceChatToggle} 
              isActive={isVoiceChatOpen} 
            />
          )}
          <button
            onClick={() => startSearch('messages')}
            className="p-2 hover:bg-gray-100 rounded-full dark:hover:bg-gray-800"
          >
            <FaSearch className="w-5 h-5" />
          </button>
        </div>
      </header>
    )
  }

  const renderSearchOverlay = () => (
    isSearchOpen && (
      <div className="absolute top-0 left-0 right-0 z-50 bg-white shadow-lg border-b">
        <div className="container max-w-3xl mx-auto p-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={
                searchType === 'channels' ? 'Search channels...' :
                searchType === 'users' ? 'Search users...' :
                'Search messages in this channel...'
              }
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-8 py-2 border rounded-md"
            />
            <button
              onClick={() => setIsSearchOpen(false)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          {searchResults.length > 0 && (
            <div className="mt-2 max-h-[60vh] overflow-auto rounded-md border bg-white">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => {
                    if (searchType === 'channels') {
                      router.push(`/channels/${result.id}`)
                    } else if (searchType === 'users') {
                      handleSelectUser(result)
                    } else if (searchType === 'messages') {
                      router.push(`/channels/${result.channel_id}?highlight=${result.id}`)
                    }
                    setIsSearchOpen(false)
                  }}
                  className="w-full p-4 text-left hover:bg-gray-50 border-b last:border-b-0"
                >
                  {searchType === 'messages' ? (
                    <>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <span className="font-medium text-gray-900">
                          {result.users.username}
                        </span>
                        <span>
                          {new Date(result.inserted_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-900">{result.message}</p>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
                        {searchType === 'channels' ? '#' : result.username?.[0].toUpperCase()}
                      </span>
                      <div>
                        <div className="font-medium">
                          {searchType === 'channels' ? result.slug : result.username}
                        </div>
                        {searchType === 'channels' && (
                          <div className="text-sm text-gray-500">Channel</div>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  )

  return (
    <div className="grid min-h-screen w-full grid-cols-[280px_1fr]">
      {/* Sidebar */}
      <nav className="flex flex-col border-r bg-slack-sidebar text-white h-screen sticky top-0">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <div className="relative" ref={userMenuRef}>
            <button 
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 font-semibold hover:opacity-75 transition-opacity"
            >
              <div className="relative">
                <ProfilePicture userId={user?.id} size={24} editable={false} />
                <StatusIndicator 
                  status={user?.status} 
                  className="absolute -bottom-0.5 -right-0.5 ring-1 ring-slack-sidebar"
                />
              </div>
              <span>{'ChatGenius'}</span>
            </button>

            {/* User Menu Dropdown */}
            {isUserMenuOpen && (
              <div className="absolute left-0 top-full mt-2 w-64 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                {/* User Info Section */}
                <div className="p-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <ProfilePicture userId={user?.id} size={40} editable={true} />
                      <StatusIndicator 
                        status={user?.status} 
                        className="absolute -bottom-0.5 -right-0.5 ring-1 ring-white"
                      />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{user?.email}</div>
                      <div className="text-sm text-gray-500">{String(user?.status).charAt(0).toUpperCase() + String(user?.status).slice(1).toLowerCase()}</div>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  {/* Status Section */}
                  <div className="px-4 py-2 text-sm text-gray-500">Set yourself as</div>
                  <button
                    onClick={() => {
                      updateUserStatus(user.id, 'ONLINE')
                      setIsUserMenuOpen(false)
                    }}
                    className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <StatusIndicator status="ONLINE" className="ring-1 ring-white" />
                    Online
                  </button>
                  <button
                    onClick={() => {
                      updateUserStatus(user.id, 'OFFLINE')
                      setIsUserMenuOpen(false)
                    }}
                    className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <StatusIndicator status="OFFLINE" className="ring-1 ring-white" />
                    Away
                  </button>

                  {/* Preferences Section */}
                  <div className="border-t border-gray-100 my-1"></div>
                  <button className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                    <FaCog className="h-4 w-4" />
                    Preferences
                  </button>
                  <button className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                    <FaMoon className="h-4 w-4" />
                    Theme
                  </button>

                  {/* Sign Out Section */}
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={handleSignOut}
                    className="w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <FaSignOutAlt className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Channels List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-300">Channels</h3>
              <button
                onClick={() => startSearch('channels')}
                className="h-10 w-10 flex items-center justify-center rounded hover:bg-slack-hover"
              >
                <FaPlus className="h-4 w-4" />
              </button>
            </div>
            <ul className="space-y-1">
              {channels
                .filter(channel => !channel.is_direct)
                .map((channel) => (
                  <SidebarItem
                    key={channel.id}
                    channel={channel}
                    isActiveChannel={channel.id === Number(activeChannelId)}
                    user={user}
                  />
                ))}
            </ul>
            
            <div className="flex items-center justify-between mt-4">
              <h3 className="text-sm font-medium text-gray-300">Direct Messages</h3>
              <button
                onClick={() => startSearch('users')}
                className="h-10 w-10 flex items-center justify-center rounded hover:bg-slack-hover"
              >
                <FaPlus className="h-4 w-4" />
              </button>
            </div>
            <ul className="space-y-1">
              {directMessages
                .filter(channel => channel.is_direct)
                .map((channel) => (
                  <SidebarItem
                    key={channel.id}
                    channel={channel}
                    isActiveChannel={channel.id === Number(activeChannelId)}
                    user={channel.other_participant.username}
                    userStatus={channel.other_participant.status}
                    otherParticipantID={channel.other_participant.id}
                  />
                ))}
            </ul>
          </div>
        </div>
      </nav>
      {/* Main Content */}
      <div className="flex flex-col h-screen">
        <div className="h-16 border-b bg-white z-10 sticky top-0">
          {renderHeader()}
        </div>
        <div className="flex-1 overflow-y-auto relative">
          {renderSearchOverlay()}
          {children}
        </div>
      </div>
      {/* DM Modal */}
      {isDMModalOpen && (
        <DMModal
          onClose={() => setDMModalOpen(false)}
          onSelectUser={handleSelectUser}
          currentUserId={user.id}
        />
      )}
      {/* Voice chat modal */}
      { currentChannel?.is_direct && (
        <VoiceModal
          isOpen={isVoiceChatOpen}
          onClose={handleVoiceChatToggle}
          otherParticipant={currentChannel.other_participant}
          status={status}
          isAISpeaking={isAISpeaking}
          currentText={currentText}
          audioElement={audioElement}
          audioStream={audioStream}
          localStream={localStream}
        />
      )}
    </div>
  )
}

