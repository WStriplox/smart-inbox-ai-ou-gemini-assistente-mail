import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "motion/react";
import { Briefcase, User, Calendar, FileText, Mail, ChevronDown, ChevronUp, Sparkles, AlertTriangle, DollarSign, Bell, Heart } from "lucide-react";
import { EmailAnalysis } from "../lib/gemini";

interface EmailCardProps {
  email: {
    id: string;
    subject: string;
    from: string;
    date: string;
    snippet: string;
    body: string;
  };
  analysis: EmailAnalysis | null;
  isAnalyzing: boolean;
}

const categoryIcons = {
  "Urgente": AlertTriangle,
  "Trabalho & Carreira": Briefcase,
  "Finanças & Contas": DollarSign,
  "Pessoal": Heart,
  "Atualizações": Bell,
  "Outros": Mail,
};

const priorityColors = {
  Alta: "bg-red-100 text-red-800 border-red-200",
  Média: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Baixa: "bg-gray-100 text-gray-800 border-gray-200",
};

export const EmailCard: React.FC<EmailCardProps> = ({ email, analysis, isAnalyzing }) => {
  const [expanded, setExpanded] = React.useState(false);

  const Icon = analysis ? categoryIcons[analysis.category] : Mail;
  const priorityClass = analysis ? priorityColors[analysis.priority] : "bg-gray-100 text-gray-800 border-gray-200";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{email.subject}</h3>
            <p className="text-sm text-gray-500 truncate mt-1">{email.from}</p>
          </div>
          <div className="text-xs text-gray-400 whitespace-nowrap">
            {email.date ? format(new Date(email.date), "d 'de' MMM, HH:mm", { locale: ptBR }) : ""}
          </div>
        </div>

        {isAnalyzing ? (
          <div className="mt-4 p-4 bg-indigo-50/50 rounded-lg border border-indigo-100/50 flex items-center gap-3 text-sm text-indigo-600">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="font-medium">O Gemini está analisando este e-mail...</span>
          </div>
        ) : analysis ? (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                <Icon className="w-3.5 h-3.5" />
                {analysis.category}
              </span>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${priorityClass}`}>
                Prioridade {analysis.priority}
              </span>
            </div>
            
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-100/50">
              <div className="flex items-center gap-2 mb-2 text-indigo-800 font-medium text-sm">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Resumo da IA
              </div>
              <p className="text-gray-800 text-sm leading-relaxed mb-3">{analysis.summary}</p>
              
              {analysis.keyPoints.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-indigo-900/70 uppercase tracking-wider">Pontos Principais</span>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    {analysis.keyPoints.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-600 line-clamp-2">{email.snippet}</p>
        )}
      </div>

      <div className="border-t border-gray-50 bg-gray-50/50">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Ocultar E-mail Original
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Ver E-mail Original
            </>
          )}
        </button>
        
        {expanded && (
          <div className="p-5 border-t border-gray-100 bg-white">
            <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap font-mono text-xs">
              {email.body || email.snippet}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
