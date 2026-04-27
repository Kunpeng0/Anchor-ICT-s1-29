import { FormEvent, useEffect, useRef, useState } from 'react'
import { ArrowUp, Bot, Sparkles, User2 } from 'lucide-react'

type MessageRole = 'assistant' | 'user'

interface ChatMessage {
  id: number
  role: MessageRole
  content: string
}

const starterPrompts = [
  'Summarise the latest shift in conflict activity.',
  'Which actors appear most active in the current data?',
  'Show me where media attention is concentrated.',
  'What event types are rising most quickly?',
]

function buildMockReply(prompt: string) {
  const lowerPrompt = prompt.toLowerCase()

  if (lowerPrompt.includes('actor')) {
    return `Here is a clean actor-focused response layout for the analyst.\n\nI would highlight the most active actors first, then show how their activity changes over time and where they are concentrated geographically.`
  }

  if (lowerPrompt.includes('where') || lowerPrompt.includes('location') || lowerPrompt.includes('map')) {
    return `A location-first answer works well here.\n\nThe UI can surface a ranked list of hotspots, a supporting map, and a short explanation describing why those places stand out in the latest signal window.`
  }

  if (lowerPrompt.includes('type') || lowerPrompt.includes('breakdown')) {
    return `This prompt maps well to an event-type breakdown.\n\nI would return a short written summary, then pair it with a bar chart that shows which event categories dominate the current period.`
  }

  return `This chat layout is ready for your backend integration.\n\nFor the demo, the assistant can respond with a short written interpretation first, then render the matching chart directly below the message thread.`
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isAssistant = message.role === 'assistant'

  return (
    <div className={`flex gap-4 ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      {isAssistant && (
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-sm">
          <Bot className="h-5 w-5" />
        </div>
      )}

      <div
        className={`max-w-3xl rounded-[28px] px-5 py-4 text-sm leading-7 shadow-sm ${
          isAssistant
            ? 'bg-white text-gray-700 ring-1 ring-gray-200'
            : 'bg-gray-900 text-white'
        }`}
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
          {isAssistant ? 'Anchor AI' : 'You'}
        </p>
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>

      {!isAssistant && (
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gray-200 text-gray-700 shadow-sm">
          <User2 className="h-5 w-5" />
        </div>
      )}
    </div>
  )
}

function LoadingBubble() {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-sm">
        <Bot className="h-5 w-5" />
      </div>
      <div className="rounded-[28px] bg-white px-5 py-4 shadow-sm ring-1 ring-gray-200">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
          Anchor AI
        </p>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand-300" />
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand-400 [animation-delay:120ms]" />
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand-500 [animation-delay:240ms]" />
        </div>
      </div>
    </div>
  )
}

export default function InsightsPage() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isThinking, setIsThinking] = useState(false)
  const nextIdRef = useRef(1)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, isThinking])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const submitPrompt = (promptText: string) => {
    const trimmed = promptText.trim()
    if (!trimmed || isThinking) return

    const userMessage: ChatMessage = {
      id: nextIdRef.current++,
      role: 'user',
      content: trimmed,
    }

    setMessages((current) => [...current, userMessage])
    setInput('')
    setIsThinking(true)

    timeoutRef.current = window.setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: nextIdRef.current++,
        role: 'assistant',
        content: buildMockReply(trimmed),
      }

      setMessages((current) => [...current, assistantMessage])
      setIsThinking(false)
    }, 900)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    submitPrompt(input)
  }

  return (
    <div className="flex h-[calc(100vh-7.5rem)] min-h-[680px] flex-col overflow-hidden rounded-[32px] bg-[radial-gradient(circle_at_top,#eef4ff_0%,#f8fafc_42%,#eef2f7_100%)] shadow-[0_28px_80px_rgba(15,23,42,0.08)] ring-1 ring-white/70">
      <div className="border-b border-white/70 bg-white/65 px-8 py-5 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">
              Anchor Analyst Workspace
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm ring-1 ring-gray-200">
            <Sparkles className="h-4 w-4 text-brand-500" />
            Chat-style exploration interface
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
        {messages.length === 0 ? (
          <div className="mx-auto flex h-full max-w-4xl flex-col items-center justify-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-brand-600 text-white shadow-[0_20px_45px_rgba(92,124,250,0.28)]">
              <Bot className="h-10 w-10" />
            </div>

            <h2 className="mt-8 text-4xl font-semibold tracking-tight text-gray-900">
              Start a conversation with Anchor AI
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-gray-500">
              Ask about conflict activity, actor participation, geographic hotspots, or media attention.
            </p>

            <div className="mt-10 grid w-full gap-3 text-left sm:grid-cols-2">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => submitPrompt(prompt)}
                  className="rounded-[24px] bg-white/90 px-5 py-4 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-6">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isThinking && <LoadingBubble />}
          </div>
        )}
      </div>

      <div className="border-t border-white/70 bg-white/80 px-6 py-5 backdrop-blur-xl sm:px-8">
        <div className="mx-auto max-w-4xl">
          <form onSubmit={handleSubmit} className="rounded-[30px] bg-white p-3 shadow-[0_18px_35px_rgba(15,23,42,0.07)] ring-1 ring-gray-200">
            <div className="flex items-end gap-3">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={1}
                placeholder="Message Anchor AI..."
                className="max-h-40 min-h-[52px] flex-1 resize-none border-0 bg-transparent px-3 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-0"
              />

              <button
                type="submit"
                disabled={!input.trim() || isThinking}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-900 text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  )
}
