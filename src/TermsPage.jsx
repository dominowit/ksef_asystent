export default function TermsPage({ onBack }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #eef2ff 0%, #f5f3ff 50%, #ede9fe 100%)",
      fontFamily: "'Source Serif 4', Georgia, serif",
      padding: "0 0 48px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Source+Serif+4:wght@300;400;600&display=swap');
        * { box-sizing: border-box; }
        ol { padding-left: 24px; }
        ol li { margin-bottom: 10px; line-height: 1.75; }
      `}</style>

      <div style={{
        background: "linear-gradient(135deg, #3730a3, #4f46e5, #6366f1)",
        padding: "20px 24px", display: "flex", alignItems: "center", gap: 16,
        boxShadow: "0 4px 20px rgba(79,70,229,0.25)",
      }}>
        <button onClick={onBack} style={{
          background: "rgba(255,255,255,0.2)", border: "1.5px solid rgba(255,255,255,0.4)",
          borderRadius: 10, padding: "6px 14px", color: "white",
          fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        }}>← Wróć</button>
        <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", color: "white", fontWeight: 700 }}>
          Regulamin usługi
        </h1>
      </div>

      <div style={{
        maxWidth: 720, margin: "32px auto", padding: "32px 40px",
        background: "white", borderRadius: 16,
        boxShadow: "0 2px 12px rgba(99,102,241,0.08)",
      }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#1e1b4b", marginTop: 0 }}>
          REGULAMIN USŁUGI „ASYSTENT KSeF"
        </h2>

        <h3 style={{ color: "#3730a3" }}>§ 1. Postanowienia ogólne</h3>
        <ol>
          <li>Usługodawcą jest <strong>Dominik Witkowski</strong>, zamieszkały przy ul. <strong>Wawrzyczka 50, 10-762 Olsztyn</strong>, prowadzący działalność nierejestrowaną zgodnie z art. 5 ustawy Prawo przedsiębiorców. Kontakt: <strong>dominowit@gmail.com</strong>.</li>
          <li>Usługa „Asystent KSeF" jest narzędziem informacyjnym w formie czatu online, wspomaganym przez modele sztucznej inteligencji (AI).</li>
          <li>Usługodawca oświadcza, że nie jest doradcą podatkowym, księgowym ani prawnym. Treści generowane przez Asystenta mają charakter wyłącznie informacyjny i edukacyjny.</li>
        </ol>

        <h3 style={{ color: "#3730a3" }}>§ 2. Zasady korzystania z Usługi</h3>
        <ol>
          <li>Korzystanie z Usługi wymaga opłacenia subskrypcji za pośrednictwem systemu Stripe.</li>
          <li>Po dokonaniu płatności w ramach wybranego planu (Solo, Mała firma lub Firma) Klient otrzymuje unikalny kod dostępu na podany adres e-mail.</li>
          <li>Plany płatne umożliwiają analizę plików w formatach JPG, PNG, WebP oraz PDF (maksymalna wielkość pliku to 5 MB).</li>
          <li>Zakazuje się udostępniania kodu osobom trzecim spoza organizacji Klienta. Limity użytkowników: Solo (1 osoba, 200 wiadomości/mies.), Mała firma (do 5 osób, 600 wiadomości/mies.), Firma (do 25 osób, 2000 wiadomości/mies.).</li>
          <li>Usługa nie łączy się z systemem Ministerstwa Finansów i nie służy do bezpośredniego wystawiania e-faktur w rozumieniu prawnym.</li>
        </ol>

        <h3 style={{ color: "#3730a3" }}>§ 3. Płatności i Subskrypcja</h3>
        <ol>
          <li>Usługa świadczona jest w modelu subskrypcyjnym odnawialnym co 30 dni.</li>
          <li>Ceny podane w aplikacji są cenami brutto. Usługodawca korzysta ze zwolnienia z VAT na podstawie art. 113 ust. 1 i 9 ustawy o VAT.</li>
          <li>Klient może anulować subskrypcję w dowolnym momencie przez Portal Klienta Stripe.</li>
          <li>Dostępne plany subskrypcji i ich ceny podane są w aplikacji. Usługodawca zastrzega sobie prawo do zmiany cennika z zachowaniem 30-dniowego okresu powiadomienia dla aktywnych subskrybentów.</li>
        </ol>

        <h3 style={{ color: "#3730a3" }}>§ 4. Prawo do odstąpienia i reklamacje</h3>
        <ol>
          <li>Konsumentowi przysługuje prawo do odstąpienia od umowy w terminie 14 dni od zakupu, o ile nie doszło do pełnego wykonania usługi.</li>
          <li>Klient przyjmuje do wiadomości, że z chwilą aktywacji kodu dostępu usługa cyfrowa zostaje uruchomiona, co może ograniczyć prawo do odstąpienia zgodnie z art. 38a ustawy o prawach konsumenta.</li>
          <li>Reklamacje należy kierować na adres e-mail Usługodawcy. Zostaną one rozpatrzone w ciągu 14 dni.</li>
        </ol>

        <h3 style={{ color: "#3730a3" }}>§ 5. Wyłączenie odpowiedzialności</h3>
        <ol>
          <li>Usługodawca nie ponosi odpowiedzialności za szkody powstałe w wyniku podjęcia decyzji biznesowych, podatkowych lub prawnych na podstawie odpowiedzi wygenerowanych przez Asystenta AI. Klient zobowiązany jest do weryfikacji informacji z oficjalnymi źródłami.</li>
        </ol>

        <p style={{ color: "#9ca3af", fontSize: "0.8rem", marginTop: 32, borderTop: "1px solid #e0e7ff", paddingTop: 16 }}>
          Ostatnia aktualizacja: {new Date().toLocaleDateString("pl-PL")}
        </p>
      </div>
    </div>
  );
}
