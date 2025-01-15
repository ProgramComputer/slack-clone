import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

/**
 * @param {number} channelId the currently selected Channel
 */
export const useStore = (props) => {
  const [channels, setChannels] = useState([])
  const [messages, setMessages] = useState([])
  const [users] = useState(new Map())
  const [newMessage, handleNewMessage] = useState(null)
  const [newChannel, handleNewChannel] = useState(null)
  const [newOrUpdatedUser, handleNewOrUpdatedUser] = useState(null)
  const [deletedChannel, handleDeletedChannel] = useState(null)
  const [deletedMessage, handleDeletedMessage] = useState(null)
  const [newReaction, handleNewReaction] = useState(null)
  const [removedReaction, handleRemovedReaction] = useState(null)

  // Load initial data and set up listeners
  useEffect(() => {
    // Get Channels
    fetchChannels(setChannels)
    // Listen for new and deleted messages
    const messageListener = supabase
      .channel('public:messages')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages'
        }, 
        async (payload) => {
          const newMsg = payload.new
          // Only handle non-thread messages in main chat
          if (!newMsg.thread_parent_id) {
            // Fetch the author data
            const { data: author } = await supabase
              .from('users')
              .select('id, username, status')
              .eq('id', newMsg.user_id)
              .single()
            
            handleNewMessage({
              ...newMsg,
              author,
              reactions: []
            })
          }
        }
      )
      .on('postgres_changes', 
        { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'messages' 
        }, 
        (payload) => handleDeletedMessage(payload.old)
      )
      .subscribe()
    // Listen for changes to our users
    const userListener = supabase
      .channel('public:users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) =>
        handleNewOrUpdatedUser(payload.new)
      )
      .subscribe()
    // Listen for new and deleted channels
    const channelListener = supabase
      .channel('public:channels')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'channels' }, (payload) =>
        handleNewChannel(payload.new)
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'channels' }, (payload) =>
        handleDeletedChannel(payload.old)
      )
      .subscribe()
    // Listen for new and deleted reactions
    const reactionListener = supabase
      .channel('public:message_reactions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_reactions' },
        (payload) => {
          handleNewReaction(payload.new)
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'message_reactions' },
        (payload) => {
          handleRemovedReaction(payload.old)
        }
      )
      .subscribe()
    // Add a separate listener for thread replies
    const threadListener = supabase
      .channel('public:thread_messages')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: 'thread_parent_id.is.not.null' // Only listen for thread replies
        }, 
        (payload) => {
          // Update the reply count on the parent message
          setMessages(currentMessages => 
            currentMessages.map(msg => {
              if (msg.id === payload.new.thread_parent_id) {
                return {
                  ...msg,
                  reply_count: (msg.reply_count || 0) + 1
                };
              }
              return msg;
            })
          );
        }
      )
      .subscribe()
    // Cleanup on unmount
    return () => {
      messageListener.unsubscribe()
      supabase.removeChannel(userListener)
      supabase.removeChannel(channelListener)
      supabase.removeChannel(reactionListener)
      supabase.removeChannel(threadListener)
    }
  }, [])

  // Update when the route changes
  useEffect(() => {
    if (props?.channelId > 0) {
      fetchMessages(props.channelId, (messages) => {
        messages.forEach((x) => users.set(x.user_id, x.author))
        setMessages(messages)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.channelId])

  // New message received from Postgres
  useEffect(() => {
    if (newMessage && newMessage.channel_id === Number(props.channelId)) {
      setMessages(prevMessages => [...prevMessages, newMessage])
    }
  }, [newMessage, props.channelId])

  // Deleted message received from postgres
  useEffect(() => {
    if (deletedMessage) setMessages(messages.filter((message) => message.id !== deletedMessage.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deletedMessage])

  // New channel received from Postgres
  useEffect(() => {
    if (newChannel) setChannels(channels.concat(newChannel))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newChannel])

  // Deleted channel received from postgres
  useEffect(() => {
    if (deletedChannel) setChannels(channels.filter((channel) => channel.id !== deletedChannel.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deletedChannel])

  // New or updated user received from Postgres
  useEffect(() => {
    if (newOrUpdatedUser) users.set(newOrUpdatedUser.id, newOrUpdatedUser)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newOrUpdatedUser])

  // New reaction received from Postgres
  useEffect(() => {
    if (newReaction) {
      setMessages((prevMessages) =>
        prevMessages.map((message) => {
          if (message.id === newReaction.message_id) {
            return {
              ...message,
              reactions: [...(message.reactions || []), newReaction],
            }
          }
          return message
        })
      )
    }
  }, [newReaction])

  // Removed reaction received from Postgres
  useEffect(() => {
    if (removedReaction) {
      setMessages((prevMessages) =>
        prevMessages.map((message) => {
          if (message.id === removedReaction.message_id) {
            return {
              ...message,
              reactions: (message.reactions || []).filter(
                (reaction) =>
                  !(
                    reaction.user_id === removedReaction.user_id &&
                    reaction.emoji === removedReaction.emoji
                  )
              ),
            }
          }
          return message
        })
      )
    }
  }, [removedReaction])

  return {
    messages: messages.map((x) => ({
      ...x,
      author: x.author || users.get(x.user_id) || { username: x.user_id }
    })),
    channels: channels ? channels.sort((a, b) => a.slug.localeCompare(b.slug)) : [],
    users,
  }
}

/**
 * Fetch all channels
 * @param {function} setState Optionally pass in a hook or callback to set the state
 */
export const fetchChannels = async (setState) => {
  try {
    let { data } = await supabase
      .from('channels')
      .select(`
        *,
        channel_members(
          user_id,
          users(
            id,
            username,
            status
          )
        )
      `)
    if (setState) setState(data)
    return data
  } catch (error) {
    console.log('error', error)
  }
}

/**
 * Fetch a single user
 * @param {number} userId
 * @param {function} setState Optionally pass in a hook or callback to set the state
 */
export const fetchUser = async (userId, setState) => {
  try {
    let { data } = await supabase.from('users').select(`*`).eq('id', userId)
    let user = data[0]
    if (setState) setState(user)
    return user
  } catch (error) {
    console.log('error', error)
  }
}

/**
 * Fetch all messages and their authors
 * @param {number} channelId
 * @param {function} setState Optionally pass in a hook or callback to set the state
 */
export const fetchMessages = async (channelId, setState) => {
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        author:users(*),
        reactions:message_reactions(
          *,
          user:users(*)
        )
      `)
      .eq('channel_id', channelId)
      .is('thread_parent_id', null)  // Only fetch non-thread messages
      .order('inserted_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    setState(messages);
  } catch (error) {
    console.error('Error in fetchMessages:', error);
  }
};

/**
 * Insert a new channel into the DB
 * @param {string} slug The channel name
 * @param {number} user_id The channel creator
 */
export const addChannel = async (slug, user_id) => {
  try {
    let { data } = await supabase
      .from('channels')
      .insert([{ slug, created_by: user_id }])
      .select()
    return data
  } catch (error) {
    console.log('error', error)
  }
}

/**
 * Insert a new message into the DB
 * @param {string} message The message text
 * @param {number} channel_id
 * @param {number} user_id The author
 */
export const addMessage = async (message, fileUrl, channel_id, user_id) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert([{ message, file_url: fileUrl, channel_id, user_id }])
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding message:', error);
  }
};

/**
 * Delete a channel from the DB
 * @param {number} channel_id
 */
export const deleteChannel = async (channel_id) => {
  try {
    let { data } = await supabase.from('channels').delete().match({ id: channel_id })
    return data
  } catch (error) {
    console.log('error', error)
  }
}

/**
 * Delete a message from the DB
 * @param {number} message_id
 */
export const deleteMessage = async (message_id) => {
  try {
    let { data } = await supabase.from('messages').delete().match({ id: message_id })
    return data
  } catch (error) {
    console.log('error', error)
  }
}

// Function to create or fetch an existing DM channel between two users
export const createOrFetchDMChannel = async (userId1, userId2) => {
  try {
    // Create a consistent slug format for DM channels
    const dmSlug = [userId1, userId2].sort().join('_dm_');

    // First try to find an existing DM channel
    const { data: existingChannel, error: fetchError } = await supabase
      .from('channels')
      .select(`
        *,
        channel_members(
          user_id,
          users(
            id,
            username,
            status
          )
        )
      `)
      .eq('slug', dmSlug)
      .eq('is_direct', true)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Error fetching existing channel:', fetchError);
      return null;
    }

    // If channel exists, transform and return it
    if (existingChannel) {
      return {
        ...existingChannel,
        other_participant: existingChannel.channel_members
          .find(member => member.user_id !== userId1)?.users
      };
    }

    // If no channel exists, create a new one
    const { data: newChannel, error: insertError } = await supabase
      .from('channels')
      .insert([{
        slug: dmSlug,
        created_by: userId1,
        is_direct: true
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating new channel:', insertError);
      return null;
    }

    // Add both users to channel_members
    const { error: membersError } = await supabase
      .from('channel_members')
      .insert([
        { channel_id: newChannel.id, user_id: userId1 },
        { channel_id: newChannel.id, user_id: userId2 }
      ]);

    if (membersError) {
      console.error('Error adding channel members:', membersError);
      return null;
    }

    // Fetch the other user's information
    const { data: otherUser } = await supabase
      .from('users')
      .select('id, username, status')
      .eq('id', userId2)
      .single();

    // Return the channel with the other participant's information
    return {
      ...newChannel,
      other_participant: otherUser
    };
  } catch (err) {
    console.error('Error in createOrFetchDMChannel:', err);
    return null;
  }
};

// Function to fetch direct message channels for a user
export const fetchDirectMessageChannels = async (userId) => {
  try {
    // First get all DM channels where the current user is a member
    const { data: userChannels, error: channelsError } = await supabase
      .from('channel_members')
      .select('channel_id')
      .eq('user_id', userId);

    if (channelsError) throw channelsError;

    const channelIds = userChannels.map(uc => uc.channel_id);

    // Then get all members of these channels with status
    const { data: channels, error } = await supabase
      .from('channels')
      .select(`
        *,
        channel_members(
          user_id,
          users(
            id,
            username,
            status
          )
        )
      `)
      .eq('is_direct', true)
      .in('id', channelIds);

    if (error) {
      console.error('Error fetching direct message channels:', error);
      return [];
    }

    // Transform the data to include other participant's info
    const transformedChannels = channels.map(channel => ({
      ...channel,
      other_participant: channel.channel_members
        .find(member => member.user_id !== userId)?.users
    }));

    return transformedChannels;
  } catch (err) {
    console.error('Error in fetchDirectMessageChannels:', err);
    return [];
  }
};

/**
 * Add a reaction to a message
 * @param {number} messageId
 * @param {string} userId
 * @param {string} emoji
 */
export const addReaction = async (messageId, userId, emoji) => {
  try {
    const { data, error } = await supabase
      .from('message_reactions')
      .insert([{ message_id: messageId, user_id: userId, emoji }])
      .select()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error adding reaction:', error)
  }
}

/**
 * Remove a reaction from a message
 * @param {number} messageId
 * @param {string} userId
 * @param {string} emoji
 */
export const removeReaction = async (messageId, userId, emoji) => {
  try {
    const { data, error } = await supabase
      .from('message_reactions')
      .delete()
      .match({ message_id: messageId, user_id: userId, emoji })

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error removing reaction:', error)
  }
}

// Function to handle new reaction
const handleNewReaction = (reaction) => {
  setMessages((currentMessages) => {
    return currentMessages.map((msg) => {
      if (msg.id === reaction.message_id) {
        return {
          ...msg,
          reactions: [...(msg.reactions || []), reaction],
        };
      }
      return msg;
    });
  });
};

// Function to handle removed reaction
const handleRemovedReaction = (reaction) => {
  setMessages((currentMessages) => {
    return currentMessages.map((msg) => {
      if (msg.id === reaction.message_id) {
        return {
          ...msg,
          reactions: (msg.reactions || []).filter(
            (r) => !(r.user_id === reaction.user_id && r.emoji === reaction.emoji)
          ),
        };
      }
      return msg;
    });
  });
};

export const uploadFile = async (file, userId) => {
  console.log(file);
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}-${Date.now()}.${fileExt}`;
  const { data, error } = await supabase.storage
    .from('uploads')
    .upload(fileName, file, {
      contentType: file.type,
      cacheControl: '3600'
    });

  if (error) {
    return { error };
  }

  const { data: publicUrlData } = supabase.storage
    .from('uploads')
    .getPublicUrl(fileName);

  return { data: { publicUrl: publicUrlData.publicUrl } };
};

export const fetchThreadReplies = async (threadParentId) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        author:users(*),
        reactions:message_reactions(
          *,
          user:users(*)
        )
      `)
      .eq('thread_parent_id', threadParentId)
      .order('inserted_at', { ascending: true });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching thread replies:', error);
    return [];
  }
};

export const addThreadReply = async (message, fileUrl, channelId, userId, threadParentId) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert([{
        message,
        file_url: fileUrl,
        channel_id: channelId,
        user_id: userId,
        thread_parent_id: threadParentId,
      }])
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Error adding thread reply:', error);
  }
};

export const updateUserStatus = async (userId, status) => {
  try {
    // Add validation
    if (!userId) throw new Error('User ID is required');
    if (!status) throw new Error('Status is required');
    
    // Validate status is one of the allowed values
    const validStatuses = ['ONLINE', 'OFFLINE'];
    if (!validStatuses.includes(status.toUpperCase())) {
      throw new Error('Invalid status value');
    }

    const { data, error } = await supabase
      .from('users')
      .update({ status: status.toUpperCase() })
      .eq('id', userId)
      .select('id, username, status')
      .single();
    
    if (error) {
      console.error('Error in updateUserStatus:', error);
      return { error };
    }
    
    return { data };
  } catch (error) {
    console.error('Error updating user status:', error);
    return { error };
  }
};

// Subscribe to user status changes
export const subscribeToUserStatus = (callback) => {
  return supabase
    .channel('public:users')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: 'status IS NOT NULL'
      },
      callback
    )
    .subscribe();
};

export const queryUserMessages = async (query, userId) => {
  try {
    const { data, error } = await supabase.functions.invoke('chat-rag', {
      body: { query, userId }
    })
    if (error) throw error
    return data

  } catch (error) {
    console.error('Error querying messages:', error)
    return null
  }
}
