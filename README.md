# RAG Chatbot - AI Document Search

A premium, modern AI-powered document search application built with FastAPI, React (Vite), Tailwind CSS, and LangChain.

## 🌟 New Features & UI Enhancements
- 🎨 **Modern Light Mode**: A clean, professional slate-and-blue light theme replacing the dark glassmorphism styling.
- 🎮 **Retro Pong Canvas Hero**: Dynamic background rendering the "Prompting Is All You Need" interactive Pong game, styled to match the new light aesthetic.
- 📂 **Collapsible Shadcn Sidebar**: Seamlessly integrated collapsible navigation featuring:
  - **Model Engine Toggle**: Switch between **Google Gemini Pro** and **Groq Llama 3** on the fly.
  - **Document Indexing List**: View loaded documents (35+ PDFs ready for search).
  - **Quick Controls**: Instant buttons to "Update Index" or "Upload PDF" directly from the footer.
- 🖥️ **Adaptive Layout**: Interactive sidebar collapse on desktop and fully responsive drawer menu on mobile viewports.

## 🛠️ Tech Stack
- **Frontend**: React (Vite), TypeScript, Tailwind CSS v4, Radix UI Primitives, Framer Motion, Lucide Icons.
- **Backend**: FastAPI, LangChain, FAISS (Vector DB), HuggingFace Embeddings, Gemini Vision API (for image extraction).

## 🚀 Quick Start

### 1. Backend Setup
1. Add your `GOOGLE_API_KEY` and `GROQ_API_KEY` to `backend/.env`.
2. Activate virtual environment and install dependencies:
   ```bash
   cd backend
   .\venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. (Optional) Run the document indexing script to build your local database:
   ```bash
   python train_model.py
   ```
4. Start the FastAPI backend:
   ```bash
   python main.py
   ```
   The API will start running at `http://localhost:8000`.

### 2. Frontend Setup
1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` (or the fallback port shown in console, e.g. `http://localhost:5174`) in your browser.

## 🐳 Docker Deployment
You can also run both services containerized:
```bash
docker-compose up --build
```
