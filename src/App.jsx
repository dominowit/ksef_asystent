import { useState, useRef, useEffect } from "react";
import TermsPage from "./TermsPage.jsx";
import PrivacyPage from "./PrivacyPage.jsx";

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
      <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#6366f1", animation: "bounce 1.2s infinite", animationDelay: `${i * 0.2}s` }} />
    ))}
  </div>
);

const parseBold = (text) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} style={{ color: "#3730a3" }}>{part.slice(2, -2)}</strong>
      : part
  );
};

const formatMessage = (text) => {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("### ")) return <h3 key={i} style={{ margin: "12px 0 4px", fontSize: "0.95rem", color: "#312e81" }}>{line.slice(4)}</h3>;
    if (line.startsWith("## ")) return <h2 key={i} style={{ margin: "14px 0 6px", fontSize: "1.05rem", color: "#1e1b4b" }}>{line.slice(3)}</h2>;
    if (line.startsWith("- ")) return <div key={i} style={{ paddingLeft: 16, margin: "2px 0", display: "flex", gap: 8 }}><span style={{ color: "#6366f1", flexShrink: 0 }}>•</span><span>{parseBold(line.slice(2))}</span></div>;
    if (/^[0-9]+[.]/.test(line)) return <div key={i} style={{ paddingLeft: 16, margin: "2px 0" }}>{parseBold(line)}</div>;
    if (line.trim() === "") return <div key={i} style={{ height: 6 }} />;
    return <p key={i} style={{ margin: "3px 0", lineHeight: 1.65 }}>{parseBold(line)}</p>;
  });
};

const PLANS = [
  { id: "solo", name: "Solo", price: "39 zł/mies.", desc: "1 użytkownik • analiza faktur • 200 wiadomości/mies.", link: "https://buy.stripe.com/cNi4gzcobg0R38C64Ocwg00" },
  { id: "small", name: "Mała firma", price: "89 zł/mies.", desc: "Do 5 użytkowników • analiza faktur • 600 wiadomości/mies.", link: "https://buy.stripe.com/9B600j2NB7ul6kO8cWcwg01" },
  { id: "business", name: "Firma", price: "199 zł/mies.", desc: "Do 25 użytkowników • analiza faktur • 2000 wiadomości/mies. • priorytetowe wsparcie", link: "https://buy.stripe.com/14AfZh3RFbKBaB41Oycwg02" },
];

const PricingModal = ({ onClose, onEnterToken, showTokenField }) => {
  const [token, setToken] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("solo");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(30,27,75,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "white", borderRadius: 20, padding: "28px 24px", width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(99,102,241,0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <h2 style={{ margin: 0, color: "#1e1b4b", fontSize: "1.3rem" }}>Wybierz plan</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "1.3rem", padding: "0 4px" }}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {PLANS.map(plan => (
            <div key={plan.id} onClick={() => setSelectedPlan(plan.id)} style={{ border: selectedPlan === plan.id ? "2px solid #4f46e5" : "2px solid #e0e7ff", borderRadius: 12, padding: "12px 16px", cursor: "pointer", background: selectedPlan === plan.id ? "#f5f3ff" : "white" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 700, color: "#1e1b4b" }}>{plan.name}</div>
                <div style={{ fontWeight: 700, color: "#4f46e5" }}>{plan.price}</div>
              </div>
              <div style={{ color: "#6b7280", fontSize: "0.8rem", marginTop: 3 }}>{plan.desc}</div>
            </div>
          ))}
        </div>
        <a href={PLANS.find(p => p.id === selectedPlan)?.link} target="_blank" rel="noopener noreferrer" style={{ display: "block", width: "100%", background: "#4f46e5", color: "white", borderRadius: 12, padding: "12px", fontWeight: 700, fontSize: "0.95rem", textAlign: "center", textDecoration: "none", marginBottom: 8 }}>
          Zapłać — {PLANS.find(p => p.id === selectedPlan)?.price}
        </a>
        <p style={{ margin: "0 0 16px", fontSize: "0.75rem", color: "#9ca3af", textAlign: "center" }}>
          Zostaniesz przekierowany na stronę płatności Stripe. Kod dostępu otrzymasz emailem.
        </p>
        {showTokenField && (
          <div style={{ borderTop: "1px solid #e0e7ff", paddingTop: 16 }}>
            <p style={{ margin: "0 0 8px", fontSize: "0.82rem", color: "#6b7280", textAlign: "center" }}>Masz już kod dostępu?</p>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Wpisz kod" style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: "1.5px solid #e0e7ff", fontSize: "0.88rem", fontFamily: "inherit" }} />
              <button onClick={() => token.trim() && onEnterToken(token.trim())} style={{ background: "#4f46e5", color: "white", border: "none", borderRadius: 10, padding: "8px 16px", cursor: "pointer", fontWeight: 600 }}>Wejdź</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SafetyModal = ({ onClose }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(30,27,75,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div style={{ background: "white", borderRadius: 20, padding: "28px 24px", width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(99,102,241,0.25)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: "#1e1b4b", fontSize: "1.2rem" }}>🛡️ Jak korzystać bezpiecznie?</h2>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "1.3rem", padding: "0 4px" }}>✕</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: "0.88rem", color: "#374151", lineHeight: 1.7 }}>
        <div style={{ background: "#f5f3ff", borderRadius: 12, padding: "12px 14px" }}>
          <strong style={{ color: "#3730a3" }}>1. Chroń dane osobowe</strong>
          <p style={{ margin: "4px 0 0" }}>Przed wklejeniem treści błędu lub fragmentu faktury usuń dane wrażliwe: imiona, nazwiska, numery telefonów, prywatne adresy e-mail. NIP-y firmowe są bezpieczne.</p>
        </div>
        <div style={{ background: "#f5f3ff", borderRadius: 12, padding: "12px 14px" }}>
          <strong style={{ color: "#3730a3" }}>2. Weryfikuj odpowiedzi</strong>
          <p style={{ margin: "4px 0 0" }}>Jestem sztuczną inteligencją. Zawsze potwierdzaj kluczowe decyzje finansowe z księgowością lub doradcą podatkowym.</p>
        </div>
        <div style={{ background: "#f5f3ff", borderRadius: 12, padding: "12px 14px" }}>
          <strong style={{ color: "#3730a3" }}>3. To nie terapia</strong>
          <p style={{ margin: "4px 0 0" }}>Chętnie wysłucham i pomogę się uspokoić — ale w przypadku poważnego kryzysu emocjonalnego skorzystaj z pomocy specjalisty.</p>
        </div>
        <div style={{ background: "#fee2e2", borderRadius: 12, padding: "12px 14px" }}>
          <strong style={{ color: "#991b1b" }}>4. Nigdy nie podawaj haseł ani tokenów</strong>
          <p style={{ margin: "4px 0 0" }}>Nie podawaj mi haseł ani tokenów autoryzacyjnych do bramki Ministerstwa Finansów.</p>
        </div>
      </div>
      <button onClick={onClose} style={{ marginTop: 20, width: "100%", background: "#4f46e5", color: "white", border: "none", borderRadius: 12, padding: "11px", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", fontFamily: "inherit" }}>Rozumiem, zaczynamy!</button>
    </div>
  </div>
);

export default function GlowaDoksef() {
  const [messages, setMessages] = useState([{ role: "assistant", content: "onboarding" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showSafety, setShowSafety] = useState(false);
  const [page, setPage] = useState("chat");
  const [userToken, setUserToken] = useState(null);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const messagesEndRef = useRef(null);
  const lastMsgRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const paywallRef = useRef(null);

  useEffect(() => {
    if (loading) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } else if (messages.length > 1 && messages[messages.length - 1].role === "assistant") {
      setTimeout(() => lastMsgRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  useEffect(() => {
    if (showPaywall && paywallRef.current) {
      setTimeout(() => paywallRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    }
  }, [showPaywall]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!userToken) {
      setMessages(prev => [...prev, { role: "assistant", content: "Analiza faktur dostępna jest w płatnych planach." }]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (!["image/jpeg","image/png","image/webp","image/gif","application/pdf"].includes(file.type)) {
      setMessages(prev => [...prev, { role: "assistant", content: "Obsługiwane formaty: JPG, PNG, WebP, PDF." }]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessages(prev => [...prev, { role: "assistant", content: "Plik jest za duży. Maksymalny rozmiar to 5 MB." }]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result.split(",")[1];
      setImage({ base64, mediaType: file.type, isPdf: file.type === "application/pdf", fileName: file.name });
      setImagePreview(file.type === "application/pdf" ? null : ev.target.result);
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
    if (!userToken && messageCount >= FREE_LIMIT) { setShowPricing(true); return; }
    setInput("");
    if (!userToken) setMessageCount(c => c + 1);
    let userMessage;
    if (image) {
      const cb = image.isPdf
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: image.base64 } }
        : { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } };
      userMessage = { role: "user", content: [cb, { type: "text", text: userText || "Sprawdź tę fakturę." }] };
    } else {
      userMessage = { role: "user", content: userText };
    }
    const apiMessages = messages
      .filter(m => m.content !== "onboarding")
      .concat(userMessage)
      .map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, { role: "user", content: userText || "Sprawdź tę fakturę.", hasImage: !!image, imagePreview }]);
    removeImage();
    setLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, userToken: userToken || null, messageCount, hasImage: !!image }),
      });
      const data = await response.json();
      if (response.status === 403) {
        if (data.error === "limit_reached") setShowPricing(true);
        else if (data.error === "upgrade_required") { setMessages(prev => [...prev, { role: "assistant", content: "Analiza faktur dostępna jest w płatnych planach." }]); setShowPaywall(true); }
        else setMessages(prev => [...prev, { role: "assistant", content: data.message || "Brak dostępu." }]);
        setLoading(false); return;
      }
      if (!response.ok) { setMessages(prev => [...prev, { role: "assistant", content: "Problem z połączeniem. Spróbuj ponownie." }]); setLoading(false); return; }
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
    setShowPricing(false);
    setMessages(prev => [...prev, { role: "assistant", content: "Kod przyjęty — masz pełny dostęp. Czym mogę pomóc?" }]);
  };

  const isPaid = !!userToken;
  const remainingFree = Math.max(0, FREE_LIMIT - messageCount);

  if (page === "terms") return <TermsPage onBack={() => setPage("chat")} />;
  if (page === "privacy") return <PrivacyPage onBack={() => setPage("chat")} />;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #eef2ff 0%, #f5f3ff 50%, #ede9fe 100%)", fontFamily: "'Source Serif 4', Georgia, serif", display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: 32 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Source+Serif+4:wght@300;400;600&display=swap');
        * { box-sizing: border-box; }
        textarea:focus, input:focus { outline: none; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #c7d2fe; border-radius: 10px; }
        .quick-btn:hover { background: #4f46e5 !important; color: white !important; }
        .send-btn:hover { background: #4338ca !important; }
        @keyframes bounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-6px); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
        @media (max-width: 480px) {
          .header-title { font-size: 1.1rem !important; }
          .header-subtitle { font-size: 0.72rem !important; }
          .header-btn-small { font-size: 0.65rem !important; padding: 4px 8px !important; }
        }
      `}</style>

      {showPricing && <PricingModal onClose={() => setShowPricing(false)} onEnterToken={handleEnterToken} showTokenField={true} />}
      {showSafety && <SafetyModal onClose={() => setShowSafety(false)} />}

      <div style={{ width: "100%", background: "linear-gradient(135deg, #4c0519, #881337, #be123c)", padding: "20px 20px 11px", textAlign: "center", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 4px 20px rgba(79,70,229,0.25)", overflow: "visible" }}>
        <div style={{ position: "absolute", top: 14, left: 16, display: "flex", flexDirection: "column", gap: 6 }}>
          <button onClick={() => setShowSafety(true)} className="header-btn-small" style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 20, padding: "6px 14px", color: "white", fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit" }}>🛡️ Bezpieczeństwo</button>
          <a href="https://ksef.systems" target="_blank" rel="noopener noreferrer" className="header-btn-small" style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 20, padding: "6px 14px", color: "white", fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit", textDecoration: "none", textAlign: "center" }}>🟢 Status MF</a>
        </div>
        {!isPaid && (
          <button onClick={() => setShowPricing(true)} className="header-btn-small" style={{ position: "absolute", top: 14, right: 16, background: "rgba(255,255,255,0.2)", border: "1.5px solid rgba(255,255,255,0.4)", borderRadius: 20, padding: "6px 14px", color: "white", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            {remainingFree > 0 ? `Kup dostęp · ${remainingFree}/${FREE_LIMIT} wiad.` : "⚠️ Limit wyczerpany"}
          </button>
        )}
        {isPaid && (
          <a href="https://billing.stripe.com/p/login/cNi4gzcobg0R38C64Ocwg00" target="_blank" rel="noopener noreferrer" style={{ position: "absolute", top: 14, right: 16, background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 20, padding: "6px 14px", color: "white", fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit", textDecoration: "none" }}>Zarządzaj subskrypcją</a>
        )}
        <img src="/logo.png" alt="Głowa do KSeF" style={{ width: 147, height: 147, objectFit: "contain", position: "absolute", left: "50%", transform: "translateX(-50%)", top: "30%", marginTop: -73, pointerEvents: "none" }} />
        <div style={{ height: 120, display: "block" }} />
        <h1 className="header-title" style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", color: "white", fontWeight: 700 }}>Głowa do KSeF</h1>
        <p className="header-subtitle" style={{ margin: "4px 0 0", color: "#c7d2fe", fontSize: "0.85rem", fontWeight: 300 }}>e-Faktury po ludzku • Przepisy bez stresu • Wsparcie psychologiczne</p>
        {isPaid && (
          <div style={{ marginTop: 10, background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "4px 14px", display: "inline-block", fontSize: "0.78rem", color: "#a5f3fc" }}>Pełny dostęp</div>
        )}
      </div>

      {messages.length <= 1 && !showPaywall && (
        <div style={{ maxWidth: 680, width: "calc(100% - 32px)", margin: "20px 16px 0", animation: "slideIn 0.6s ease" }}>
          <p style={{ margin: "0 0 10px", fontSize: "0.8rem", color: "#6366f1", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Częste pytania</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {QUICK_QUESTIONS.map((q, i) => (
              <button key={i} className="quick-btn" onClick={() => sendMessage(q.text)} style={{ background: "white", border: "1.5px solid #c7d2fe", borderRadius: 20, padding: "8px 14px", fontSize: "0.82rem", color: "#3730a3", cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit" }}>{q.text}</button>
            ))}
          </div>
        </div>
      )}

      <div style={{ maxWidth: 680, width: "calc(100% - 32px)", margin: "20px 16px 0", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
        {messages.map((msg, i) => (
          <div key={i} ref={i === messages.length - 1 && msg.role === "assistant" ? lastMsgRef : null} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", animation: "fadeIn 0.35s ease" }}>
            {msg.role === "assistant" && (
              <div style={{ width: 42, height: 42, borderRadius: "50%", overflow: "hidden", flexShrink: 0, marginRight: 10, marginTop: 4, boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }}><img src="/avatar.png" alt="bot" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
            )}
            <div style={{ maxWidth: "78%", background: msg.role === "user" ? "linear-gradient(135deg, #4f46e5, #6366f1)" : "white", color: msg.role === "user" ? "white" : "#1e1b4b", borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "12px 16px", fontSize: "0.88rem", lineHeight: 1.65, boxShadow: msg.role === "user" ? "0 4px 12px rgba(79,70,229,0.3)" : "0 2px 12px rgba(0,0,0,0.07)" }}>
              {msg.hasImage && msg.imagePreview && <img src={msg.imagePreview} alt="faktura" style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 8, display: "block" }} />}
              {msg.role === "assistant" && msg.content === "onboarding" ? (
                <div>
                  <p style={{ margin: "0 0 8px" }}>Cześć! Pomogę Ci z KSeF i stresem z nim związanym.</p>
                  <div style={{ background: "#f5f3ff", borderRadius: 8, padding: "8px 10px", fontSize: "0.83rem", color: "#4338ca", lineHeight: 1.6, margin: "0 0 8px" }}>
                    ⚠️ Pamiętaj: nie jestem doradcą podatkowym, terapeutą ani lekarzem. Korzystając z asystenta, akceptujesz{" "}
                    <button onClick={() => setPage("terms")} style={{ background: "none", border: "none", padding: 0, color: "#4f46e5", textDecoration: "underline", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit" }}>regulamin</button>.
                  </div>
                  <p style={{ margin: "0 0 4px" }}>Możesz pytać o terminy, błędy, uprawnienia, integracje — masz 5 bezpłatnych wiadomości na start.</p>
                  <p style={{ margin: 0, fontSize: "0.83rem", color: "#6b7280" }}>Każda sesja jest niezależna. Co Cię sprowadza?</p>
                  <p style={{ margin: "8px 0 0", fontSize: "0.78rem", color: "#9ca3af" }}>Problemy techniczne? Napisz na <a href="mailto:kontakt@glowadoksef.pl" style={{ color: "#6366f1", textDecoration: "none" }}>kontakt@glowadoksef.pl</a></p>
                </div>
              ) : msg.role === "assistant" ? formatMessage(msg.content) : msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start", animation: "fadeIn 0.3s ease" }}>
            <div style={{ width: 42, height: 42, borderRadius: "50%", overflow: "hidden", flexShrink: 0, marginRight: 10, boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }}><img src="/avatar.png" alt="bot" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
            <div style={{ background: "white", borderRadius: "18px 18px 18px 4px", padding: "12px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
              <TypingIndicator />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {showPaywall && (
        <div ref={paywallRef} style={{ maxWidth: 680, width: "calc(100% - 32px)", margin: "16px 16px 0", animation: "fadeIn 0.3s ease" }}>
          <PricingModal onClose={() => setShowPaywall(false)} onEnterToken={handleEnterToken} showTokenField={true} />
        </div>
      )}

      <div style={{ maxWidth: 680, width: "calc(100% - 32px)", margin: "16px 16px 0", position: "sticky", bottom: 16 }}>
        {(imagePreview || image?.isPdf) && (
          <div style={{ background: "white", borderRadius: "12px 12px 0 0", padding: "8px 12px", display: "flex", alignItems: "center", gap: 10, border: "1.5px solid #e0e7ff", borderBottom: "none" }}>
            {image?.isPdf
              ? <div style={{ width: 48, height: 48, borderRadius: 6, background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>📄</div>
              : <img src={imagePreview} alt="podgląd" style={{ height: 48, borderRadius: 6, objectFit: "cover" }} />
            }
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: "0.82rem", color: "#6b7280", display: "block" }}>{image?.isPdf ? image.fileName : "Plik gotowy do analizy"}</span>
              <span style={{ fontSize: "0.72rem", color: "#9ca3af" }}>Analiza pliku ma charakter poglądowy</span>
            </div>
            <button onClick={removeImage} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "1.1rem", padding: 4 }}>✕</button>
          </div>
        )}
        <div style={{ background: "white", borderRadius: (imagePreview || image?.isPdf) ? "0 0 20px 20px" : 20, padding: "8px 8px 8px 16px", display: "flex", alignItems: "flex-end", gap: 8, boxShadow: "0 4px 24px rgba(99,102,241,0.15)", border: "1.5px solid #e0e7ff" }}>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style={{ display: "none" }} onChange={handleImageUpload} />
          <button onClick={() => fileInputRef.current?.click()} title={isPaid ? "Wyślij fakturę do analizy" : "Dostępne w płatnych planach"} style={{ background: isPaid ? "#f5f3ff" : "#f9fafb", border: "1.5px solid " + (isPaid ? "#c7d2fe" : "#e5e7eb"), borderRadius: 12, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: isPaid ? "pointer" : "not-allowed", flexShrink: 0, fontSize: "1rem", color: isPaid ? "#6366f1" : "#d1d5db" }}>📎</button>
          <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey} placeholder={isPaid ? "Napisz pytanie lub wyślij zdjęcie faktury..." : "Napisz pytanie o KSeF, błąd, problem..."} disabled={loading} rows={1} style={{ flex: 1, border: "none", background: "transparent", resize: "none", fontSize: "0.9rem", fontFamily: "inherit", color: "#1e1b4b", padding: "6px 0", lineHeight: 1.5, maxHeight: 120, overflowY: "auto" }} onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }} />
          <button className="send-btn" onClick={() => sendMessage()} disabled={loading || (!input.trim() && !image)} style={{ background: (loading || (!input.trim() && !image)) ? "#c7d2fe" : "#4f46e5", color: "white", border: "none", borderRadius: 14, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: (loading || (!input.trim() && !image)) ? "not-allowed" : "pointer", transition: "background 0.2s", flexShrink: 0, fontSize: "1rem" }}>{loading ? "⏳" : "↑"}</button>
        </div>
        <p style={{ textAlign: "center", margin: "8px 0 0", fontSize: "0.72rem", color: "#a5b4fc" }}>AI może generować błędy. Zawsze weryfikuj ważne faktury z księgowością.</p>
        <p style={{ textAlign: "center", margin: "6px 0 0", fontSize: "0.72rem" }}>
          <button onClick={() => setPage("terms")} style={{ background: "none", border: "none", color: "#a5b4fc", cursor: "pointer", fontSize: "0.72rem", fontFamily: "inherit", textDecoration: "underline", padding: 0 }}>Regulamin</button>
          <span style={{ color: "#c7d2fe", margin: "0 6px" }}>•</span>
          <button onClick={() => setPage("privacy")} style={{ background: "none", border: "none", color: "#a5b4fc", cursor: "pointer", fontSize: "0.72rem", fontFamily: "inherit", textDecoration: "underline", padding: 0 }}>Polityka prywatności</button>
        </p>
      </div>
    </div>
  );
}
