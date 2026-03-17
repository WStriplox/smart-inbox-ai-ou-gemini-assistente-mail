import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, RefreshCw, LogOut, Loader2, AlertCircle, Sparkles, CalendarDays } from "lucide-react";
import { EmailCard } from "./components/EmailCard";
import { FilterBar, Category } from "./components/FilterBar";
import { analyzeEmail, EmailAnalysis, generateWeeklySummary, WeeklySummary } from "./lib/gemini";

interface Email {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  body: string;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, EmailAnalysis>>({});
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<Category>("Todos");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
  const [loadingWeekly, setLoadingWeekly] = useState(false);

  useEffect(() => {
    checkAuthStatus();
    
    const handleMessage = (event: MessageEvent) => {
      // Validate origin is from AI Studio preview or localhost
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        checkAuthStatus();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const checkAuthStatus = async () => {
    try {
      const res = await fetch("/api/auth/status");
      const data = await res.json();
      setIsAuthenticated(data.isAuthenticated);
      if (data.isAuthenticated) {
        fetchEmails();
      }
    } catch (err) {
      console.error("Auth status error:", err);
      setIsAuthenticated(false);
    }
  };

  const handleLogin = async () => {
    try {
      const res = await fetch("/api/auth/url");
      const { url } = await res.json();
      const authWindow = window.open(
        url,
        "oauth_popup",
        "width=600,height=700"
      );
      if (!authWindow) {
        alert("Por favor, permita pop-ups para este site para conectar sua conta.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Falha ao iniciar o login.");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setIsAuthenticated(false);
      setEmails([]);
      setAnalyses({});
      setWeeklySummary(null);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const fetchEmails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/emails");
      if (!res.ok) {
        if (res.status === 401) {
          setIsAuthenticated(false);
          return;
        }
        throw new Error("Falha ao buscar e-mails");
      }
      const data = await res.json();
      setEmails(data.emails);
      processEmails(data.emails);
    } catch (err) {
      console.error("Fetch emails error:", err);
      setError("Não foi possível carregar os e-mails. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklySummary = async () => {
    setLoadingWeekly(true);
    setError(null);
    try {
      const res = await fetch("/api/emails/weekly");
      if (!res.ok) {
        if (res.status === 401) {
          setIsAuthenticated(false);
          return;
        }
        throw new Error("Falha ao buscar e-mails da semana");
      }
      const data = await res.json();
      const summary = await generateWeeklySummary(data.emails);
      setWeeklySummary(summary);
    } catch (err) {
      console.error("Fetch weekly emails error:", err);
      setError("Não foi possível gerar o resumo da semana. Tente novamente.");
    } finally {
      setLoadingWeekly(false);
    }
  };

  const processEmails = async (newEmails: Email[]) => {
    // Process emails sequentially or in small batches to avoid rate limits
    for (const email of newEmails) {
      if (!analyses[email.id] && !analyzingIds.has(email.id)) {
        setAnalyzingIds((prev) => new Set(prev).add(email.id));
        
        try {
          const analysis = await analyzeEmail(email.subject, email.from, email.body || email.snippet);
          setAnalyses((prev) => ({ ...prev, [email.id]: analysis }));
        } catch (err) {
          console.error(`Failed to analyze email ${email.id}:`, err);
        } finally {
          setAnalyzingIds((prev) => {
            const next = new Set(prev);
            next.delete(email.id);
            return next;
          });
        }
      }
    }
  };

  const filteredEmails = emails.filter((email) => {
    if (selectedCategory === "Todos") return true;
    const analysis = analyses[email.id];
    if (!analysis) return false; // Hide unanalyzed emails from specific category filters
    return analysis.category === selectedCategory;
  });

  // Sort by priority (Alta > Média > Baixa) then date
  const sortedEmails = [...filteredEmails].sort((a, b) => {
    const analysisA = analyses[a.id];
    const analysisB = analyses[b.id];
    
    const priorityScore = { Alta: 3, Média: 2, Baixa: 1 };
    const scoreA = analysisA ? priorityScore[analysisA.priority] : 0;
    const scoreB = analysisB ? priorityScore[analysisB.priority] : 0;
    
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
        >
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Caixa de Entrada Inteligente</h1>
          <p className="text-gray-600 mb-8">
            Conecte seu Gmail para resumir e priorizar automaticamente seus e-mails usando a IA do Gemini.
            Foque no que mais importa: urgências, trabalho, finanças e muito mais.
          </p>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8 text-left text-sm text-amber-800">
            <h3 className="font-semibold flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4" />
              Aviso sobre o Pop-up
            </h3>
            <p className="mb-2">
              O login com o Google será aberto em um <strong>pop-up</strong> por questões de segurança deste ambiente de testes. 
              Após o login, <strong>este aplicativo principal será atualizado automaticamente</strong> e você poderá usá-lo normalmente aqui nesta janela.
            </p>
          </div>

          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition-colors shadow-sm shadow-indigo-200"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Conectar com o Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-indigo-600" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">Caixa de Entrada Inteligente</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={fetchWeeklySummary}
                disabled={loadingWeekly}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-full text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loadingWeekly ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
                <span className="hidden sm:inline">Varredura da Semana</span>
              </button>
              <button
                onClick={fetchEmails}
                disabled={loading}
                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors disabled:opacity-50"
                title="Atualizar e-mails"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                title="Desconectar"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {weeklySummary && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-6 h-6 text-indigo-200" />
              <h2 className="text-xl font-bold">Resumo da Semana</h2>
            </div>
            <p className="text-indigo-100 mb-6 leading-relaxed">{weeklySummary.overview}</p>
            
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-indigo-200 uppercase tracking-wider">E-mails que exigem atenção</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {weeklySummary.importantEmails.map((email, idx) => (
                  <div key={idx} className="bg-white/10 rounded-xl p-4 border border-white/20 backdrop-blur-sm">
                    <h4 className="font-medium text-white line-clamp-1 mb-1" title={email.subject}>{email.subject}</h4>
                    <p className="text-xs text-indigo-200 mb-2 truncate">De: {email.from}</p>
                    <p className="text-sm text-indigo-50 leading-snug">{email.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-6">Suas Prioridades</h2>
          <FilterBar selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {loading && emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-600" />
            <p>Buscando seus e-mails mais recentes...</p>
          </div>
        ) : sortedEmails.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 border-dashed">
            <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum e-mail encontrado</h3>
            <p className="text-gray-500">
              {selectedCategory === "Todos" 
                ? "Sua caixa de entrada está vazia." 
                : `Nenhum e-mail encontrado na categoria "${selectedCategory}".`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {sortedEmails.map((email) => (
                <EmailCard
                  key={email.id}
                  email={email}
                  analysis={analyses[email.id] || null}
                  isAnalyzing={analyzingIds.has(email.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
