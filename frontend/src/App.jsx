import React, { useState, useEffect, useRef } from 'react';
import { Send, Upload, FileText, Bot, User, Loader2, Plus, Sparkles, Zap, Database, CopyIcon, RefreshCcwIcon, ThumbsUpIcon, ThumbsDownIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

import { Action, Actions } from "@/components/ui/actions";
import { Conversation, ConversationContent } from "@/components/ui/conversation";
import { Message, MessageContent } from "@/components/ui/message";
import { PromptingIsAllYouNeed } from "@/components/ui/animated-hero-section";
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";

const API_BASE_URL = 'http://localhost:8000';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [provider, setProvider] = useState('groq');

  const isConversationStarted = messages.length > 0;

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(`${API_BASE_URL}/upload`, formData);
      setUploadedFile(file.name);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(),
        role: 'assistant', 
        content: `Successfully uploaded ${file.name}. Note: You may need to click "Update Index" to process new documents.` 
      }]);
    } catch (error) {
      console.error("Upload error", error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(),
        role: 'assistant', 
        content: "Error uploading file. Please make sure the backend is running and you uploaded a PDF." 
      }]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleTrain = async () => {
    setIsTraining(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/train`);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(),
        role: 'assistant', 
        content: response.data.message || "Knowledge base updated successfully!" 
      }]);
    } catch (error) {
      console.error("Training error", error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(),
        role: 'assistant', 
        content: "Error updating index. The backend might still be processing or there might be a rate limit." 
      }]);
    } finally {
      setIsTraining(false);
    }
  };

  const handleSend = async (customText = null) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || isTyping) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: textToSend, id: Date.now().toString() }]);
    setIsTyping(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/chat`, { 
        message: textToSend,
        provider: provider
      });
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.data.response,
        sources: response.data.source_documents,
        id: (Date.now() + 1).toString()
      }]);
    } catch (error) {
      console.error("Chat error", error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I couldn't find an answer in your documents. Make sure the model is trained and the backend is running.",
        id: (Date.now() + 1).toString()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <SidebarProvider>
      {/* Sidebar */}
      <Sidebar>
        <SidebarHeader className="p-4 pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20 text-white">
              <Bot size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500">DocInsight AI</h1>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Model Engine</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  isActive={provider === 'gemini'} 
                  onClick={() => setProvider('gemini')}
                  className="gap-3 h-10"
                >
                  <Sparkles size={16} className={provider === 'gemini' ? 'text-blue-500' : ''} />
                  <span className="font-medium text-sm">Google Gemini Pro</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  isActive={provider === 'groq'} 
                  onClick={() => setProvider('groq')}
                  className="gap-3 h-10"
                >
                  <Zap size={16} className={provider === 'groq' ? 'text-orange-500' : ''} />
                  <span className="font-medium text-sm">Groq Llama 3</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Documents</SidebarGroupLabel>
            <div className="px-2 mt-2">
              {uploadedFile ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm"
                >
                  <FileText size={18} className="text-blue-500" />
                  <span className="text-sm truncate font-medium text-slate-700">{uploadedFile}</span>
                </motion.div>
              ) : (
                <div className="text-sm text-slate-400 px-2 italic">35 PDFs ready for indexing</div>
              )}
            </div>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-4 space-y-3">
          <button 
            onClick={handleTrain}
            disabled={isTraining}
            className="flex items-center justify-center gap-2 w-full p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all active:scale-95 shadow-sm text-slate-700"
          >
            {isTraining ? <Loader2 className="animate-spin" size={16} /> : <Database size={16} />}
            <span className="font-semibold text-sm">Update Index</span>
          </button>
          
          <label className="flex items-center justify-center gap-2 w-full p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer transition-all active:scale-95 shadow-md shadow-blue-500/20">
            {isUploading ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
            <span className="font-semibold text-sm">Upload PDF</span>
            <input type="file" className="hidden" onChange={handleUpload} accept=".pdf" />
          </label>
        </SidebarFooter>
      </Sidebar>

      {/* Main Chat Area */}
      <SidebarInset className="flex-1 flex flex-col relative bg-gradient-to-br from-white via-slate-50 to-blue-50 overflow-hidden min-h-screen">
        <div className="absolute top-4 left-4 z-50 md:hidden">
          <SidebarTrigger />
        </div>
        
        {!isConversationStarted ? (
          <div className="flex flex-col items-center justify-between w-full h-full relative p-4 md:p-8 pt-12 md:pt-16 pb-12 md:pb-16">
            <div className="absolute inset-0 w-full h-full pointer-events-none opacity-80">
              <PromptingIsAllYouNeed />
            </div>
            
            <div className="relative z-10 flex flex-col items-center text-center max-w-3xl w-full pointer-events-none mt-4 md:mt-8">
              <h1 className="text-slate-800 text-4xl sm:text-5xl font-bold tracking-tight drop-shadow-sm mb-4">DocInsight AI.</h1>
              <p className="text-slate-600 text-sm sm:text-base font-medium bg-white/50 backdrop-blur-sm px-5 py-2 rounded-full">Explore your academic PDFs, extract insights, and summarize knowledge with precision.</p>
            </div>

            <div className="w-full max-w-3xl relative z-20 group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-300 to-cyan-200 opacity-40 blur-xl rounded-2xl group-focus-within:opacity-60 transition duration-500"></div>
              <div className="relative flex items-center bg-white/90 backdrop-blur-md border border-slate-200 p-2 pl-4 rounded-2xl shadow-xl">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={`Ask ${provider === 'gemini' ? 'Gemini' : 'Llama 3'} about your documents...`}
                  className="flex-1 bg-transparent border-none outline-none text-slate-800 text-sm md:text-base py-3 px-2 placeholder:text-slate-400"
                />
                <button 
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isTyping}
                  className={`p-3 rounded-xl transition-all ${input.trim() && !isTyping ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 active:scale-95' : 'bg-slate-100 text-slate-400'}`}
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Decorative background glow */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-400/10 blur-[100px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-400/10 blur-[100px] rounded-full pointer-events-none"></div>

            {/* Header (Mobile) */}
            <header className="md:hidden bg-white/80 backdrop-blur-md p-4 flex items-center justify-between border-b border-slate-200 z-10">
              <div className="flex items-center gap-2">
                <Bot size={20} className="text-blue-600" />
                <span className="font-bold text-slate-800">DocInsight</span>
              </div>
              <div className="flex gap-2">
                <button onClick={handleTrain} className="p-2 bg-slate-100 rounded-lg text-slate-600"><Database size={18} /></button>
                <label className="p-2 bg-slate-100 rounded-lg text-slate-600 cursor-pointer">
                  <Upload size={18} />
                  <input type="file" className="hidden" onChange={handleUpload} accept=".pdf" />
                </label>
              </div>
            </header>

            {/* Chat Messages */}
            <Conversation className="relative w-full z-10 px-4">
              <ConversationContent className="max-w-4xl mx-auto py-8">
                {messages.map((message) => (
                  <Message
                    className={`flex flex-col gap-2 ${message.role === "assistant" ? "items-start" : "items-end"}`}
                    from={message.role}
                    key={message.id}
                  >
                    <img
                      src={message.role === 'user' ? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop" : "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=100&h=100&fit=crop"}
                      alt={message.role}
                      className="h-8 w-8 rounded-full shadow-sm"
                    />
                    <MessageContent className={message.role === 'user' ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-800 shadow-sm'}>
                      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      {message.sources && message.sources.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-100">
                          {message.sources.map((source, sIdx) => (
                            <div key={sIdx} className="text-[10px] px-2 py-1 bg-slate-100 text-slate-500 border border-slate-200 rounded-md hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-help">
                              Source {sIdx + 1}
                            </div>
                          ))}
                        </div>
                      )}
                    </MessageContent>
                    {message.role === "assistant" && (
                      <Actions className="mt-1">
                        <Action label="Copy" onClick={() => navigator.clipboard.writeText(message.content)}>
                          <CopyIcon className="size-4" />
                        </Action>
                        <Action label="Retry" onClick={() => handleSend(messages[messages.length-2]?.content)}>
                          <RefreshCcwIcon className="size-4" />
                        </Action>
                        <Action label="Like">
                          <ThumbsUpIcon className="size-4" />
                        </Action>
                        <Action label="Dislike">
                          <ThumbsDownIcon className="size-4" />
                        </Action>
                      </Actions>
                    )}
                  </Message>
                ))}
                
                {isTyping && (
                  <Message className="flex flex-col gap-2 items-start" from="assistant">
                    <img
                      src="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=100&h=100&fit=crop"
                      alt="assistant"
                      className="h-8 w-8 rounded-full shadow-sm"
                    />
                    <MessageContent className="bg-white border border-slate-200 shadow-sm">
                      <div className="flex gap-1.5 items-center p-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </MessageContent>
                  </Message>
                )}
              </ConversationContent>
            </Conversation>

            {/* Input Area */}
            <div className="p-4 md:p-8 pt-0 bg-transparent relative z-10 w-full shrink-0">
              <div className="max-w-4xl mx-auto relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-300 to-cyan-200 opacity-40 blur-xl rounded-2xl group-focus-within:opacity-60 transition duration-500"></div>
                <div className="relative flex items-center bg-white border border-slate-200 p-2 pl-4 rounded-2xl shadow-lg">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={`Ask ${provider === 'gemini' ? 'Gemini' : 'Llama 3'} about your documents...`}
                    className="flex-1 bg-transparent border-none outline-none text-slate-800 text-sm md:text-base py-3 px-2 placeholder:text-slate-400"
                  />
                  <button 
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isTyping}
                    className={`p-3 rounded-xl transition-all ${input.trim() && !isTyping ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 active:scale-95' : 'bg-slate-100 text-slate-400'}`}
                  >
                    <Send size={20} />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold">
                  <div className="flex items-center gap-1.5"><Sparkles size={10} className="text-blue-500" /> AI Powered</div>
                  <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                  <div className="flex items-center gap-1.5"><Zap size={10} className="text-orange-500" /> Low Latency</div>
                  <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                  <div className="flex items-center gap-1.5"><Database size={10} className="text-green-500" /> 35+ Sources</div>
                </div>
              </div>
            </div>
          </>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}

export default App;
