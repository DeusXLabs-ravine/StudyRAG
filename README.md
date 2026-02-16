# StudyRAG: Personalized AI Study Assistant

StudyRAG is a cutting-edge educational platform that transforms your static study materials into an interactive, personalized learning experience. Leveraging **Retrieval-Augmented Generation (RAG)** and the power of **Google Gemini**, StudyRAG provides context-aware tutoring, adaptive assessments, and automated content generation tailored specifically to your documents.

## 🚀 Key Features

- **Context-Aware Tutoring**: Ask questions about your uploaded PDFs and Docx files. Get answers grounded in your specific materials with direct citations.
- **Adaptive Learning Path**: The system tracks your performance and adjusts the teaching level (from "Dummy" to "Advanced") and highlights your weak topics.
- **Automated Module Generation**: Instantly turn lengthy documents into structured learning modules with objectives, key takeaways, and practice questions.
- **STEM Problem Solver**: Step-by-step solutions for complex math, science, and coding problems, with optional web-search grounding.
- **Smart Flashcards & Quizzes**: Generate adaptive flashcards with Spaced Repetition (SM-2) and quizzes that focus on your struggle areas.
- **Web-Enhanced Research**: Automatically supplements your study materials with curated external resources.

## 🛠️ Tech Stack

### Frontend
- **React + Vite**: For a fast, responsive, and modern user interface.
- **Tailwind CSS**: For sleek, professional styling.
- **Lucide React**: For intuitive iconography.

### Backend
- **Node.js & Express**: Robust and scalable API architecture.
- **Google Gemini 1.5 & 2.0**: State-of-the-art LLMs for generation, embeddings, and reasoning.
- **Supabase (PostgreSQL)**: Secure database and **pgvector** for high-performance semantic search.
- **Cloudinary**: Reliable cloud storage for study documents.

## 📂 Project Structure

```bash
├── backend/            # Express API service
│   ├── src/
│   │   ├── services/   # Core RAG and AI logic
│   │   ├── routes/     # API endpoints
│   │   └── config/     # Database and LLM configuration
│   └── docs/           # Technical documentation
└── frontend/           # React frontend application
    ├── src/
    │   ├── components/ # Reusable UI components
    │   ├── pages/      # Main application views
    │   └── services/   # API integration
```

## ⚙️ Getting Started

### Prerequisites
- Node.js (v18+)
- Supabase Account
- Google AI (Gemini) API Key
- Cloudinary Account

### Backend Setup
1. `cd backend`
2. `npm install`
3. Create a `.env` file based on `.env.example` and fill in your credentials.
4. Run migrations/schema in Supabase using `supabase-schema.sql`.
5. `npm start`

### Frontend Setup
1. `cd frontend`
2. `npm install`
3. Create a `.env` file with `VITE_API_URL=http://localhost:5000`.
4. `npm run dev`

## 📘 Documentation

For a deep dive into how the RAG pipeline works, the chunking strategy, and system architecture, check out our [Technical Documentation](backend/docs/technical-documentation.md).
