import { useState, useEffect, useContext } from 'react'
import { createClient } from '@supabase/supabase-js'
import * as pdfjsLib from 'pdfjs-dist';
import UserContext from './UserContext'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

/**
 * @param {number} channelId the currently selected Channel
 */
export const useStore = (props) => {
  const { user } = useContext(UserContext)
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
    if (user?.id) {
      // Get Channels
      fetchChannels(setChannels, user.id)
    }
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
  }, [user?.id])

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
    if (newChannel && user?.id) {
      // Fetch the complete channel with members to ensure consistent structure
      const fetchCompleteChannel = async () => {
        const { data: fullChannel } = await supabase
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
          .eq('id', newChannel.id)
          .single();

        if (fullChannel) {
          const transformedChannel = transformChannelData(fullChannel, user.id);
          if (transformedChannel) {
            setChannels(prevChannels => [...prevChannels, transformedChannel]);
          }
        }
      };
      
      fetchCompleteChannel();
    }
  }, [newChannel, user?.id]);

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
 * @param {string} userId The current user's ID
 */
export const fetchChannels = async (setState, userId) => {
  try {
    let { data: channels, error } = await supabase
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
      `);

    if (error) {
      console.error('Error fetching channels:', error);
      return [];
    }

    const transformedChannels = channels.map(channel => transformChannelData(channel, userId))
      .filter(Boolean);

    if (setState) setState(transformedChannels);
    return transformedChannels;
  } catch (error) {
    console.error('Error in fetchChannels:', error);
    return [];
  }
};

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
 * @param {string} user_id The channel creator
 */
export const addChannel = async (slug, user_id) => {
  try {
    // First create the channel
    const { data: newChannel, error: channelError } = await supabase
      .from('channels')
      .insert([{ 
        slug, 
        created_by: user_id,
        is_direct: false 
      }])
      .select()
      .single();

    if (channelError) {
      console.error('Error creating channel:', channelError);
      return null;
    }

    // Add the creator as a channel member
    const { error: memberError } = await supabase
      .from('channel_members')
      .insert([{ 
        channel_id: newChannel.id, 
        user_id: user_id 
      }]);

    if (memberError) {
      console.error('Error adding channel member:', memberError);
      return null;
    }

    // Fetch the complete channel with members
    const { data: fullChannel } = await supabase
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
      .eq('id', newChannel.id)
      .single();

    // Return with the same structure as other channel functions
    return {
      id: fullChannel.id,
      slug: fullChannel.slug,
      created_by: fullChannel.created_by,
      is_direct: fullChannel.is_direct,
      inserted_at: fullChannel.inserted_at,
      channel_members: fullChannel.channel_members.map(member => ({
        user_id: member.user_id,
        users: {
          id: member.users.id,
          username: member.users.username,
          status: member.users.status
        }
      })),
      other_participant: null  // Regular channels don't have other_participant
    };
  } catch (error) {
    console.error('Error in addChannel:', error);
    return null;
  }
};

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
      .select('id').single();

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
    const dmSlug = [userId1, userId2].sort().join('_dm_');

    // First check if channel exists using count
    const { count } = await supabase
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .eq('slug', dmSlug)
      .eq('is_direct', true);

    if (count > 0) {
      // If channel exists, fetch it with full details
      const { data: existingChannel } = await supabase
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

      return transformChannelData(existingChannel, userId1);
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

    // Fetch the complete channel with members
    const { data: fullChannel } = await supabase
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
      .eq('id', newChannel.id)
      .single();

    return transformChannelData(fullChannel, userId1);
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

    // Transform each channel using the helper function
    const transformedChannels = channels
      .map(channel => transformChannelData(channel, userId))
      .filter(Boolean);

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

/**
 * Extract text content from supported file types
 * @param {File} file The file to extract text from
 * @returns {Promise<string|null>} The extracted text or null if extraction fails
 */
export const extractTextFromFile = async (file) => {
  const fileExt = file.name.split('.').pop().toLowerCase();
  const supportedTextTypes = ['txt', 'pdf', 'docx', 'md', 'html'];
  
  if (!supportedTextTypes.includes(fileExt)) {
    return null;
  }

  try {
    // Create a temporary URL for the file
    const fileUrl = URL.createObjectURL(file);
    let extractedText = null;

    try {
      switch (fileExt) {
        case 'txt':
          extractedText = await file.text();
          break;

        case 'pdf': {
          // Set the worker source
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
          const pdf = await pdfjsLib.getDocument(fileUrl).promise;
          const numPages = pdf.numPages;
          const textPromises = [];
          
          for (let i = 1; i <= numPages; i++) {
            textPromises.push(
              pdf.getPage(i).then(page => 
                page.getTextContent().then(content => 
                  content.items.map(item => item.str).join(' ')
                )
              )
            );
          }
          
          extractedText = (await Promise.all(textPromises)).join('\n\n');
          break;
        }

        case 'docx': {
          const mammoth = await import('mammoth');
          const arrayBuffer = await file.arrayBuffer();
          // Extract both main content and notes/comments
          const [mainResult, notesResult] = await Promise.all([
            mammoth.extractRawText({ arrayBuffer }),
            mammoth.extractRawText({ arrayBuffer, includeDefaultStyleMap: true, includeComments: true })
          ]);
          extractedText = [mainResult.value, notesResult.value].join('\n\n');
          break;
        }

        case 'md': {
          const text = await file.text();
          const matter = await import('gray-matter');
          const { content, data: frontMatter } = matter.default(text);
          // Include frontmatter data if present
          const frontMatterText = Object.entries(frontMatter)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
          extractedText = [frontMatterText, content]
            .filter(Boolean)
            .join('\n\n');
          break;
        }

        case 'html': {
          const text = await file.text();
          const cheerio = await import('cheerio');
          const $ = cheerio.load(text);
          // Remove unwanted elements
          $('script, style, meta, link, noscript').remove();
          // Extract text from all relevant elements
          const bodyText = $('body').text().trim();
          const titleText = $('title').text().trim();
          const metaDescription = $('meta[name="description"]').attr('content') || '';
          extractedText = [titleText, metaDescription, bodyText]
            .filter(Boolean)
            .join('\n\n')
            .replace(/\s+/g, ' ');
          break;
        }
      }
    } finally {
      URL.revokeObjectURL(fileUrl);
    }

    return extractedText;
  } catch (error) {
    console.error('Error extracting text:', error);
    return null;
  }
};

export const uploadFile = async (file, userId) => {
  const fileExt = file.name.split('.').pop().toLowerCase();
  const timestamp = Date.now();
  const folderName = `${userId}-${timestamp}`;
  const fileName = `${folderName}/original.${fileExt}`;

  // Upload the original file
  const { data, error } = await supabase.storage
    .from('uploads')
    .upload(fileName, file, {
      contentType: file.type,
      cacheControl: '3600'
    });

  if (error) {
    return { error };
  }

  // Try to extract text from the file
  const extractedText = await extractTextFromFile(file);
  if (extractedText) {
    // Upload the extracted text as a separate file in the same folder
    const { error: textError } = await supabase.storage
      .from('uploads')
      .upload(`${folderName}/extracted_text.txt`, new Blob([extractedText], { type: 'text/plain' }), {
        contentType: 'text/plain',
        cacheControl: '3600'
      });

    if (textError) {
      console.error('Error uploading extracted text:', textError);
    }
  }

  const { data: publicUrlData } = supabase.storage
    .from('uploads')
    .getPublicUrl(fileName);

  return { data: { publicUrl: publicUrlData.publicUrl, extractedText } };
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
      .select('id').single();

    if (error) throw error;
    return data;
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

export const queryMessages = async (query, id,isParentThread = false) => {
  // isParentThread will have id as a message_id otherwise it will be a user_id
  try {
    const { data, error } = await supabase.functions.invoke('chat-rag', {
      body: { query, id, isParentThread }
    })
    if (error) throw error
    return data

  } catch (error) {
    console.error('Error querying messages:', error)
    return null
  }
}

// Helper function to transform channel data consistently
const transformChannelData = (channel, currentUserId) => {
  if (!channel || !channel.channel_members) return null;

  const baseChannel = {
    id: channel.id,
    slug: channel.slug,
    created_by: channel.created_by,
    is_direct: channel.is_direct,
    inserted_at: channel.inserted_at,
    channel_members: channel.channel_members?.map(member => ({
      user_id: member.user_id,
      users: {
        id: member.users.id,
        username: member.users.username,
        status: member.users.status
      }
    })) || []
  };

  if (channel.is_direct) {
    // For DM channels, other_participant should be the user that is NOT the current user
    const otherMember = channel.channel_members.find(member => member.user_id !== currentUserId);
    return {
      ...baseChannel,
      other_participant: otherMember ? {
        id: otherMember.users.id,
        username: otherMember.users.username,
        status: otherMember.users.status
      } : null
    };
  }

  return {
    ...baseChannel,
    other_participant: null
  };
};
