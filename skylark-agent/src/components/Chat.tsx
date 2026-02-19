'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage } from '@/lib/types';

// Import a code highlighting theme
import 'highlight.js/styles/github-dark.css';

export default function Chat() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const history = messages.map((m) => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }],
            }));

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: input, history }),
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            const assistantMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response,
                timestamp: Date.now(),
                toolResults: data.toolsUsed,
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your Gemini API key.`,
                timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white border border-[var(--border)] animate-fade-in overflow-hidden">
            {/* Console Header */}
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div className="flex items-center gap-3">
                    <div className="w-1 h-4 bg-[#F25B2A]" />
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-900">Intelligence Terminal</h2>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Secure Link</span>
                </div>
            </div>

            {/* Terminal Feed */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth custom-scrollbar bg-[var(--background)]/30"
            >
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-start justify-center p-8 space-y-6">
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#F25B2A]">Initialization Complete</p>
                            <h1 className="text-2xl font-black text-zinc-900 leading-tight uppercase">System Ready</h1>
                        </div>
                        <p className="text-xs font-medium text-zinc-500 max-w-[240px] leading-relaxed uppercase tracking-tight">
                            Query flight data, pilot availability, or mission parameters via the command line below.
                        </p>
                        <div className="grid grid-cols-1 gap-2 w-full max-w-[280px]">
                            {['Show available pilots', 'Any conflicts detected?', 'Fleet coverage report'].map((text) => (
                                <button
                                    key={text}
                                    onClick={() => setInput(text)}
                                    className="group flex items-center justify-between text-[10px] font-black uppercase tracking-widest py-3 px-4 border border-zinc-200 bg-white hover:border-zinc-900 transition-all"
                                    suppressHydrationWarning
                                >
                                    <span>{text}</span>
                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={cn(
                            "flex flex-col gap-3 animate-fade-in",
                            message.role === 'user' ? "items-end" : "items-start"
                        )}
                    >
                        <div className="flex items-center gap-2 px-1">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">
                                {message.role === 'user' ? 'OPERATOR' : 'INTELLIGENCE'}
                            </span>
                        </div>
                        <div className={cn(
                            "px-5 py-4 text-[13px] leading-relaxed font-medium max-w-[95%] border prose prose-sm dark:prose-invert max-w-none",
                            message.role === 'user'
                                ? "bg-zinc-900 text-white border-zinc-900 prose-headings:text-white prose-strong:text-white"
                                : "bg-white text-zinc-800 border-zinc-200"
                        )}>
                            {/* Render message content as Markdown */}
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeHighlight]}
                                components={{
                                    code({ className, children, ...props }) {
                                        const match = /language-(\w+)/.exec(className || '');
                                        const isInline = !match && typeof children === 'string' && !children.includes('\n');

                                        if (!isInline && match) {
                                            return (
                                                <pre className="bg-zinc-900 text-white p-4 rounded overflow-x-auto">
                                                    <code className={className} {...props}>
                                                        {children}
                                                    </code>
                                                </pre>
                                            );
                                        }

                                        return (
                                            <code className="bg-zinc-100 px-1 py-0.5 rounded text-sm" {...props}>
                                                {children}
                                            </code>
                                        );
                                    }
                                }}
                            >
                                {message.content}
                            </ReactMarkdown>

                            {/* Technical Result Inline */}
                            {message.toolResults && message.toolResults.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-wrap gap-2">
                                    {message.toolResults.map((tool, i) => (
                                        <div
                                            key={i}
                                            className="text-[9px] px-2 py-1 bg-zinc-50 text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-2"
                                        >
                                            <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                                            {tool.toolName}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex flex-col gap-3 animate-pulse">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Processing</span>
                        <div className="bg-white border border-zinc-100 px-5 py-4 flex items-center gap-3">
                            <div className="flex gap-1">
                                <div className="w-1 h-1 bg-[#F25B2A] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-1 h-1 bg-[#F25B2A] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-1 h-1 bg-[#F25B2A] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Analyzing data stream...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Console */}
            <form
                onSubmit={handleSubmit}
                className="p-4 bg-zinc-900"
            >
                <div className="relative flex items-center">
                    <div className="absolute left-4 text-[#F25B2A] font-mono text-sm leading-none pt-0.5">{'>'}</div>
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="ENTER COMMAND..."
                        className="w-full bg-transparent border-none py-3 pl-10 pr-12 text-[11px] font-bold tracking-[0.1em] text-white focus:outline-none placeholder:text-zinc-600 uppercase"
                        disabled={isLoading}
                        suppressHydrationWarning
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 text-zinc-400 hover:text-white transition-colors p-2"
                        suppressHydrationWarning
                    >
                        <Send size={16} />
                    </button>
                </div>
            </form>
        </div>
    );
}