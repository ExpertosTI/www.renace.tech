"use client";

import { useState, useEffect, useRef } from "react";
import { Send, ArrowLeft, Search, MessageCircle, Check, CheckCheck } from "lucide-react";
import Link from "next/link";

interface Conversation {
    id: string;
    other_user_name: string;
    other_user_avatar: string;
    other_company_name: string;
    last_message: string;
    last_message_at: string;
    unread_count: number;
}

interface Message {
    id: string;
    sender_id: string;
    content: string;
    created_at: string;
    read_at: string | null;
    sender_name: string;
}

export default function MensajesPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConv, setSelectedConv] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jairoapp.renace.tech/api';

    useEffect(() => {
        const user = localStorage.getItem("usuario");
        if (user) {
            setUserId(JSON.parse(user).id);
        }
        loadConversations();
    }, []);

    useEffect(() => {
        if (selectedConv) {
            loadMessages(selectedConv);
            const interval = setInterval(() => loadMessages(selectedConv, false), 5000); // Poll every 5s
            return () => clearInterval(interval);
        }
    }, [selectedConv]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const getToken = () => localStorage.getItem("token");

    const loadConversations = async () => {
        try {
            const res = await fetch(`${API_URL}/messages/conversations`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            if (res.ok) {
                const data = await res.json();
                setConversations(data.conversaciones || []);
            }
        } catch (error) {
            console.error("Error loading conversations:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (convId: string, showLoading = true) => {
        try {
            const res = await fetch(`${API_URL}/messages/conversation/${convId}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            if (res.ok) {
                const data = await res.json();
                setMessages(data.mensajes || []);

                // Mark as read if needed (and if not already read locally to avoid spamming)
                const hasUnread = data.mensajes.some((m: Message) => !m.read_at && m.sender_id !== userId);
                if (hasUnread) {
                    await fetch(`${API_URL}/messages/read/${convId}`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${getToken()}` }
                    });
                    // Refresh conversations to update badge
                    loadConversations();
                }
            }
        } catch (error) {
            console.error("Error loading messages:", error);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedConv || !userId) return;

        const tempId = Date.now().toString();
        const content = newMessage;

        // Optimistic update
        setMessages(prev => [...prev, {
            id: tempId,
            sender_id: userId,
            content: content,
            created_at: new Date().toISOString(),
            read_at: null,
            sender_name: "Yo" // Placeholder
        }]);
        setNewMessage("");

        try {
            const conv = conversations.find(c => c.id === selectedConv);
            const res = await fetch(`${API_URL}/messages/send`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getToken()}`
                },
                body: JSON.stringify({
                    conversationId: selectedConv,
                    recipientId: conv?.other_user_name, // Backend should ideally handle ID lookup from conversation or we store ID
                    content: content
                })
            });

            if (res.ok) {
                loadMessages(selectedConv, false);
                loadConversations();
            }
        } catch (error) {
            console.error("Error sending message:", error);
            // Revert optimistic update? For now just log
        }
    };

    const formatTime = (date: string) => {
        return new Date(date).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
    };

    const formatDate = (date: string) => {
        const d = new Date(date);
        const today = new Date();
        if (d.toDateString() === today.toDateString()) return "Hoy";
        return d.toLocaleDateString("es", { day: "numeric", month: "short" });
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/directorio" className="text-gray-500 hover:text-gray-700">
                            <ArrowLeft size={24} />
                        </Link>
                        <h1 className="text-xl font-bold text-gray-900">Mensajes</h1>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto flex h-[calc(100vh-73px)]">
                {/* Conversations List */}
                <div className={`w-full md:w-80 border-r bg-white ${selectedConv ? 'hidden md:block' : ''}`}>
                    <div className="p-4 border-b">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar conversaciones..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                    </div>

                    <div className="overflow-y-auto h-[calc(100%-73px)]">
                        {loading ? (
                            <div className="p-8 text-center text-gray-500">Cargando...</div>
                        ) : conversations.length === 0 ? (
                            <div className="p-8 text-center">
                                <MessageCircle className="mx-auto text-gray-300 mb-4" size={48} />
                                <p className="text-gray-500">No hay conversaciones</p>
                                <p className="text-sm text-gray-400 mt-2">Conecta con empresas para iniciar</p>
                            </div>
                        ) : (
                            conversations.map((conv) => (
                                <button
                                    key={conv.id}
                                    onClick={() => setSelectedConv(conv.id)}
                                    className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b ${selectedConv === conv.id ? 'bg-primary/5' : ''
                                        }`}
                                >
                                    <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-primary font-bold">
                                            {conv.other_user_name?.charAt(0) || '?'}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-semibold text-gray-900 truncate">{conv.other_user_name}</h3>
                                            <span className="text-xs text-gray-400">{formatDate(conv.last_message_at)}</span>
                                        </div>
                                        <p className="text-sm text-gray-500 truncate">{conv.other_company_name}</p>
                                        <p className="text-sm text-gray-400 truncate mt-1">{conv.last_message}</p>
                                    </div>
                                    {conv.unread_count > 0 && (
                                        <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                                            {conv.unread_count}
                                        </span>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Messages Area */}
                <div className={`flex-1 flex flex-col bg-gray-100 ${!selectedConv ? 'hidden md:flex' : ''}`}>
                    {selectedConv ? (
                        <>
                            {/* Chat Header */}
                            <div className="bg-white border-b p-4 flex items-center gap-3">
                                <button
                                    onClick={() => setSelectedConv(null)}
                                    className="md:hidden text-gray-500"
                                >
                                    <ArrowLeft size={24} />
                                </button>
                                <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center">
                                    <span className="text-primary font-bold">
                                        {conversations.find(c => c.id === selectedConv)?.other_user_name?.charAt(0)}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">
                                        {conversations.find(c => c.id === selectedConv)?.other_user_name}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        {conversations.find(c => c.id === selectedConv)?.other_company_name}
                                    </p>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[70%] px-4 py-2 rounded-2xl ${msg.sender_id === userId
                                                ? 'bg-primary text-white rounded-br-md'
                                                : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
                                                }`}
                                        >
                                            <p>{msg.content}</p>
                                            <div className={`flex items-center gap-1 mt-1 text-xs ${msg.sender_id === userId ? 'text-white/70' : 'text-gray-400'
                                                }`}>
                                                <span>{formatTime(msg.created_at)}</span>
                                                {msg.sender_id === userId && (
                                                    msg.read_at ? <CheckCheck size={14} /> : <Check size={14} />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="bg-white border-t p-4">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                        placeholder="Escribe un mensaje..."
                                        className="flex-1 px-4 py-3 bg-gray-100 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                    <button
                                        onClick={sendMessage}
                                        disabled={!newMessage.trim()}
                                        className="px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 transition-colors"
                                    >
                                        <Send size={20} />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <MessageCircle className="mx-auto text-gray-300 mb-4" size={64} />
                                <h3 className="text-xl font-semibold text-gray-700">Selecciona una conversación</h3>
                                <p className="text-gray-500 mt-2">O conecta con una empresa para iniciar</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
