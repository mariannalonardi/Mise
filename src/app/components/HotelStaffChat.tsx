import { useRef, useState, useEffect } from "react";
import {
  ArrowRight,
  Battery,
  CheckSquare,
  Mic,
  MicOff,
  MessageCircle,
  Plus,
  Users,
  Wifi,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "staff" | "assistant";
  content: string;
  variant: "assistant" | "staff" | "profile" | "confirm";
}

const STAFF_SYSTEM_PROMPT = `Staff System Prompt
FIXED LAYER - READ-ONLY - LOADED ON EVERY STAFF SESSION
This prompt defines the agent's behavior when accessed by frontline staff - reception, housekeeping, concierge, F&B. It is calibrated for fast, operational use. No strategic context is surfaced here.

Identity & Role
WHO YOU ARE
You are the operational assistant for hotel staff. You give clear, actionable information. You do not explain yourself at length. You tell staff what they need to know to act - and nothing more.
YOUR PURPOSE
You help staff: see their task list ranked by priority, understand the context behind each task, access relevant guest profile information, log observations and guest preferences, and know what the previous shift left unresolved.
HOW YOU COMMUNICATE
Direct and operational. Short sentences. No filler. No pleasantries that waste time. If a staff member asks what to do next, you tell them. If they log a guest note, you confirm it and surface any related context immediately.
You respond in English only, regardless of the language used in input.
Task Interaction
HOW TASKS APPEAR
Your task list is always sorted highest priority first. Each task shows: what needs to be done, which guest it relates to, why it is ranked where it is, and any guest profile context that is relevant to completing it well.
UPDATING A TASK
You can mark a task in progress, flag it as blocked, reassign it if you cannot complete it, or mark it done. When you mark it done, briefly confirm what was done - this becomes part of the guest record and the shift handover.
WHEN A TASK ESCALATES
If a task is escalated to you, it means it has been waiting too long or involves a guest who requires immediate attention. Treat escalated tasks as the first thing you handle, unless a manager has explicitly told you otherwise.
Guest Profile & Notes
WHAT YOU CAN SEE
For any guest related to your tasks, you can access: their preferences logged from previous stays, any notes from the current stay, promises made by the hotel, dietary requirements or allergies, and their tier status.
LOGGING A NOTE
If you observe something relevant about a guest, send it as a short natural language message. You do not need to fill in a form. Write it as you would say it: "Guest in 304 mentioned she is allergic to feathers" or "He said he will need an early checkout tomorrow, around 7am." The system extracts and stores what matters automatically.
WHY THIS MATTERS
Every note you send becomes part of the guest's permanent profile and the current shift's handover. The next shift will see it. If the guest returns in six months, it will still be there. Your observation today improves service tomorrow.
Shift Handover
END OF SHIFT
Before your shift ends, review the handover brief. It shows everything the incoming shift needs to know. If something is missing or incorrect, flag it. Your job is not to write the brief - the AI does that - but to confirm it is accurate before you leave.
START OF SHIFT
At the start of your shift, read the handover brief before you do anything else. It is short by design. It tells you what is open, what was promised, and what to watch. Two minutes of reading saves an hour of confusion.
Boundaries
WHAT YOU DO NOT DO
You do not make commitments to guests on behalf of the hotel unless you have explicit authorisation to do so for that category of request. If a guest asks for something outside your authority, you acknowledge the request, tell the guest you will confirm, and log it as a task for the appropriate person.
WHAT YOU SHOULD ALWAYS DO
If a guest mentions something negative - a complaint, an unmet expectation, a frustration - log it immediately. Do not wait. Do not decide it is minor. Log it and let the system route it correctly.
CONFIDENTIALITY
Guest profile data is operational and confidential. Do not discuss one guest's details in the context of another guest. Do not share profile information outside of the tasks you are working on.`;

const AI_LIMIT_MESSAGE = "AI limit reached. Try again later.";

const checklistItems = [
  "Check Menu 3 availability with kitchen staff",
  "Forward task request to F&B Coordinator",
  "Inform guest relations",
  "Allocate pool staff for a departure of a self-driven boat departing at 16:00",
  "Remind F&B Coordinator at 15:30",
];

const initialMessages: ChatMessage[] = [
  {
    id: "hello",
    role: "assistant",
    variant: "assistant",
    content: "Hello! How can I help you today?",
  },
];

function getOperationalReply(input: string) {
  const value = input.toLowerCase();

  if (value.includes("what") && value.includes("next")) {
    return "Next task: handle the highest-priority open guest request first. Check urgency, guest profile notes, and any promises already made.";
  }

  if (value.includes("done") || value.includes("complete") || value.includes("confirm")) {
    return "Done. Task updated. This will appear in the guest record and shift handover.";
  }

  if (value.includes("blocked")) {
    return "Blocked. Reason logged. Reassign or escalate to the appropriate manager now.";
  }

  if (value.includes("complaint") || value.includes("angry") || value.includes("frustrated") || value.includes("unhappy")) {
    return "Log it immediately. Mark it as guest dissatisfaction and route it for follow-up.";
  }

  if (value.includes("allerg") || value.includes("note") || value.includes("preference") || value.includes("guest")) {
    return "Logged. Guest profile updated. Related context will appear on future tasks and handover.";
  }

  return "Received. Keep it short, operational, and tied to a task, guest note, or handover item.";
}

export function HotelStaffChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messageListRef.current?.scrollTo({
      top: messageListRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 15_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let transcript = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }

      setInputValue(transcript.trimStart());
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => recognition.stop();
  }, []);

  const getAssistantReply = async (nextMessages: ChatMessage[]) => {
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({
            role: message.role === "assistant" ? "assistant" : "user",
            content: message.content,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errorCode === "AI_LIMIT_REACHED" || response.status === 429) {
          return AI_LIMIT_MESSAGE;
        }

        throw new Error(data.error || "AI request failed");
      }

      return data.text || "No response.";
    } catch (error) {
      console.error(error);
      return "AI is not configured yet. Add GEMINI_API_KEY in your environment variables.";
    }
  };

  const sendMessage = async () => {
    const text = inputValue.trim();
    if ((!text && !attachedFile) || isLoading) return;

    const attachmentText = attachedFile
      ? `Attached file: ${attachedFile.name} (${formatFileSize(attachedFile.size)})`
      : "";
    const messageContent = [text, attachmentText].filter(Boolean).join("\n");

    const staffMessage: ChatMessage = {
      id: `staff-${Date.now()}`,
      role: "staff",
      variant: "staff",
      content: messageContent,
    };
    const nextMessages = [...messages, staffMessage];

    setMessages(nextMessages);
    setInputValue("");
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIsLoading(true);

    const assistantReply = await getAssistantReply(nextMessages);

    setMessages((current) => [
      ...current,
      {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        variant: "assistant",
        content: assistantReply,
      },
    ]);
    setIsLoading(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setAttachedFile(file);
  };

  const clearAttachedFile = () => {
    setAttachedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendMessage();
    }
  };

  const toggleRecording = () => {
    if (!speechSupported || !recognitionRef.current) {
      setMessages((current) => [
        ...current,
        {
          id: `speech-${Date.now()}`,
          role: "assistant",
          variant: "assistant",
          content: "Speech recognition is not supported in this browser. Use Chrome or Edge on localhost.",
        },
      ]);
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    setInputValue("");
    recognitionRef.current.start();
    setIsRecording(true);
  };

  const formattedTime = currentTime.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <main className="phone-stage">
      <section
        className="phone-screen"
        aria-label="iPhone 17 staff assistant chat"
        data-system-prompt={STAFF_SYSTEM_PROMPT}
      >
        <header className="status-bar">
          <span className="status-time">{formattedTime}</span>
          <div className="status-icons" aria-label="Network and battery status">
            <Wifi size={18} strokeWidth={3} />
            <span>4G</span>
            <Battery size={25} strokeWidth={2.4} />
          </div>
        </header>

        <div ref={messageListRef} className="message-list">
          {messages.map((message) => {
            if (message.variant === "profile") {
              return (
                <article key={message.id} className="profile-card">
                  <p className="profile-copy">{message.content}</p>

                  <div className="suggestion-card">
                    <p>
                      MISE suggests a wine pairing of Sassicaia DOC Tenuta San Guido 2012
                      with Menu 3 based on guest profile from previous stays.
                    </p>
                    <button className="approve-button">Approve</button>
                  </div>

                  <div className="checklist">
                    {checklistItems.map((item) => (
                      <label key={item} className="check-row">
                        <input type="checkbox" aria-label={item} />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </article>
              );
            }

            if (message.variant === "confirm") {
              return (
                <div key={message.id} className="message-row message-row-right">
                  <button className="confirm-button">{message.content}</button>
                </div>
              );
            }

            const isStaff = message.role === "staff";

            return (
              <div
                key={message.id}
                className={`message-row ${isStaff ? "message-row-right" : "message-row-left"}`}
              >
                <p className={`chat-bubble ${isStaff ? "staff-bubble" : "assistant-bubble"}`}>
                  {message.content}
                </p>
              </div>
            );
          })}
          {isLoading && (
            <div className="message-row message-row-left">
              <p className="chat-bubble assistant-bubble typing-bubble">...</p>
            </div>
          )}
        </div>

        <footer className="phone-footer">
          {attachedFile && (
            <div className="attachment-pill">
              <span>
                {attachedFile.name} · {formatFileSize(attachedFile.size)}
              </span>
              <button onClick={clearAttachedFile} aria-label="Remove attachment">
                x
              </button>
            </div>
          )}
          <div className="composer">
            <input
              ref={fileInputRef}
              className="file-input"
              type="file"
              onChange={handleFileSelect}
              aria-label="Attach file"
            />
            <button
              className="composer-add"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach file"
            >
              <Plus size={30} strokeWidth={2.6} />
            </button>
            <input
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? "Listening..." : "Text here..."}
              aria-label="Message"
            />
            <button
              className={`composer-mic ${isRecording ? "composer-mic-active" : ""}`}
              onClick={toggleRecording}
              aria-label={isRecording ? "Stop recording" : "Record voice"}
              title={speechSupported ? "Record voice" : "Speech recognition unavailable"}
            >
              {isRecording ? <MicOff size={22} strokeWidth={2.5} /> : <Mic size={22} strokeWidth={2.5} />}
            </button>
            <button className="composer-send" onClick={sendMessage} aria-label="Send">
              <ArrowRight size={34} strokeWidth={2.7} />
            </button>
          </div>

          <nav className="bottom-nav" aria-label="Staff navigation">
            <button className="nav-circle" aria-label="Tasks">
              <CheckSquare size={25} strokeWidth={2.3} />
            </button>
            <button className="nav-active" aria-label="Chat">
              <span>Chat</span>
              <MessageCircle size={25} strokeWidth={2.5} />
            </button>
            <button className="nav-circle" aria-label="Guests">
              <Users size={25} strokeWidth={2.3} />
            </button>
          </nav>
        </footer>
      </section>
    </main>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
