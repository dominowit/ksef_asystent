import { useState, useRef, useEffect, useCallback } from "react";

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
      <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#7B2D52", animation: "bounce 1.2s infinite", animationDelay: `${i * 0.2}s` }} />
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

const PaywallChatMessage = ({ onShowPlans, resetText }) => (
  <div style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)", borderRadius: "18px 18px 18px 4px", padding: "20px 20px 16px", color: "white", boxShadow: "0 4px 20px rgba(79,70,229,0.35)", maxWidth: "78%" }}>
    <p style={{ margin: "0 0 6px", fontSize: "1.05rem", fontWeight: 700 }}>Głowa do KSeF potrzebuje chwili odpoczynku... ☕</p>
    <p style={{ margin: "0 0 14px", fontSize: "0.85rem", color: "#c7d2fe", lineHeight: 1.6 }}>
      Twoje darmowe wsparcie na dziś się wyczerpało. Jako mały, niezależny projekt musimy dbać o serwery, aby każdy polski przedsiębiorca mógł otrzymać jasną odpowiedź w tym gorącym czasie.
    </p>
    <p style={{ margin: "0 0 10px", fontSize: "0.85rem", color: "#e0e7ff", fontWeight: 600 }}>Odblokuj pełne możliwości i zyskaj święty spokój:</p>
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
      {[
        "Pytać bez limitów o każdy błąd, kod i zawiły przepis.",
        "Analizować faktury – prześlij plik, a ja sprawdzę, czy nie ma w nim błędów, zanim wyślesz go do KSeF.",
        "Mieć dostęp do eksperckiej wiedzy 24/7 – bez czekania na infolinię MF.",
        "Wesprzeć rozwój polskiego narzędzia stworzonego dla firm, a nie dla urzędów.",
      ].map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 8, fontSize: "0.83rem", color: "#ddd6fe", lineHeight: 1.55 }}>
          <span style={{ flexShrink: 0 }}>✅</span>
          <span>{item}</span>
        </div>
      ))}
    </div>
    {resetText && (
      <p style={{ margin: "0 0 14px", fontSize: "0.75rem", color: "#a5b4fc", textAlign: "center" }}>🕐 {resetText}</p>
    )}
    <div style={{ display: "flex", justifyContent: "center" }}>
      <button
        onClick={onShowPlans}
        style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "white", border: "none", borderRadius: 14, padding: "12px 28px", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 14px rgba(99,102,241,0.5)", letterSpacing: "0.01em" }}
      >
        Zobacz plany →
      </button>
    </div>
  </div>
);

const PlanLimitMessage = ({ resetDate }) => (
  <div style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)", borderRadius: "18px 18px 18px 4px", padding: "20px 20px 16px", color: "white", boxShadow: "0 4px 20px rgba(79,70,229,0.35)", maxWidth: "78%" }}>
    <p style={{ margin: "0 0 6px", fontSize: "1.05rem", fontWeight: 700 }}>Wykorzystałeś limit wiadomości na ten miesiąc 📭</p>
    <p style={{ margin: "0 0 16px", fontSize: "0.85rem", color: "#c7d2fe", lineHeight: 1.6 }}>
      Twój plan ma swój miesięczny limit — dbamy w ten sposób o jakość i koszty serwera dla wszystkich.
      {resetDate && <span> Limit odnowi się <strong style={{ color: "white" }}>{resetDate}</strong>.</span>}
    </p>
    <p style={{ margin: "0 0 10px", fontSize: "0.85rem", color: "#e0e7ff", fontWeight: 600 }}>Możesz teraz:</p>
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
      {[
        "Kupić jednorazowy reset limitu za 29 zł i kontynuować od razu.",
        "Poczekać na automatyczne odnowienie limitu.",
        "Przejść na wyższy plan z większą liczbą wiadomości.",
      ].map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 8, fontSize: "0.83rem", color: "#ddd6fe", lineHeight: 1.55 }}>
          <span style={{ flexShrink: 0 }}>•</span>
          <span>{item}</span>
        </div>
      ))}
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <a
        href="https://buy.stripe.com/eVqaEX9bZbKB10u64Ocwg03"
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "block", background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "white", border: "none", borderRadius: 14, padding: "12px 28px", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 14px rgba(99,102,241,0.5)", textAlign: "center", textDecoration: "none" }}
      >
        Kup reset za 29 zł →
      </a>
      <p style={{ margin: 0, fontSize: "0.72rem", color: "#a5b4fc", textAlign: "center" }}>Po zakupie otrzymasz email z potwierdzeniem resetu.</p>
    </div>
  </div>
);

const PricingModal = ({ onClose, onEnterToken }) => {
  const [activeTab, setActiveTab] = useState("trial");
  const [token, setToken] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("solo");
  const [trialEmail, setTrialEmail] = useState("");
  const [trialStatus, setTrialStatus] = useState("idle");
  const [trialErrorMsg, setTrialErrorMsg] = useState("");

  const handleTrialSubmit = async () => {
    if (!trialEmail.trim()) return;
    setTrialStatus("loading");
    setTrialErrorMsg("");
    try {
      const res = await fetch("/api/request-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trialEmail.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setTrialStatus("sent");
      } else {
        setTrialStatus("error");
        if (data.error === "already_active") setTrialErrorMsg("Ten email ma już aktywny trial. Sprawdź skrzynkę.");
        else if (data.error === "trial_used") setTrialErrorMsg("Ten adres był już użyty do trialu. Wybierz plan.");
        else if (data.error === "converted") setTrialErrorMsg("Ten email ma już aktywną subskrypcję.");
        else setTrialErrorMsg(data.error || "Coś poszło nie tak. Spróbuj ponownie.");
      }
    } catch {
      setTrialStatus("error");
      setTrialErrorMsg("Problem z połączeniem. Spróbuj ponownie.");
    }
  };

  const tabStyle = (name) => ({
    flex: 1, padding: "8px 6px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
    fontSize: "0.78rem", fontWeight: 600, border: "1.5px solid #e0e7ff", textAlign: "center",
    background: activeTab === name ? "#1e1b4b" : "white",
    color: activeTab === name ? "white" : "#6b7280",
    transition: "all 0.15s",
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(30,27,75,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "white", borderRadius: 20, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(99,102,241,0.25)", overflow: "hidden" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 20px 0" }}>
          <h2 style={{ margin: 0, color: "#1e1b4b", fontSize: "1.2rem", fontWeight: 700 }}>Dostęp do Głowy do KSeF</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "1.3rem", padding: "0 4px" }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 4, padding: "16px 20px" }}>
          <button style={tabStyle("trial")} onClick={() => setActiveTab("trial")}>7 dni za darmo</button>
          <button style={tabStyle("plans")} onClick={() => setActiveTab("plans")}>Kup plan</button>
          <button style={tabStyle("code")} onClick={() => setActiveTab("code")}>Mam kod</button>
        </div>

        <div style={{ padding: "0 20px 24px" }}>
          {activeTab === "trial" && (
            <div>
              <div style={{ background: "linear-gradient(160deg, #1e1b4b, #3730a3)", borderRadius: 14, padding: "22px 20px", marginBottom: 16, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.05)", top: -25, right: -25 }} />
                <div style={{ position: "absolute", width: 70, height: 70, borderRadius: "50%", background: "rgba(255,255,255,0.05)", bottom: -15, left: -15 }} />
                <div style={{ fontSize: "3rem", fontWeight: 700, color: "white", lineHeight: 1 }}>7</div>
                <div style={{ fontSize: "0.85rem", color: "#a5b4fc", margin: "4px 0 16px" }}>dni pełnego dostępu — gratis</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {["Pytania bez limitu o KSeF, JPK, błędy", "Analiza faktur — prześlij plik do sprawdzenia", "Dostęp 24/7, bez karty kredytowej"].map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", color: "#e0e7ff" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#818cf8", flexShrink: 0 }} />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
              {trialStatus !== "sent" ? (
                <>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input type="email" value={trialEmail} onChange={(e) => setTrialEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleTrialSubmit()} placeholder="twoj@email.pl" style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1.5px solid #c7d2fe", fontSize: "0.88rem", fontFamily: "inherit", outline: "none", color: "#1e1b4b" }} />
                    <button onClick={handleTrialSubmit} disabled={trialStatus === "loading" || !trialEmail.trim()} style={{ background: trialStatus === "loading" ? "#94a3b8" : "#1e3a5f", color: "white", border: "none", borderRadius: 10, padding: "10px 16px", fontWeight: 700, fontSize: "0.85rem", cursor: trialStatus === "loading" ? "not-allowed" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                      {trialStatus === "loading" ? "..." : "Wyślij →"}
                    </button>
                  </div>
                  {trialStatus === "error" && <p style={{ margin: "0 0 6px", fontSize: "0.75rem", color: "#dc2626" }}>{trialErrorMsg}</p>}
                  <p style={{ margin: 0, fontSize: "0.7rem", color: "#9ca3af", lineHeight: 1.5 }}>Podając email, dołączasz do newslettera Głowy do KSeF. Możesz wypisać się w każdej chwili.</p>
                </>
              ) : (
                <>
                  <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 12, padding: "14px", textAlign: "center", marginBottom: 8 }}>
                    <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#166534", fontSize: "0.9rem" }}>📬 Sprawdź skrzynkę!</p>
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "#16a34a" }}>Link aktywacyjny wysłany. Jeśli nie widzisz — sprawdź spam.</p>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.7rem", color: "#9ca3af", textAlign: "center" }}>Link ważny 24h. Trial zaczyna się od kliknięcia.</p>
                </>
              )}
            </div>
          )}

          {activeTab === "plans" && (
            <div>
              {PLANS.map(plan => (
                <div key={plan.id} onClick={() => setSelectedPlan(plan.id)} style={{ border: selectedPlan === plan.id ? "2px solid #7B2D52" : "2px solid #e8d0da", borderRadius: 12, padding: "11px 14px", cursor: "pointer", marginBottom: 8, background: selectedPlan === plan.id ? "#fdf6f8" : "white" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 700, color: "#1e1b4b", fontSize: "0.9rem" }}>{plan.name}</span>
                    <span style={{ fontWeight: 700, color: "#7B2D52", fontSize: "0.9rem" }}>{plan.price}</span>
                  </div>
                  <div style={{ color: "#6b7280", fontSize: "0.75rem", marginTop: 3 }}>{plan.desc}</div>
                </div>
              ))}
              <a href={PLANS.find(p => p.id === selectedPlan)?.link} target="_blank" rel="noopener noreferrer" style={{ display: "block", width: "100%", background: "#7B2D52", color: "white", borderRadius: 12, padding: "12px", fontWeight: 700, fontSize: "0.92rem", textAlign: "center", textDecoration: "none", marginBottom: 8, marginTop: 4 }}>
                Zapłać — {PLANS.find(p => p.id === selectedPlan)?.price}
              </a>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "#9ca3af", textAlign: "center" }}>Zostaniesz przekierowany na stronę płatności Stripe. Kod dostępu otrzymasz emailem.</p>
            </div>
          )}

          {activeTab === "code" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: 8 }}>
              <div style={{ width: 56, height: 56, background: "#eef2ff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", marginBottom: 12 }}>🔑</div>
              <p style={{ fontWeight: 700, color: "#1e1b4b", fontSize: "1rem", marginBottom: 6 }}>Wpisz kod dostępu</p>
              <p style={{ fontSize: "0.82rem", color: "#6b7280", marginBottom: 20, lineHeight: 1.5 }}>Kod otrzymałeś emailem po zakupie planu lub aktywacji trialu.</p>
              <div style={{ display: "flex", gap: 8, width: "100%" }}>
                <input value={token} onChange={(e) => setToken(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === "Enter" && token.trim() && onEnterToken(token.trim())} placeholder="XXXXXX" style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e0e7ff", fontSize: "0.9rem", fontFamily: "inherit", letterSpacing: "0.1em", outline: "none", color: "#1e1b4b" }} />
                <button onClick={() => token.trim() && onEnterToken(token.trim())} style={{ background: "#7B2D52", color: "white", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Wejdź</button>
              </div>
              <p style={{ margin: "12px 0 0", fontSize: "0.72rem", color: "#9ca3af" }}>Nie masz kodu? Wybierz zakładkę "7 dni za darmo" lub "Kup plan".</p>
            </div>
          )}
        </div>
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
          <p style={{ margin: "4px 0 0" }}>Przed wklejeniem treści błędu lub fragmentu faktury usuń dane wrażliwe: imiona, nazwiska osób fizycznych, numery telefonów czy prywatne adresy e-mail. NIP-y firmowe są danymi publicznymi, ale jeśli zależy Ci na 100% dyskrecji wobec kontrahenta, je również możesz zakryć przed analizą.</p>
        </div>
        <div style={{ background: "#f5f3ff", borderRadius: 12, padding: "12px 14px" }}>
          <strong style={{ color: "#3730a3" }}>2. Twoja prywatność "w locie"</strong>
          <p style={{ margin: "4px 0 0" }}>Szanuję Twój biznes. Zapytania i przesyłane pliki są przetwarzane wyłącznie w celu wygenerowania odpowiedzi — za pośrednictwem API Anthropic, które zgodnie z ich polityką prywatności przechowuje dane przez maksymalnie 30 dni w celach bezpieczeństwa i monitorowania nadużyć, po czym są automatycznie usuwane i nie są wykorzystywane do trenowania modeli. Po mojej stronie — historia rozmów nie jest zapisywana po zamknięciu okna przeglądarki.</p>
        </div>
        <div style={{ background: "#f5f3ff", borderRadius: 12, padding: "12px 14px" }}>
          <strong style={{ color: "#3730a3" }}>3. Weryfikuj odpowiedzi</strong>
          <p style={{ margin: "4px 0 0" }}>Jestem sztuczną inteligencją, a KSeF to skomplikowany system techniczno-prawny. Zawsze potwierdzaj kluczowe decyzje finansowe z księgowością lub doradcą podatkowym. Traktuj moje odpowiedzi jako eksperckie wsparcie techniczne, a nie ostateczną opinię prawną.</p>
        </div>
        <div style={{ background: "#f5f3ff", borderRadius: 12, padding: "12px 14px" }}>
          <strong style={{ color: "#3730a3" }}>4. To nie terapia (ale rozumiem stres)</strong>
          <p style={{ margin: "4px 0 0" }}>Wiem, że błędy w systemach skarbowych potrafią podnieść ciśnienie. Chętnie pomogę Ci zrozumieć problem i uspokoić chaos informacyjny — ale w przypadku poważnego kryzysu emocjonalnego skorzystaj z pomocy specjalisty.</p>
        </div>
        <div style={{ background: "#f5f3ff", borderRadius: 12, padding: "12px 14px" }}>
          <strong style={{ color: "#3730a3" }}>5. Nigdy nie podawaj haseł ani tokenów</strong>
          <p style={{ margin: "4px 0 0" }}>Nigdy nie wpisuj w oknie czatu haseł ani tokenów autoryzacyjnych do bramki Ministerstwa Finansów. Ja ich nie potrzebuję, by Ci pomóc. Jeśli przez pomyłkę wkleisz taki kod, dla bezpieczeństwa natychmiast wygeneruj nowy token w systemie rządowym.</p>
        </div>
        <div style={{ background: "#fff7ed", borderRadius: 12, padding: "12px 14px", border: "1px solid #fed7aa" }}>
          <strong style={{ color: "#9a3412" }}>6. Ograniczenie odpowiedzialności</strong>
          <p style={{ margin: "4px 0 0" }}>System KSeF podlega dynamicznym zmianom i przerwom technicznym (tzw. tryb offline). Moje analizy opierają się na aktualnie dostępnych specyfikacjach MF, jednak nie gwarantuję 100% bezbłędności w przypadku nagłych zmian w infrastrukturze rządowej. Korzystanie z narzędzia odbywa się na własne ryzyko użytkownika.</p>
        </div>
      </div>
      <button onClick={onClose} style={{ marginTop: 20, width: "100%", background: "#7B2D52", color: "white", border: "none", borderRadius: 12, padding: "11px", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", fontFamily: "inherit" }}>Rozumiem, zaczynamy!</button>
    </div>
  </div>
);

const TrialModal = ({ onClose, onSuccess }) => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | sent | error
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/request-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("sent");
      } else {
        setStatus("error");
        if (data.error === "already_active") setErrorMsg("Ten email ma już aktywny trial. Sprawdź skrzynkę — wysłaliśmy Ci wcześniej link.");
        else if (data.error === "trial_used") setErrorMsg("Ten adres był już użyty do trialu. Zapraszamy do wyboru planu.");
        else if (data.error === "converted") setErrorMsg("Ten email jest powiązany z aktywną subskrypcją.");
        else setErrorMsg(data.error || "Coś poszło nie tak. Spróbuj ponownie.");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Problem z połączeniem. Sprawdź internet i spróbuj ponownie.");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(30,27,75,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "white", borderRadius: 20, padding: "28px 24px", width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(99,102,241,0.3)" }}>
        {status !== "sent" ? (
          <>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>🎁</div>
              <h2 style={{ margin: "0 0 6px", color: "#1e1b4b", fontSize: "1.2rem" }}>7 dni pełnego dostępu</h2>
              <p style={{ margin: 0, color: "#6b7280", fontSize: "0.85rem", lineHeight: 1.6 }}>Podaj email, a wyślemy Ci link aktywacyjny. Bez karty kredytowej.</p>
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="twoj@email.pl"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #c7d2fe", fontSize: "0.9rem", fontFamily: "inherit", boxSizing: "border-box", marginBottom: 10, outline: "none" }}
            />
            {errorMsg && <p style={{ margin: "0 0 10px", fontSize: "0.82rem", color: "#dc2626", textAlign: "center" }}>{errorMsg}</p>}
            <button
              onClick={handleSubmit}
              disabled={status === "loading" || !email.trim()}
              style={{ width: "100%", background: status === "loading" ? "#c7d2fe" : "#4f46e5", color: "white", border: "none", borderRadius: 12, padding: "12px", fontWeight: 700, fontSize: "0.95rem", cursor: status === "loading" ? "not-allowed" : "pointer", fontFamily: "inherit", marginBottom: 12 }}
            >
              {status === "loading" ? "Wysyłanie..." : "Wyślij link aktywacyjny →"}
            </button>
            <p style={{ margin: "0 0 10px", fontSize: "0.72rem", color: "#9ca3af", textAlign: "center", lineHeight: 1.5 }}>
              Podając email, dołączasz do newslettera z poradami KSeF. Możesz wypisać się w każdej chwili.
            </p>
            <button onClick={onClose} style={{ width: "100%", background: "none", border: "none", color: "#9ca3af", fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit" }}>Nie teraz</button>
          </>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📬</div>
            <h2 style={{ margin: "0 0 8px", color: "#1e1b4b", fontSize: "1.1rem" }}>Sprawdź skrzynkę!</h2>
            <p style={{ margin: "0 0 16px", color: "#6b7280", fontSize: "0.85rem", lineHeight: 1.6 }}>Wysłaliśmy Ci link aktywacyjny. Kliknij go, żeby uruchomić 7 dni dostępu. Jeśli nie widzisz — sprawdź spam.</p>
            <button onClick={onClose} style={{ background: "#4f46e5", color: "white", border: "none", borderRadius: 12, padding: "10px 24px", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", fontFamily: "inherit" }}>OK, zamknij</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default function GlowaDoksef() {
  const [messages, setMessages] = useState([{ role: "assistant", content: "onboarding" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [resetAt, setResetAt] = useState(null);
  const [fingerprint, setFingerprint] = useState(null);
  const [fingerprintReady, setFingerprintReady] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showSafety, setShowSafety] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [trialSession, setTrialSession] = useState(() => localStorage.getItem("ksef_trial_session") || null);
  const [trialEmail, setTrialEmail] = useState(() => localStorage.getItem("ksef_trial_email") || null);
  const [trialExpiresAt, setTrialExpiresAt] = useState(() => localStorage.getItem("ksef_trial_expires") || null);
  const [userToken, setUserToken] = useState(() => localStorage.getItem("ksef_token") || null);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const messagesEndRef = useRef(null);
  const lastMsgRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const paywallRef = useRef(null);

  // Obsługa magic linka — wyciągnij parametry z URL po kliknięciu linka aktywacyjnego
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionFromUrl = params.get("trial_session");
    const emailFromUrl = params.get("trial_email");
    const trialError = params.get("trial_error");

    if (sessionFromUrl && emailFromUrl) {
      // Zapisz sesję trial w localStorage
      localStorage.setItem("ksef_trial_session", sessionFromUrl);
      localStorage.setItem("ksef_trial_email", decodeURIComponent(emailFromUrl));
      setTrialSession(sessionFromUrl);
      setTrialEmail(decodeURIComponent(emailFromUrl));
      // Wyczyść URL żeby nie było widać tokenu
      window.history.replaceState({}, "", "/");
    }

    if (trialError) {
      // Pokaż stosowny komunikat w zależności od błędu
      const errorMessages = {
        expired: "Link aktywacyjny wygasł (ważny 24h). Wpisz email ponownie, żeby otrzymać nowy.",
        link_expired: "Link aktywacyjny wygasł (ważny 24h). Wpisz email ponownie, żeby otrzymać nowy.",
        invalid_token: "Nieprawidłowy link aktywacyjny. Spróbuj ponownie.",
        converted: "Ten email ma już aktywną subskrypcję.",
        missing_token: "Brak tokenu w linku. Spróbuj ponownie.",
      };
      const msg = errorMessages[trialError] || "Coś poszło nie tak z aktywacją trialu.";
      setShowTrialModal(true); // otwórz modal z komunikatem błędu
      console.warn("Trial error:", trialError, msg);
      window.history.replaceState({}, "", "/");
    }
  }, []);

  // Pop-up trialu po 3 wiadomościach (tylko dla niezalogowanych bez trialu)
  useEffect(() => {
    const isTrialActive = !!trialSession && (!trialExpiresAt || new Date() < new Date(trialExpiresAt));
    if (!isTrialActive && !userToken && messageCount === 3) {
      setShowTrialModal(true);
    }
  }, [messageCount, trialSession, trialExpiresAt, userToken]);

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
    const initFingerprint = async () => {
      try {
        // Pobierz ID sesji z serwera (bazuje na IP + user agent)
        const resp = await fetch("/api/count", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fingerprint: null }),
        });
        if (resp.ok) {
          const data = await resp.json();
          setFingerprint(data.fingerprint);
          setMessageCount(data.count || 0);
          if (data.resetAt) setResetAt(new Date(data.resetAt));
        }
        setFingerprintReady(true);
      } catch (e) {
        console.warn("Count init failed", e);
        setFingerprintReady(true);
      }
    };
    initFingerprint();
  }, []);

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
    if (!userToken && messageCount >= FREE_LIMIT) {
      setMessages(prev => [...prev, { role: "assistant", content: "paywall" }]);
      return;
    }
    setInput("");
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
        body: JSON.stringify({ messages: apiMessages, userToken: userToken || null, trialSession: trialSession || null, fingerprint: fingerprint || null, hasImage: !!image }),
      });
      const data = await response.json();
      if (response.status === 403) {
        if (data.error === "limit_reached") { setMessages(prev => [...prev, { role: "assistant", content: "paywall" }]); }
        else if (data.error === "upgrade_required") { setMessages(prev => [...prev, { role: "assistant", content: "Analiza faktur dostępna jest w płatnych planach." }]); setShowPaywall(true); }
        else if (data.error === "plan_limit_reached") { setMessages(prev => [...prev, { role: "assistant", content: "plan_limit", resetDate: data.resetDate }]); }
        else setMessages(prev => [...prev, { role: "assistant", content: data.message || "Brak dostępu." }]);
        setLoading(false); return;
      }
      if (!response.ok) { setMessages(prev => [...prev, { role: "assistant", content: "Problem z połączeniem. Spróbuj ponownie." }]); setLoading(false); return; }
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      // Inkrementuj licznik dopiero po udanej odpowiedzi
      if (!userToken) setMessageCount(c => c + 1);
      // Jeśli to była ostatnia darmowa wiadomość, pokaż paywall zaraz po odpowiedzi
      if (!userToken) {
        const newCount = messageCount + 1;
        if (newCount >= FREE_LIMIT) {
          setMessages(prev => [...prev, { role: "assistant", content: "paywall" }]);
        }
      }
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
    localStorage.setItem("ksef_token", token);
    setShowPaywall(false);
    setShowPricing(false);
    setMessages(prev => [...prev, { role: "assistant", content: "Kod przyjęty — masz pełny dostęp. Czym mogę pomóc?" }]);
  };

  const isPaid = !!userToken;
  const isTrial = !!trialSession && (!trialExpiresAt || new Date() < new Date(trialExpiresAt));
  const hasFullAccess = isPaid || isTrial;

  // Formatuj datę wygaśnięcia trialu do wyświetlenia
  const trialExpiryDisplay = trialExpiresAt
    ? new Date(trialExpiresAt).toLocaleDateString("pl-PL", { day: "numeric", month: "long" })
    : null;
  const remainingFree = Math.max(0, FREE_LIMIT - messageCount);
  const resetText = (() => {
    if (!resetAt) return null;
    const now = new Date();
    if (now > resetAt) return null;
    const diff = resetAt - now;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 0) return `Limit odnowi się za ${h} godz. ${m} min.`;
    return `Limit odnowi się za ${m} min.`;
  })();


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

      {/* SEO — ukryta treść dla robotów Google */}
      <h1 style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap" }}>Głowa do KSeF</h1>
      <div style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap" }}>
        <h2>Asystent AI do KSeF i e-faktur</h2>
        <p>Głowa do KSeF to asystent AI pomagający polskim przedsiębiorcom i księgowym wdrożyć Krajowy System e-Faktur. Pytaj o terminy, błędy, uprawnienia, integracje z programami księgowymi, JPK, FA(3) i wszystko związane z KSeF. Dostępny 24/7, bez czekania na infolinię Ministerstwa Finansów.</p>
        <p>KSeF obowiązuje czynnych podatników VAT od 1 kwietnia 2026. Firmy zwolnione z VAT od 1 kwietnia 2026. Kary za błędy w JPK_V7 od 1 lutego 2026.</p>
      </div>

      {showPricing && <PricingModal onClose={() => setShowPricing(false)} onEnterToken={handleEnterToken} showTokenField={true} />}
      {showTrialModal && <TrialModal onClose={() => setShowTrialModal(false)} onSuccess={() => setShowTrialModal(false)} />}
      {showSafety && <SafetyModal onClose={() => setShowSafety(false)} />}

      <div style={{ width: "100%", background: "linear-gradient(135deg, #4c0519, #881337, #be123c)", padding: "20px 20px 11px", textAlign: "center", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 4px 20px rgba(79,70,229,0.25)", overflow: "visible" }}>
        <div style={{ position: "absolute", top: 14, left: 16, display: "flex", flexDirection: "column", gap: 6 }}>
          <button onClick={() => setShowSafety(true)} className="header-btn-small" style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 20, padding: "6px 14px", color: "white", fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit" }}>🛡️ Bezpieczeństwo</button>
          <a href="https://ksef.systems" target="_blank" rel="noopener noreferrer" className="header-btn-small" style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 20, padding: "6px 14px", color: "white", fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit", textDecoration: "none", textAlign: "center" }}>🟢 Status MF</a>
        </div>
        {!isPaid && fingerprintReady && (
          <button onClick={() => setShowPricing(true)} className="header-btn-small" style={{ position: "absolute", top: 14, right: 16, background: "rgba(255,255,255,0.2)", border: "1.5px solid rgba(255,255,255,0.4)", borderRadius: 20, padding: "6px 14px", color: "white", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            {messageCount < FREE_LIMIT ? `${FREE_LIMIT - messageCount}/${FREE_LIMIT} wiad.` : "Kup dostęp"}
          </button>
        )}
        {isPaid && (
          <div style={{ position: "absolute", top: 14, right: 16, display: "flex", gap: 6 }}>
            <a href="https://billing.stripe.com/p/login/cNi4gzcobg0R38C64Ocwg00" target="_blank" rel="noopener noreferrer" className="header-btn-small" style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 20, padding: "6px 14px", color: "white", fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit", textDecoration: "none" }}>Zarządzaj subskrypcją</a>
            <button onClick={() => { setUserToken(null); localStorage.removeItem("ksef_token"); }} className="header-btn-small" style={{ background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.2)", borderRadius: 20, padding: "6px 10px", color: "rgba(255,255,255,0.7)", fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit" }}>Wyloguj</button>
          </div>
        )}
        <img src="/logo.png" alt="Głowa do KSeF" style={{ width: 147, height: 147, objectFit: "contain", position: "absolute", left: "50%", transform: "translateX(-50%)", top: "30%", marginTop: -73, pointerEvents: "none" }} />
        <div style={{ height: 120, display: "block" }} />
        <h1 className="header-title" style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", color: "white", fontWeight: 700 }}>Głowa do KSeF</h1>
        <p className="header-subtitle" style={{ margin: "4px 0 0", color: "#c7d2fe", fontSize: "0.85rem", fontWeight: 300 }}>e-Faktury po ludzku • Przepisy bez stresu • Wsparcie psychologiczne</p>
        {isPaid && (
          <div style={{ marginTop: 10, background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "4px 14px", display: "inline-block", fontSize: "0.78rem", color: "#a5f3fc" }}>Pełny dostęp</div>
        )}
        {isTrial && !isPaid && (
          <div style={{ marginTop: 10, background: "rgba(251,191,36,0.25)", borderRadius: 20, padding: "4px 14px", display: "inline-block", fontSize: "0.78rem", color: "#fef08a" }}>
            Trial{trialExpiryDisplay ? ` — dostęp do ${trialExpiryDisplay}` : ""}
          </div>
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
            <div style={{ maxWidth: "78%", background: msg.content === "paywall" ? "transparent" : msg.role === "user" ? "linear-gradient(135deg, #7B2D52, #5C1F3B)" : "white", color: msg.role === "user" ? "white" : "#1e1b4b", borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: msg.content === "paywall" ? "0" : "12px 16px", fontSize: "0.88rem", lineHeight: 1.65, boxShadow: msg.content === "paywall" ? "none" : msg.role === "user" ? "0 4px 12px rgba(123,45,82,0.3)" : "0 2px 12px rgba(0,0,0,0.07)" }}>
              {msg.hasImage && msg.imagePreview && <img src={msg.imagePreview} alt="faktura" style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 8, display: "block" }} />}
              {msg.role === "assistant" && msg.content === "onboarding" ? (
                <div>
                  <p style={{ margin: "0 0 8px" }}>Cześć! Pomogę Ci z KSeF i stresem z nim związanym.</p>
                  <div style={{ background: "#f5f3ff", borderRadius: 8, padding: "8px 10px", fontSize: "0.83rem", color: "#4338ca", lineHeight: 1.6, margin: "0 0 8px" }}>
                    ⚠️ Pamiętaj: nie jestem doradcą podatkowym, terapeutą ani lekarzem. Korzystając z asystenta, akceptujesz{" "}
                    <a href="/regulamin.html" target="_blank" rel="noopener noreferrer" style={{ color: "#4f46e5", textDecoration: "underline" }}>regulamin</a>.
                  </div>
                  <p style={{ margin: "0 0 4px" }}>Możesz pytać o terminy, błędy, uprawnienia, integracje — masz 5 bezpłatnych wiadomości na start.</p>
                  <p style={{ margin: 0, fontSize: "0.83rem", color: "#6b7280" }}>Każda sesja jest niezależna. Co Cię sprowadza?</p>
                  <p style={{ margin: "8px 0 0", fontSize: "0.78rem", color: "#9ca3af" }}>Problemy techniczne? Napisz na <a href="mailto:kontakt@glowadoksef.pl" style={{ color: "#6366f1", textDecoration: "none" }}>kontakt@glowadoksef.pl</a></p>
                </div>
              ) : msg.role === "assistant" && msg.content === "plan_limit" ? (
                <PlanLimitMessage resetDate={msg.resetDate} />
              ) : msg.role === "assistant" && msg.content === "paywall" ? (
                <PaywallChatMessage onShowPlans={() => setShowPricing(true)} resetText={resetText} />
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
          <button onClick={() => fileInputRef.current?.click()} title={hasFullAccess ? "Wyślij fakturę do analizy" : "Dostępne w płatnych planach"} style={{ background: hasFullAccess ? "#f5f3ff" : "#f9fafb", border: "1.5px solid " + (hasFullAccess ? "#c7d2fe" : "#e5e7eb"), borderRadius: 12, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: hasFullAccess ? "pointer" : "not-allowed", flexShrink: 0, fontSize: "1rem", color: hasFullAccess ? "#6366f1" : "#d1d5db" }}>📎</button>
          <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey} placeholder={hasFullAccess ? "Napisz pytanie lub wyślij zdjęcie faktury..." : "Napisz pytanie o KSeF, błąd, problem..."} disabled={loading} rows={1} style={{ flex: 1, border: "none", background: "transparent", resize: "none", fontSize: "0.9rem", fontFamily: "inherit", color: "#1e1b4b", padding: "6px 0", lineHeight: 1.5, maxHeight: 72, overflowY: "auto" }} onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 72) + "px"; }} />
          <button className="send-btn" onClick={() => sendMessage()} disabled={loading || (!input.trim() && !image)} style={{ background: (loading || (!input.trim() && !image)) ? "#c7d2fe" : "#4f46e5", color: "white", border: "none", borderRadius: 14, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: (loading || (!input.trim() && !image)) ? "not-allowed" : "pointer", transition: "background 0.2s", flexShrink: 0, fontSize: "1rem" }}>{loading ? "⏳" : "↑"}</button>
        </div>
        <p style={{ textAlign: "center", margin: "8px 0 0", fontSize: "0.72rem", color: "#a5b4fc" }}>AI może generować błędy. W ważnych sprawach zawsze skonsultuj się z księgowym lub doradcą podatkowym.</p>
        <p style={{ textAlign: "center", margin: "6px 0 0", fontSize: "0.72rem" }}>
          <a href="/regulamin.html" target="_blank" rel="noopener noreferrer" style={{ color: "#a5b4fc", fontSize: "0.72rem", textDecoration: "underline" }}>Regulamin</a>
          <span style={{ color: "#c7d2fe", margin: "0 6px" }}>•</span>
          <a href="/polityka.html" target="_blank" rel="noopener noreferrer" style={{ color: "#a5b4fc", fontSize: "0.72rem", textDecoration: "underline" }}>Polityka prywatności</a>
        </p>
      </div>
    </div>
  );
}
