export default function PrivacyPage({ onBack }) {
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
      `}</style>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #3730a3, #4f46e5, #6366f1)",
        padding: "20px 24px", display: "flex", alignItems: "center", gap: 16,
        boxShadow: "0 4px 20px rgba(79,70,229,0.25)",
      }}>
        <button onClick={onBack} style={{
          background: "rgba(255,255,255,0.2)", border: "1.5px solid rgba(255,255,255,0.4)",
          borderRadius: 10, padding: "6px 14px", color: "white",
          fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        }}>
          ← Wróć
        </button>
        <h1 style={{
          margin: 0, fontFamily: "'Playfair Display', serif",
          fontSize: "1.2rem", color: "white", fontWeight: 700,
        }}>Polityka prywatności</h1>
      </div>

      {/* Treść */}
      <div style={{
        maxWidth: 720, margin: "32px auto", padding: "32px 40px",
        background: "white", borderRadius: 16,
        boxShadow: "0 2px 12px rgba(99,102,241,0.08)",
      }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#1e1b4b", marginTop: 0 }}>
          POLITYKA PRYWATNOŚCI
        </h2>

        <h3 style={{ color: "#3730a3" }}>1. Administrator danych</h3>
        <p>Administratorem danych osobowych jest <strong>Dominik Witkowski</strong>, zamieszkały przy ul. <strong>Wawrzyczka 50, 10-762 Olsztyn</strong>, kontakt: <strong>dominowit@gmail.com</strong>. Dane przetwarzane są w ramach działalności nierejestrowanej.</p>

        <h3 style={{ color: "#3730a3" }}>2. Zakres zbieranych danych</h3>
        <ul>
          <li><strong>Dane płatnicze:</strong> adres e-mail i dane transakcyjne przetwarzane przez Stripe w celu realizacji subskrypcji.</li>
          <li><strong>Treści zapytań i pliki:</strong> tekst wpisywany w czacie oraz przesyłane pliki graficzne (JPG, PNG, WebP) i dokumenty PDF (do 5 MB) przetwarzane są wyłącznie w celu wygenerowania odpowiedzi przez AI.</li>
        </ul>

        <h3 style={{ color: "#3730a3" }}>3. Podmioty przetwarzające i transfer danych</h3>
        <ul>
          <li><strong>Stripe Inc. (USA):</strong> dane płatnicze przetwarzane są przez Stripe jako podmiot przetwarzający. Stripe posiada certyfikat PCI DSS. Więcej: <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#4f46e5" }}>stripe.com/privacy</a>.</li>
          <li><strong>Anthropic PBC (USA):</strong> w celu generowania odpowiedzi treści zapytań i pliki są przesyłane przez szyfrowane API do firmy Anthropic. Anthropic nie wykorzystuje tych danych do trenowania modeli AI.</li>
          <li><strong>Podstawa transferu:</strong> Anthropic PBC uczestniczy w programie EU-US Data Privacy Framework, co stanowi podstawę prawną przekazywania danych do USA zgodnie z art. 45 RODO.</li>
        </ul>

        <h3 style={{ color: "#3730a3" }}>4. Bezpieczeństwo i pliki cookie</h3>
        <ul>
          <li>Administrator nie przechowuje historii rozmów ani przesłanych plików na serwerach po zakończeniu sesji.</li>
          <li>Serwis może używać niezbędnych plików cookie w celach technicznych (sesja użytkownika). Nie używamy cookies analitycznych ani marketingowych.</li>
        </ul>

        <h3 style={{ color: "#3730a3" }}>5. Prawa użytkownika</h3>
        <p>Użytkownik ma prawo do wglądu w swoje dane, żądania ich usunięcia oraz anulowania subskrypcji. Identyfikacja następuje na podstawie adresu e-mail użytego w Stripe. W sprawach danych osobowych kontaktuj się pod adresem: <strong>TWOJ_EMAIL</strong>.</p>

        <p style={{ color: "#9ca3af", fontSize: "0.8rem", marginTop: 32, borderTop: "1px solid #e0e7ff", paddingTop: 16 }}>
          Ostatnia aktualizacja: {new Date().toLocaleDateString("pl-PL")}
        </p>
      </div>
    </div>
  );
}
