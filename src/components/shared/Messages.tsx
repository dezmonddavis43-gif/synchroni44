import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { Btn, Spinner, EmptyState } from './UI'
import { Search, Send, MessageSquare } from 'lucide-react'
import type { Profile, Message, Conversation } from '../../lib/types'

interface MessagesProps {
  profile: Profile
}

export function Messages({ profile }: MessagesProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadUsers = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', profile.id)

    if (data) setUsers(data)
  }, [profile.id])

  const loadConversations = useCallback(async () => {
    const { data: sentMessages } = await supabase
      .from('messages')
      .select('*, recipient:profiles!messages_recipient_id_fkey(*)')
      .eq('sender_id', profile.id)
      .order('created_at', { ascending: false })

    const { data: receivedMessages } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(*)')
      .eq('recipient_id', profile.id)
      .order('created_at', { ascending: false })

    const userMap = new Map<string, Conversation>()

    sentMessages?.forEach(msg => {
      const recipient = msg.recipient as Profile
      if (!userMap.has(recipient.id)) {
        userMap.set(recipient.id, {
          user: recipient,
          lastMessage: msg,
          unreadCount: 0
        })
      }
    })

    receivedMessages?.forEach(msg => {
      const sender = msg.sender as Profile
      if (!userMap.has(sender.id)) {
        userMap.set(sender.id, {
          user: sender,
          lastMessage: msg,
          unreadCount: msg.read ? 0 : 1
        })
      } else {
        const existing = userMap.get(sender.id)!
        if (!msg.read) existing.unreadCount++
        if (new Date(msg.created_at) > new Date(existing.lastMessage?.created_at || 0)) {
          existing.lastMessage = msg
        }
      }
    })

    const sorted = Array.from(userMap.values()).sort((a, b) =>
      new Date(b.lastMessage?.created_at || 0).getTime() - new Date(a.lastMessage?.created_at || 0).getTime()
    )

    setConversations(sorted)
  }, [profile.id])

  const loadMessages = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${profile.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${profile.id})`)
      .order('created_at', { ascending: true })

    if (data) {
      setMessages(data)

      const unreadIds = data.filter(m => m.recipient_id === profile.id && !m.read).map(m => m.id)
      if (unreadIds.length > 0) {
        await supabase.from('messages').update({ read: true }).in('id', unreadIds)
      }
    }
  }, [profile.id])

  const loadData = useCallback(async () => {
    setLoading(true)
    await Promise.all([loadConversations(), loadUsers()])
    setLoading(false)
  }, [loadConversations, loadUsers])

  useEffect(() => {
    void loadData()

    pollIntervalRef.current = window.setInterval(() => {
      if (selectedUser) {
        void loadMessages(selectedUser.id)
      }
      void loadConversations()
    }, 10000)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [profile.id, selectedUser, loadData, loadMessages, loadConversations])

  const selectConversation = (conv: Conversation) => {
    setSelectedUser(conv.user)
    loadMessages(conv.user.id)
  }

  const startNewConversation = (user: Profile) => {
    setSelectedUser(user)
    setMessages([])
    setSearchQuery('')
    setSearchResults([])
  }

  const searchUsers = (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    const results = users.filter(u =>
      u.full_name.toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase())
    )
    setSearchResults(results)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: profile.id,
        recipient_id: selectedUser.id,
        content: newMessage.trim(),
        read: false
      })
      .select()
      .single()

    if (!error && data) {
      setMessages([...messages, data])
      setNewMessage('')
      loadConversations()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-76px)]">
      <div className="w-[320px] bg-[#0D0D10] border-r border-[#1A1A1E] flex flex-col">
        <div className="p-4 border-b border-[#1A1A1E]">
          <h2 className="text-lg font-medium text-[#E8E8E8] mb-4">Messages</h2>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => searchUsers(e.target.value)}
              placeholder="Start new conversation..."
              className="w-full bg-[#0A0A0C] border border-[#2A2A2E] rounded-lg pl-10 pr-4 py-2 text-sm text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E]"
            />
          </div>

          {searchResults.length > 0 && (
            <div className="mt-2 border border-[#2A2A2E] rounded-lg overflow-hidden">
              {searchResults.map(user => (
                <button
                  key={user.id}
                  onClick={() => startNewConversation(user)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-[#1A1A1E] transition-colors text-left"
                >
                  <div className="w-8 h-8 bg-[#1A1A1E] rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-[#C8A97E]">
                      {user.full_name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-[#E8E8E8]">{user.full_name}</p>
                    <p className="text-xs text-[#666] capitalize">{user.role}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map(conv => (
            <button
              key={conv.user.id}
              onClick={() => selectConversation(conv)}
              className={`w-full flex items-center gap-3 p-4 border-b border-[#1A1A1E] transition-colors text-left ${
                selectedUser?.id === conv.user.id
                  ? 'bg-[#C8A97E]/10'
                  : 'hover:bg-[#1A1A1E]'
              }`}
            >
              <div className="w-10 h-10 bg-[#1A1A1E] rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-[#C8A97E]">
                  {conv.user.full_name.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm text-[#E8E8E8] font-medium truncate">{conv.user.full_name}</p>
                  {conv.lastMessage && (
                    <span className="text-xs text-[#555]">
                      {new Date(conv.lastMessage.created_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#666] truncate">
                  {conv.lastMessage?.content || 'No messages yet'}
                </p>
              </div>
              {conv.unreadCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#C8A97E] text-[#0A0A0C] text-xs flex items-center justify-center">
                  {conv.unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            <div className="p-4 border-b border-[#1A1A1E] flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1A1A1E] rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-[#C8A97E]">
                  {selectedUser.full_name.charAt(0)}
                </span>
              </div>
              <div>
                <p className="text-[#E8E8E8] font-medium">{selectedUser.full_name}</p>
                <p className="text-xs text-[#666] capitalize">{selectedUser.role}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === profile.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                      msg.sender_id === profile.id
                        ? 'bg-[#C8A97E] text-[#0A0A0C]'
                        : 'bg-[#1A1A1E] text-[#E8E8E8]'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p className={`text-xs mt-1 ${
                      msg.sender_id === profile.id ? 'text-[#0A0A0C]/60' : 'text-[#555]'
                    }`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-[#1A1A1E]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 bg-[#0A0A0C] border border-[#2A2A2E] rounded-lg px-4 py-3 text-[#E8E8E8] placeholder-[#555] focus:outline-none focus:border-[#C8A97E]"
                />
                <Btn onClick={sendMessage} disabled={!newMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Btn>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={<MessageSquare className="w-12 h-12" />}
              title="Select a Conversation"
              description="Choose a conversation from the left or start a new one"
            />
          </div>
        )}
      </div>
    </div>
  )
}
