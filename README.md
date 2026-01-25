# Job Hunt Assistant

An intelligent, AI-powered agentic workflow designed to streamline your job search process. This application allows you to upload a resume (PDF, DOCX, TXT) or paste text, and then orchestrates a team of AI agents to analyze your profile, find relevant jobs on LinkedIn, and score them against your specific qualifications.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![LangGraph](https://img.shields.io/badge/LangGraph-Agentic_Workflow-blue)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-green)

## 🤖 Agentic Workflow

The application uses **LangGraph** to coordinate a stateful workflow of specialized AI agents:

1.  **Validator Agent**:
    - **Role**: Quality Control.
    - **Task**: Analyzes the input file to ensure it is a valid resume containing a name, contact info, and professional history.
    - **Action**: Rejects invalid files (recipes, code snippets, etc.) immediately to save processing costs.

2.  **Summarizer Agent**:
    - **Role**: Data Extractor.
    - **Task**: Condenses your resume into a high-signal Markdown summary.
    - **Features**: intelligently handles employment gaps and calculates total years of experience by summing role durations (instead of relying on self-reported numbers).

3.  **Retriever Agent**:
    - **Role**: Headhunter.
    - **Task**: Uses **Tavily Search API** to find _active_ LinkedIn job postings (site:linkedin.com/jobs/view) that match your summarized profile.

4.  **Evaluator Agent**:
    - **Role**: Recruiter / Hiring Manager.
    - **Task**: Scores each found job (1-5 stars) on three axes:
      - **Skills Fit**: Do you have the tech stack?
      - **Seniority Fit**: Is the experience level appropriate?
      - **Industry Fit**: Is the domain relevant?
    - **Filter**: Discards generic career pages or search results, keeping only specific single-job postings.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- **OpenAI API Key**: For the LLM agents.
- **Tavily API Key**: For the search / retrieval agent.

### 1. Environment Setup

Create a `.env` file in the root directory (use `.env.example` as a template):

```bash
cp .env.example .env.local
```

Fill in your keys:

```ini
NEXT_PUBLIC_OPENAI_MODEL=gpt-5
OPENAI_API_KEY=sk-proj-...
TAVILY_API_KEY=tvly-...
```

### 2. Installation

```bash
npm install
```

### 3. Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the assistant.

## 🐳 Docker Deployment

The project is configured for a production-ready Docker deployment using Next.js standalone output.

1.  **Build and Run**:
    ```bash
    docker compose up --build
    ```
2.  **Access**:
    The app will be available at `http://localhost:3000`.

_Note: Ensure your `.env` file is present, as Docker Compose will read it._

## 🛠️ Development & Validation

We enforce code quality via **Husky** pre-commit hooks and a verification script.

- **Format**: `npm run format` (Prettier)
- **Lint**: `npm run lint` (ESLint)
- **Test**: `npm test` (Jest)
- **Type Check**: `npm run type-check`

**Run all checks at once:**

```bash
./verify.sh
```

## 📂 Project Structure

- **`app/`**: Next.js App Router pages and API routes.
  - `api/upload/route.ts`: Streaming endpoint that runs the LangGraph workflow.
  - `page.tsx`: Main client-side UI with real-time status updates.
- **`lib/`**: Core logic.
  - `resume-graph.ts`: **The Brain.** Defines the LangGraph nodes (Validator, Summarizer, Retriever, Evaluator) and edges.
  - `file-processing.ts`: Utilities for parsing PDF/DOCX files.
- **`tests/`**: Jest unit tests and mocks.

## ☁️ Deployment (Vercel)

1.  Push your code to GitHub.
2.  Import the project into Vercel.
3.  Add your Environment Variables in the Vercel Dashboard (Settings > Environment Variables).
4.  Deploy!

---

_Built with Next.js 15, React 19, and LangGraph._
