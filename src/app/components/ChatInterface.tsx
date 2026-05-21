import { useState, useRef, useEffect } from "react";
import { Send, Mic, MicOff } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { ScrollArea } from "./ui/scroll-area";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Ciao! Come posso aiutarti oggi?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Simula una risposta dall'AI
  const getAIResponse = async (userMessage: string): Promise<string> => {
    // Qui puoi inserire la chiamata alla tua API AI
    // Per ora uso una risposta simulata
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const responses = [
      "Interessante! Posso aiutarti con questo. Cosa vorresti sapere di più?",
      "Capisco la tua richiesta. Lascia che ti fornisca una risposta dettagliata...",
      "Ottima domanda! Ecco cosa penso al riguardo...",
      "Ho analizzato il tuo messaggio. Ecco la mia risposta...",
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const aiResponse = await getAIResponse(inputValue);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiResponse,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error getting AI response:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Gestione registrazione vocale
  const startRecording = async () => {
    try {
      // Verifica se il browser supporta getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Il tuo browser non supporta la registrazione audio.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        // Qui puoi inviare l'audio a un servizio di speech-to-text
        // Per ora simuliamo la trascrizione
        const transcription = "Messaggio vocale trascritto";
        setInputValue(transcription);

        // Ferma tutti i track dello stream
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error: any) {
      console.error("Error accessing microphone:", error);

      let errorMessage = "Impossibile accedere al microfono.";

      if (error.name === "NotAllowedError") {
        errorMessage = "Permesso microfono negato. Abilita l'accesso al microfono nelle impostazioni del browser.";
      } else if (error.name === "NotFoundError") {
        errorMessage = "Nessun microfono trovato. Collega un microfono e riprova.";
      } else if (error.name === "NotReadableError") {
        errorMessage = "Il microfono è già in uso da un'altra applicazione.";
      } else if (error.name === "SecurityError") {
        errorMessage = "Accesso al microfono bloccato per motivi di sicurezza. Assicurati che la pagina sia servita tramite HTTPS.";
      }

      alert(errorMessage);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleMicMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isRecording) {
      startRecording();
    }
  };

  const handleMicMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    stopRecording();
  };

  const handleMicTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!isRecording) {
      startRecording();
    }
  };

  const handleMicTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    stopRecording();
  };

  return (
    <div className="flex flex-col h-screen bg-[#9fa87f]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#8a9370] border-b border-[#7a8360]">
        <h1 className="text-white">AI Chat Assistant</h1>
        <div className="text-white/80 text-sm">
          {new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4 py-6">
        <div ref={scrollRef} className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                  message.role === "user"
                    ? "bg-white text-black"
                    : "bg-[#7a8360] text-white"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[#7a8360] text-white px-4 py-3 rounded-2xl">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-[#7a8360] bg-[#9fa87f] p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-2 bg-white rounded-3xl px-4 py-2">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scrivi qui il tuo messaggio..."
              className="flex-1 min-h-[44px] max-h-[200px] border-0 bg-transparent resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
              rows={1}
            />
            
            {/* Pulsante Microfono */}
            <Button
              onMouseDown={handleMicMouseDown}
              onMouseUp={handleMicMouseUp}
              onMouseLeave={handleMicMouseUp}
              onTouchStart={handleMicTouchStart}
              onTouchEnd={handleMicTouchEnd}
              size="icon"
              variant={isRecording ? "destructive" : "ghost"}
              className={`rounded-full shrink-0 ${
                isRecording ? "bg-red-500 hover:bg-red-600 animate-pulse" : ""
              }`}
              title="Tieni premuto per registrare"
            >
              {isRecording ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5 text-[#7a8360]" />
              )}
            </Button>

            {/* Pulsante Invio */}
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              size="icon"
              className="rounded-full bg-[#7a8360] hover:bg-[#6a7350] shrink-0"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
          
          {isRecording && (
            <p className="text-center text-white text-sm mt-2 animate-pulse">
              Registrazione in corso... Rilascia per fermare
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
