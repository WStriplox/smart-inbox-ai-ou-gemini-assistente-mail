
# 🧠 Smart Inbox AI (Assistente de E-mail com Gemini)

Um dashboard inteligente para sua caixa de entrada do Gmail. Construído com **React, Node.js e Google Gemini AI**, este aplicativo não tenta substituir seu cliente de e-mail, mas atua como seu assistente executivo: ele lê, resume, categoriza e prioriza seus e-mails para que você foque apenas no que importa.

## ✨ Funcionalidades

* **🤖 Triagem com IA:** Usa o Google Gemini para ler o contexto dos e-mails e classificá-los automaticamente (Urgente, Trabalho, Finanças, Pessoal, etc.).
* **📅 Varredura da Semana (Weekly Scan):** Um botão que analisa seus últimos 7 dias de e-mails e gera um briefing executivo, destacando apenas os 3 a 5 e-mails que exigem sua ação imediata.
* **🔒 Privacidade e Segurança:** Autenticação oficial do Google (OAuth 2.0). O aplicativo não armazena seus e-mails em nenhum banco de dados. Tudo é processado em tempo real.
* **⚡ Interface Moderna:** Construída com React, Tailwind CSS e animações fluidas com Framer Motion.

## 🛠️ Tecnologias Utilizadas

* **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide Icons, Motion.
* **Backend:** Node.js, Express (para proxy seguro da API e fluxo OAuth).
* **Integrações:** Gmail API (Google Cloud), Google Gemini API (`@google/genai`).

---

## 🚀 Como rodar este projeto localmente

Para rodar este projeto na sua máquina, você precisará configurar credenciais no Google Cloud (para ler o Gmail) e no Google AI Studio (para a inteligência artificial).

### Passo 1: Clonar o repositório
```bash
git clone https://github.com/SEU_USUARIO/smart-inbox-ai.git
cd smart-inbox-ai
npm install


Este é um projeto de código aberto com fins educacionais e de portfólio.
Devido às políticas rígidas do Google sobre a leitura de e-mails (escopos restritos), este aplicativo foi projetado para rodar em modo de "Teste" no Google Cloud. Se você deseja lançar este aplicativo comercialmente para o público geral, será necessário passar por uma Auditoria de Segurança do Google (CASA).