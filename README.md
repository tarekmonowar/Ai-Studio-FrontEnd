# 🤖 AI Studio - Autonomous Agents & Generative AI

**Live Demo**:
[https://ai-studio.tarekmonowar.dev/](https://ai-studio.tarekmonowar.dev/) |
[https://ai-studio-tm.vercel.app/](https://ai-studio-tm.vercel.app/)

**GitHub Repositories**:

- Frontend:
  [https://github.com/tarekmonowar/Ai-Studio-FrontEnd](https://github.com/tarekmonowar/Ai-Studio-FrontEnd)
- Backend:
  [https://github.com/tarekmonowar/Ai-Studio-BackEnd](https://github.com/tarekmonowar/Ai-Studio-BackEnd)

![AI Studio App - AI Agents](src/public/aiagents.png)

## 📖 What This Project Solves

AI Studio bridges the gap between conversational AI and functional application automation. Through an intuitive chat interface, users interact with sophisticated **Autonomous AI Agents** capable of executing real-world, deterministic instructions using real-time function calling. 

Rather than just offering conversational responses, the AI agent interprets user intent and executes live system automations. Whether you need to automatically navigate between specific application pages, dispatch professional emails directly via SMTP integration, or completely customize the website's themes and colors dynamically, the Agent resolves those requests autonomously.

## ✨ Features

- **LLM Function Calling**: Seamless parsing of natural language to execute strict JSON tool definitions mapping to core application logic.
- **Workflow Automation**: Intelligent capabilities enabling the agent to route pages, validate inputs, and securely trigger backend email pipelines via Nodemailer.
- **Dynamic UI Customizer**: Ask the agent to tweak the site's styling (themes, typography, or background colors) and it repaints the DOM in real-time.
- **Fluid Intent State**: Intercepts requests intelligently—if it needs more clarity to send an email, the agent gracefully challenges the user for required variables.

## 🧠 Generative AI Capabilities

![Generative AI Feature](src/public/aigenerative.png)

Beyond action-oriented autonomous agents, the application naturally supports a robust **Generative AI** interface. Here you can dive into deep analytical insights, explore dynamic technical questions, and experience a state-of-the-art interactive prompt environment built perfectly for developers, coding, and logical execution.

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Logic & Orchestration**: React Custom Hooks, Context state pipelines, Azure integration.

## 🚀 Getting Started

1. **Clone the repository**:

   ```bash
   git clone https://github.com/tarekmonowar/Ai-Studio-FrontEnd.git
   cd frontend
   ```

2. **Install Dependencies**:

   ```bash
   npm install
   ```

3. **Set up Environment Variables**: Create a `.env.local` file with your
   backend connection URLs:

   ```env
   NEXT_PUBLIC_BACKEND_HTTP_URL=http://localhost:8787
   ```

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view it in the
   browser.

---

_For the backend logic, API keys, and email service integrations, check out the
[Backend Repository](https://github.com/tarekmonowar/Ai-Studio-BackEnd)._
