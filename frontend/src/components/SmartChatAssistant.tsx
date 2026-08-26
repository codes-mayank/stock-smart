import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Store, Search, Package, Mic, Volume2, VolumeX } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

type Message = {
  id: string;
  sender: "user" | "bot";
  text: string;
  options?: any[];
  timestamp: Date;
};

interface SmartChatAssistantProps {
  listings: any[];
}

export default function SmartChatAssistant({ listings }: SmartChatAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "bot",
      text: "Hi! I'm your local shopping assistant. Ask me to find something nearby! (e.g. 'Who has milk?' or 'Looking for paneer')",
      timestamp: new Date(),
    },
  ]);
  const [pendingReservation, setPendingReservation] = useState<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Speak function
  const speakText = (text: string) => {
    if (!voiceEnabled || !("speechSynthesis" in window)) return;
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    // Try to get a decent voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith("en"));
    if (englishVoice) utterance.voice = englishVoice;
    window.speechSynthesis.speak(utterance);
  };

  // Speak initial message on mount if open and enabled
  useEffect(() => {
    if (isOpen && voiceEnabled && messages.length === 1) {
      speakText(messages[0].text);
    }
  }, [isOpen, voiceEnabled]);

  // Handle Speech Recognition
  const handleListen = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Your browser does not support speech recognition.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      // Auto send after hearing
      handleSend(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = textToSend.trim();
    setInput("");

    // Process logic
    setTimeout(() => {
      processBotResponse(currentInput);
    }, 600); // Simulate typing delay
  };

  const processBotResponse = (query: string) => {
    const q = query.toLowerCase();

    // Check if user is replying '1' for reservation
    if (q === "1" && pendingReservation) {
      const p = pendingReservation;
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "bot",
          text: `✅ Request sent! ${p.shop_name || "The shopkeeper"} will keep your ${p.name} ready for pickup.`,
          timestamp: new Date(),
        },
      ]);
      speakText(`Request sent. ${p.shop_name || "The shopkeeper"} will keep your ${p.name} ready for pickup.`);
      setPendingReservation(null);
      return;
    }

    // Otherwise, clear any pending reservation
    if (pendingReservation) {
      setPendingReservation(null);
    }

    // Extract keywords (very basic extraction)
    // Remove common words
    const stopWords = ["who", "has", "looking", "for", "i", "need", "want", "some", "near", "me", "where", "can", "get", "find", "a", "an", "the"];
    const keywords = q.split(" ").filter(w => !stopWords.includes(w) && w.length > 2);
    
    let searchWord = keywords.length > 0 ? keywords[0] : q;

    // Search listings
    const results = listings.filter(
      (l) =>
        (l.name?.toLowerCase().includes(searchWord) ||
        l.category?.toLowerCase().includes(searchWord)) && l.quantity > 0
    );

    if (results.length > 0) {
      // Find the closest or first available
      const topResult = results[0];
      setPendingReservation(topResult);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "bot",
          text: `${topResult.shop_name || "A local shop"} has ${topResult.quantity} units of ${topResult.name} in stock for ₹${topResult.price}.\n\nReply '1' to reserve it, or click below to view the shop!`,
          options: [topResult],
          timestamp: new Date(),
        },
      ]);
      speakText(`${topResult.shop_name || "A local shop"} has ${topResult.quantity} units of ${topResult.name} in stock for ₹${topResult.price}. Reply '1' to reserve it.`);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "bot",
          text: `Sorry, I couldn't find any shops nearby with "${searchWord}". Try searching for something else!`,
          timestamp: new Date(),
        },
      ]);
      speakText(`Sorry, I couldn't find any shops nearby with ${searchWord}. Try searching for something else!`);
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 z-50 transition-transform hover:scale-110"
        >
          <MessageCircle className="h-6 w-6 text-white" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-80 sm:w-96 h-[500px] shadow-2xl flex flex-col z-50 border-border overflow-hidden animate-in slide-in-from-bottom-5">
          <CardHeader className="bg-emerald-500 p-4 text-white flex flex-row items-center justify-between space-y-0 rounded-t-lg">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-1.5 rounded-full">
                <Store className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Local Shopping Assistant</CardTitle>
                <p className="text-xs text-emerald-100">Usually replies instantly</p>
              </div>
            </div>
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-8 w-8 mr-1"
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                title={voiceEnabled ? "Mute voice" : "Enable voice"}
              >
                {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-8 w-8 -mr-2"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col max-w-[85%]",
                  msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                <div
                  className={cn(
                    "p-3 rounded-2xl text-sm whitespace-pre-wrap shadow-sm",
                    msg.sender === "user"
                      ? "bg-emerald-500 text-white rounded-tr-sm"
                      : "bg-background border border-border text-foreground rounded-tl-sm"
                  )}
                >
                  {msg.text}
                </div>
                
                {msg.options && msg.options.length > 0 && (
                  <div className="mt-2 w-full space-y-2">
                    {msg.options.map((opt: any, i) => (
                      <div 
                        key={i} 
                        className="bg-background border border-border rounded-lg p-2 text-sm flex flex-col gap-2 shadow-sm cursor-pointer hover:border-emerald-400 transition-colors"
                        onClick={() => {
                          setIsOpen(false);
                          navigate(`/shop/${opt.user_id}`);
                        }}
                      >
                        <div className="flex items-center gap-2 font-medium">
                          <Package className="h-4 w-4 text-primary" />
                          <span className="line-clamp-1">{opt.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-600">₹{opt.price}</span>
                          <Badge variant="outline" className="text-[10px] bg-emerald-50">{opt.shop_name || "Shop"}</Badge>
                        </div>
                        <Button size="sm" variant="secondary" className="w-full text-xs h-7 mt-1">
                          Visit Shop
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <span className="text-[10px] text-muted-foreground mt-1 px-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </CardContent>

          <CardFooter className="p-3 bg-background border-t border-border">
            <form
              className="flex w-full items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
            >
              <Button 
                type="button" 
                size="icon" 
                variant="outline"
                className={cn(
                  "rounded-full shrink-0 border-0 bg-muted/50 transition-colors",
                  isListening && "bg-red-100 text-red-500 animate-pulse hover:bg-red-200"
                )}
                onClick={handleListen}
              >
                <Mic className="h-4 w-4" />
              </Button>
              <Input
                placeholder={isListening ? "Listening..." : "Ask for a product..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 rounded-full bg-muted/50 focus-visible:ring-emerald-500"
              />
              <Button 
                type="submit" 
                size="icon" 
                className="rounded-full bg-emerald-500 hover:bg-emerald-600 shrink-0"
                disabled={!input.trim()}
              >
                <Send className="h-4 w-4 text-white" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}
    </>
  );
}
