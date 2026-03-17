import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface EmailAnalysis {
  summary: string;
  category: "Urgente" | "Trabalho & Carreira" | "Finanças & Contas" | "Pessoal" | "Atualizações" | "Outros";
  priority: "Alta" | "Média" | "Baixa";
  keyPoints: string[];
}

export interface WeeklySummary {
  overview: string;
  importantEmails: {
    subject: string;
    from: string;
    reason: string;
  }[];
}

export async function analyzeEmail(subject: string, from: string, body: string): Promise<EmailAnalysis> {
  const prompt = `
Analise o seguinte e-mail e forneça um breve resumo, categorize-o, determine sua prioridade e extraia os pontos principais.
Responda APENAS em Português do Brasil.
Foque em identificar o que é realmente importante (urgências, trabalho, finanças, assuntos pessoais relevantes).

Assunto do E-mail: ${subject}
De: ${from}
Corpo:
${body}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "Um resumo curto, claro e útil do e-mail (1-2 frases) em português.",
            },
            category: {
              type: Type.STRING,
              description: "A categoria do e-mail.",
              enum: ["Urgente", "Trabalho & Carreira", "Finanças & Contas", "Pessoal", "Atualizações", "Outros"],
            },
            priority: {
              type: Type.STRING,
              description: "O nível de prioridade baseado na categoria e no conteúdo.",
              enum: ["Alta", "Média", "Baixa"],
            },
            keyPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "1-3 tópicos (bullet points) com as informações mais importantes em português.",
            },
          },
          required: ["summary", "category", "priority", "keyPoints"],
        },
      },
    });

    const jsonStr = response.text?.trim() || "{}";
    return JSON.parse(jsonStr) as EmailAnalysis;
  } catch (error) {
    console.error("Erro ao analisar e-mail:", error);
    return {
      summary: "Falha ao analisar o e-mail.",
      category: "Outros",
      priority: "Baixa",
      keyPoints: [],
    };
  }
}

export async function generateWeeklySummary(emails: any[]): Promise<WeeklySummary> {
  const emailsText = emails.map(e => `De: ${e.from}\nAssunto: ${e.subject}\nResumo: ${e.snippet}\n---`).join('\n');
  
  const prompt = `
Você é um assistente executivo analisando os e-mails dos últimos 7 dias.
Aqui está uma lista de e-mails recentes (remetente, assunto e um breve trecho).
Sua tarefa é:
1. Escrever um parágrafo de visão geral (overview) resumindo como foi a semana em termos de comunicação (ex: "Semana focada em pagamentos e algumas propostas de trabalho...").
2. Identificar os 3 a 5 e-mails MAIS IMPORTANTES dessa lista (urgências, oportunidades de trabalho, contas a pagar, mensagens pessoais importantes) e explicar brevemente o motivo.

E-mails da semana:
${emailsText}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overview: {
              type: Type.STRING,
              description: "Um parágrafo resumindo os principais temas da semana.",
            },
            importantEmails: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  subject: { type: Type.STRING, description: "O assunto exato do e-mail." },
                  from: { type: Type.STRING, description: "O remetente do e-mail." },
                  reason: { type: Type.STRING, description: "Por que este e-mail exige atenção (1 frase)." }
                },
                required: ["subject", "from", "reason"]
              },
              description: "Lista dos 3 a 5 e-mails mais importantes que exigem atenção.",
            },
          },
          required: ["overview", "importantEmails"],
        },
      },
    });

    const jsonStr = response.text?.trim() || "{}";
    return JSON.parse(jsonStr) as WeeklySummary;
  } catch (error) {
    console.error("Erro ao gerar resumo da semana:", error);
    return {
      overview: "Não foi possível gerar o resumo da semana no momento.",
      importantEmails: []
    };
  }
}
