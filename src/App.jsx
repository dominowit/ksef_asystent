import { useState, useRef, useEffect } from "react";

const FREE_LIMIT = 5;

const QUICK_QUESTIONS = [
  { text: "Od kiedy muszę używać KSeF?" },
  { text: "Mam błąd przy wysyłce faktury" },
  { text: "Jak nadać uprawnienia pracownikowi?" },
  { text: "Boję się, że coś zepsuję" },
  { text: "Mój program nie obsługuje KSeF" },
  { text: "Jak zrobić fakturę korygującą?" },
];

const TypingIndicator = () => (
  <div style={{ display: "flex", gap: "5px", alignItems: "center", padding: "4px 0" }}>
    {[0, 1, 2].map((i) => (
      <div key={i} style={{
        width: 8, height: 8, borderRadius: "50%", background: "#6366f1",
        animation: "bounce 1.2s infinite", animationDelay: `${i * 0.2}s`,
      }} />
    ))}
  </div>
);

const formatMessage = (text) => {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (line.startsWith("### ")) return <h3 key={i} style={{ margin: "12px 0 4px", fontSize: "0.95rem", color: "#312e81", fontFamily: "'Playfair Display', serif" }}>{line.slice(4)}</h3>;
    if (line.startsWith("## ")) return <h2 key={i} style={{ margin: "14px 0 6px", fontSize: "1.05rem", color: "#1e1b4b", fontFamily: "'Playfair Display', serif" }}>{line.slice(3)}</h2>;
    if (line.startsWith("- ")) return <div key={i} style={{ paddingLeft: 16, margin: "2px 0", display: "flex", gap: 8 }}><span style={{ color: "#6366f1", flexShrink: 0 }}>•</span><span>{parseBold(line.slice(2))}</span></div>;
    if (/^\d+\./.test(line)) return <div key={i} style={{ paddingLeft: 16, margin: "2px 0" }}>{parseBold(line)}</div>;
    if (line.trim() === "") return <div key={i} style={{ height: 6 }} />;
    return <p key={i} style={{ margin: "3px 0", lineHeight: 1.65 }}>{parseBold(line)}</p>;
  });
};

const parseBold = (text) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} style={{ color: "#3730a3" }}>{part.slice(2, -2)}</strong>
      : part
  );
};

// Ekran paywall
const PaywallScreen = ({ onEnterToken }) => {
  const [token, setToken] = useState("");
  return (
    <div style={{
      background: "white", borderRadius: 16, padding: "28px 24px",
      maxWidth: 420, margin: "0 auto", textAlign: "center",
      boxShadow: "0 4px 24px rgba(99,102,241,0.12)",
    }}>
      <div style={{ fontSize: "2rem", marginBottom: 12 }}>🔒</div>
      <h2 style={{ margin: "0 0 8px", fontFamily: "'Playfair Display', serif", color: "#1e1b4b", fontSize: "1.3rem" }}>
        Wykorzystałeś 5 bezpłatnych wiadomości
      </h2>
      <p style={{ margin: "0 0 20px", color: "#6b7280", fontSize: "0.9rem", lineHeight: 1.6 }}>
        Żeby kontynuować, wykup dostęp. Po opłaceniu otrzymasz kod dostępu na podany email.
      </p>

      <div style={{ background: "#f5f3ff", borderRadius: 12, padding: "16px", marginBottom: 20, textAlign: "left" }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, color: "#3730a3", fontSize: "0.9rem" }}>Solo — 39 zł/mies.</div>
          <div style={{ color: "#6b7280", fontSize: "0.82rem" }}>1 użytkownik, analiza faktur, 200 wiadomości</div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, color: "#3730a3", fontSize: "0.9rem" }}>Mała firma — 89 zł/mies.</div>
          <div style={{ color: "#6b7280", fontSize: "0.82rem" }}>Do 5 użytkowników, wszystkie funkcje</div>
        </div>
        <div>
          <div style={{ fontWeight: 700, color: "#3730a3", fontSize: "0.9rem" }}>Firma — 199 zł/mies.</div>
          <div style={{ color: "#6b7280", fontSize: "0.82rem" }}>Do 25 użytkowników, white-label</div>
        </div>
      </div>

      <a
        href="mailto:twoj@email.pl?subject=KSeF Asystent — zamówienie dostępu"
        style={{
          display: "block", background: "#4f46e5", color: "white",
          padding: "12px", borderRadius: 12, textDecoration: "none",
          fontWeight: 600, fontSize: "0.9rem", marginBottom: 16,
        }}
      >
        Zamów dostęp
      </a>

      <div style={{ borderTop: "1px solid #e0e7ff", paddingTop: 16 }}>
        <p style={{ margin: "0 0 8px", fontSize: "0.82rem", color: "#6b7280" }}>Masz już kod dostępu?</p>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Wpisz kod"
            style={{
              flex: 1, padding: "8px 12px", borderRadius: 10, border: "1.5px solid #e0e7ff",
              fontSize: "0.88rem", fontFamily: "inherit", outline: "none",
            }}
          />
          <button
            onClick={() => token.trim() && onEnterToken(token.trim())}
            style={{
              background: "#4f46e5", color: "white", border: "none",
              borderRadius: 10, padding: "8px 16px", cursor: "pointer",
              fontSize: "0.88rem", fontWeight: 600,
            }}
          >
            Wejdź
          </button>
        </div>
      </div>
    </div>
  );
};

export default function KSeFAsystent() {
  const [messages, setMessages] = useState([{
    role: "assistant",
    content: "Cześć. Jestem asystentem KSeF — stworzył mnie psycholog, który widział ile stresu ten system powoduje i pomyślał że da się inaczej.\n\nMożesz zapytać o terminy, błędy, uprawnienia, integracje. Masz 5 bezpłatnych wiadomości na start. Co Cię sprowadza?",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [userToken, setUserToken] = useState(null);
  const [image, setImage] = useState(null); // { base64, mediaType }
  const [imagePreview, setImagePreview] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!userToken) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Analiza faktur dostępna jest w płatnych planach. Wykup dostęp żeby z niej korzystać.",
      }]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result.split(",")[1];
      const mediaType = file.type;
      setImage({ base64, mediaType });
      setImagePreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if ((!userText && !image) || loading) return;

    if (!userToken && messageCount >= FREE_LIMIT) {
      setShowPaywall(true);
      return;
    }

    setInput("");

    // Zwiększ licznik od razu przy wysyłce (nie czekaj na odpowiedź)
    if (!userToken) setMessageCount(c => c + 1);

    // Zbuduj wiadomość — z obrazem lub bez
    let userMessage;
    if (image) {
      userMessage = {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } },
          { type: "text", text: userText || "Sprawdź tę fakturę i powiedz czy jest poprawna pod kątem KSeF." },
        ],
      };
    } else {
      userMessage = { role: "user", content: userText };
    }

    const displayText = userText || "Sprawdź tę fakturę.";
    const newMessages = [...messages, userMessage];
    setMessages(prev => [...prev, {
      role: "user",
      content: displayText,
      hasImage: !!image,
      imagePreview: imagePreview,
    }]);
    removeImage();
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          userToken: userToken || null,
          messageCount,
          hasImage: !!image,
        }),
      });

      const data = await response.json();

      if (response.status === 403) {
        if (data.error === "limit_reached") {
          setShowPaywall(true);
        } else if (data.error === "upgrade_required") {
          setMessages(prev => [...prev, { role: "assistant", content: "Analiza faktur dostępna jest w płatnych planach. Wykup dostęp żeby z niej korzystać." }]);
          setShowPaywall(true);
        } else {
          setMessages(prev => [...prev, { role: "assistant", content: data.message || "Brak dostępu." }]);
        }
        setLoading(false);
        return;
      }

      if (!response.ok) {
        setMessages(prev => [...prev, { role: "assistant", content: "Problem z połączeniem. Spróbuj ponownie." }]);
        setLoading(false);
        return;
      }

      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);

    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Problem z połączeniem. Sprawdź internet i spróbuj ponownie." }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleEnterToken = (token) => {
    setUserToken(token);
    setShowPaywall(false);
    setMessages(prev => [...prev, {
      role: "assistant",
      content: "Kod przyjęty — masz pełny dostęp. Możesz teraz wysyłać zdjęcia faktur i rozmawiać bez limitu. Czym mogę pomóc?",
    }]);
  };

  const isPaid = !!userToken;
  const remainingFree = Math.max(0, FREE_LIMIT - messageCount);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #eef2ff 0%, #f5f3ff 50%, #ede9fe 100%)",
      fontFamily: "'Source Serif 4', Georgia, serif",
      display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: 32,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Source+Serif+4:wght@300;400;600&display=swap');
        * { box-sizing: border-box; }
        textarea:focus, input:focus { outline: none; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #c7d2fe; border-radius: 10px; }
        .quick-btn:hover { background: #4f46e5 !important; color: white !important; }
        .send-btn:hover { background: #4338ca !important; }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        width: "100%", background: "linear-gradient(135deg, #3730a3, #4f46e5, #6366f1)",
        padding: "24px 20px 20px", textAlign: "center",
        position: "sticky", top: 0, zIndex: 10,
        boxShadow: "0 4px 20px rgba(79,70,229,0.25)",
      }}>
        <div style={{ fontSize: "2rem", marginBottom: 4 }}>📄</div>
        <h1 style={{
          margin: 0, fontFamily: "'Playfair Display', serif",
          fontSize: "1.6rem", color: "white", fontWeight: 700, letterSpacing: "-0.5px",
        }}>Asystent KSeF</h1>
        <p style={{ margin: "4px 0 0", color: "#c7d2fe", fontSize: "0.85rem", fontWeight: 300 }}>
          e-Faktury po ludzku • Przepisy bez stresu • Wsparcie psychologiczne
        </p>
        {!isPaid && (
          <div style={{
            marginTop: 10, background: "rgba(255,255,255,0.15)", borderRadius: 20,
            padding: "4px 14px", display: "inline-block", fontSize: "0.78rem", color: "white",
          }}>
            {remainingFree > 0
              ? `Pozostało ${remainingFree} z ${FREE_LIMIT} bezpłatnych wiadomości`
              : "Limit bezpłatnych wiadomości wyczerpany"}
          </div>
        )}
        {isPaid && (
          <div style={{
            marginTop: 10, background: "rgba(255,255,255,0.15)", borderRadius: 20,
            padding: "4px 14px", display: "inline-block", fontSize: "0.78rem", color: "#a5f3fc",
          }}>
            Pełny dostęp
          </div>
        )}
      </div>

      {/* Paywall — pod wiadomościami, nie zamiast czatu */}
      {showPaywall && (
        <div style={{
          maxWidth: 680, width: "calc(100% - 32px)", margin: "16px 16px 0",
          animation: "fadeIn 0.3s ease",
        }}>
          <PaywallScreen onEnterToken={handleEnterToken} />
        </div>
      )}

      {/* Quick questions */}
      {messages.length <= 1 && !showPaywall && (
        <div style={{
          maxWidth: 680, width: "calc(100% - 32px)", margin: "20px 16px 0",
          animation: "slideIn 0.6s ease",
        }}>
          <p style={{ margin: "0 0 10px", fontSize: "0.8rem", color: "#6366f1", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Częste pytania
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {QUICK_QUESTIONS.map((q, i) => (
              <button key={i} className="quick-btn" onClick={() => sendMessage(q.text)} style={{
                background: "white", border: "1.5px solid #c7d2fe", borderRadius: 20,
                padding: "8px 14px", fontSize: "0.82rem", color: "#3730a3",
                cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit",
              }}>
                {q.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{
        maxWidth: 680, width: "calc(100% - 32px)", margin: "20px 16px 0",
        flex: 1, display: "flex", flexDirection: "column", gap: 16,
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            animation: "fadeIn 0.35s ease",
          }}>
            {msg.role === "assistant" && (
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "linear-gradient(135deg, #4f46e5, #6366f1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.9rem", flexShrink: 0, marginRight: 10, marginTop: 4,
                boxShadow: "0 2px 8px rgba(99,102,241,0.3)",
              }}>📄</div>
            )}
            <div style={{
              maxWidth: "78%",
              background: msg.role === "user" ? "linear-gradient(135deg, #4f46e5, #6366f1)" : "white",
              color: msg.role === "user" ? "white" : "#1e1b4b",
              borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              padding: "12px 16px", fontSize: "0.88rem", lineHeight: 1.65,
              boxShadow: msg.role === "user" ? "0 4px 12px rgba(79,70,229,0.3)" : "0 2px 12px rgba(0,0,0,0.07)",
            }}>
              {msg.hasImage && msg.imagePreview && (
                <img src={msg.imagePreview} alt="faktura" style={{
                  maxWidth: "100%", borderRadius: 8, marginBottom: 8, display: "block",
                }} />
              )}
              {msg.role === "assistant" ? formatMessage(msg.content) : msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start", animation: "fadeIn 0.3s ease" }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "linear-gradient(135deg, #4f46e5, #6366f1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.9rem", flexShrink: 0, marginRight: 10,
              boxShadow: "0 2px 8px rgba(99,102,241,0.3)",
            }}>📄</div>
            <div style={{ background: "white", borderRadius: "18px 18px 18px 4px", padding: "12px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
              <TypingIndicator />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input — zawsze widoczny */}
      <div style={{
          maxWidth: 680, width: "calc(100% - 32px)", margin: "16px 16px 0",
          position: "sticky", bottom: 16,
        }}>
          {/* Podgląd obrazu */}
          {imagePreview && (
            <div style={{
              background: "white", borderRadius: "12px 12px 0 0", padding: "8px 12px",
              display: "flex", alignItems: "center", gap: 10,
              border: "1.5px solid #e0e7ff", borderBottom: "none",
            }}>
              <img src={imagePreview} alt="podgląd" style={{ height: 48, borderRadius: 6, objectFit: "cover" }} />
              <span style={{ fontSize: "0.82rem", color: "#6b7280", flex: 1 }}>Faktura gotowa do analizy</span>
              <button onClick={removeImage} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#9ca3af", fontSize: "1.1rem", padding: 4,
              }}>✕</button>
            </div>
          )}

          <div style={{
            background: "white",
            borderRadius: imagePreview ? "0 0 20px 20px" : 20,
            padding: "8px 8px 8px 16px",
            display: "flex", alignItems: "flex-end", gap: 8,
            boxShadow: "0 4px 24px rgba(99,102,241,0.15)",
            border: "1.5px solid #e0e7ff",
          }}>
            {/* Przycisk zdjęcia — tylko dla płatnych */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              style={{ display: "none" }}
              onChange={handleImageUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              title={isPaid ? "Wyślij fakturę do analizy" : "Dostępne w płatnych planach"}
              style={{
                background: isPaid ? "#f5f3ff" : "#f9fafb",
                border: "1.5px solid " + (isPaid ? "#c7d2fe" : "#e5e7eb"),
                borderRadius: 12, width: 36, height: 36,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: isPaid ? "pointer" : "not-allowed",
                flexShrink: 0, fontSize: "1rem",
                color: isPaid ? "#6366f1" : "#d1d5db",
              }}
            >
              📎
            </button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={isPaid ? "Napisz pytanie lub wyślij zdjęcie faktury..." : "Napisz pytanie o KSeF, błąd, problem..."}
              disabled={loading}
              rows={1}
              style={{
                flex: 1, border: "none", background: "transparent", resize: "none",
                fontSize: "0.9rem", fontFamily: "inherit", color: "#1e1b4b",
                padding: "6px 0", lineHeight: 1.5, maxHeight: 120, overflowY: "auto",
              }}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
            />
            <button
              className="send-btn"
              onClick={() => sendMessage()}
              disabled={loading || (!input.trim() && !image)}
              style={{
                background: (loading || (!input.trim() && !image)) ? "#c7d2fe" : "#4f46e5",
                color: "white", border: "none", borderRadius: 14,
                width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
                cursor: (loading || (!input.trim() && !image)) ? "not-allowed" : "pointer",
                transition: "background 0.2s", flexShrink: 0, fontSize: "1rem",
              }}
            >
              {loading ? "⏳" : "↑"}
            </button>
          </div>
          <p style={{ textAlign: "center", margin: "8px 0 0", fontSize: "0.72rem", color: "#a5b4fc" }}>
            Asystent AI — nie zastępuje doradcy podatkowego. Dane przesyłane są przez Anthropic API i nie są przez nas przechowywane.
          </p>
        </div>
    </div>
  );
}
