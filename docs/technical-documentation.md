# Technical Documentation: The StudyRAG System

This document provides an in-depth technical explanation of StudyRAG, specifically focusing on its **Retrieval-Augmented Generation (RAG)** architecture and how it provides personalized study assistance.

## 1. What is RAG?

**Retrieval-Augmented Generation (RAG)** is a technique used to give Large Language Models (LLMs) access to data they weren't originally trained on. Instead of relying solely on the model's internal knowledge, RAG allows the model to "look up" information from a specific set of documents (like your study notes) before generating a response.

### The Problem RAG Solves
- **Hallucination**: LLMs might make up facts if they don't know the answer. RAG forces them to base answers on specific sources.
- **Outdated Knowledge**: LLMs are frozen in time at their last training date. RAG allows them to use the most current data you provide.
- **Privacy/Specific Context**: LLMs don't know your specific course syllabus or teacher's notes unless you provide them.

## 2. How StudyRAG is a RAG System

StudyRAG follows the standard RAG pipeline but adds layers of **adaptive learning** and **multimodal processing**.

### The High-Level Flow
1. **User Uploads Documents**: PDFs, DOCX, or text files.
2. **Ingestion Pipeline**: The system extracts text, breaks it into "chunks," and converts them into "embeddings" (mathematical vectors).
3. **Storage**: These vectors are stored in a vector database (Supabase with `pgvector`).
4. **Querying**: When you ask a question, the system searches the database for the most relevant chunks.
5. **Augmentation**: The relevant chunks are added to the prompt as "context."
6. **Generation**: The LLM (Gemini) generates an answer based *primarily* on that context.

---

## 3. Deep Dive into the StudyRAG Pipeline

### 3.1. Ingestion & Text Extraction
Located in `backend/src/services/fileProcessor.js`, the system uses:
- `pdf-parse` for PDF files.
- `mammoth` for DOCX files.
- Standard UTF-8 reading for text and markdown.

### 3.2. Chunking Strategy
Located in `backend/src/services/chunkingService.js`.
We don't just feed the whole document to the LLM. We break it into chunks of **800 characters** with a **100-character overlap**.
- **Why?**: LLMs have a "context window" (limit on how much they can read). Chunking ensures we only send the most relevant parts, saving costs and improving accuracy.
- **Overlap**: Ensuring chunks overlap helps preserve context that might be split across two sections.

### 3.3. Embeddings & Vector Storage
Located in `backend/src/services/embeddingService.js` and `vectorStore.js`.
- **Embeddings**: We use Google Gemini's `gemini-embedding-001` model. This turns text into a vector (a list of ~768 numbers). Vectors represent the *meaning* of the text.
- **Vector DB**: We use **Supabase** with the `pgvector` extension.
- **Search**: When a query comes in, we turn the query into a vector and use **Cosine Similarity** (in the `match_chunks` SQL function) to find chunks that are "closest" in meaning to the query.

### 3.4. Retrieval & Personalized Augmentation
Located in `backend/src/services/ragService.js`.
This is where the magic happens. The system doesn't just retrieve text; it retrieves context based on the user's **Teaching Level** and **Weak Topics**.

- **Personalization**: The prompt is modified based on whether the student is at a "Dummy," "Beginner," or "Advanced" level.
- **Topic Performance**: If a student is struggling with "Calculus," the RAG service fetches extra context or provides more detailed explanations for that topic.

---

## 4. Advanced AI Features

### 4.1. Adaptive Flashcards (SM-2 Algorithm)
Located in `flashcardGenerator.js`.
The system doesn't just show cards randomly. It uses a **Spaced Repetition** algorithm (SM-2) to calculate when you should see a card again based on how well you remembered it.

### 4.2. STEM Solver
Located in `solverService.js`.
For complex math or coding, we use **Gemini 3 Pro** with optional **Web Search Grounding**. This allows the system to solve problems step-by-step while cross-referencing your study materials to ensure the notation matches what you're learning.

### 4.3. Automated Modules
Located in `moduleGenerator.js`.
The system analyzes your entire document and breaks it into pedagogical modules with objectives, summaries, and assessments, essentially "teaching" you the document.

---

## 5. Summary Table

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **LLM** | Gemini 3 Flash / 3 Pro | Reasoning and Text Generation |
| **Embeddings** | Gemini gemini-embedding-001 | Semantic representation of text |
| **Vector DB** | Supabase (PostgreSQL + pgvector) | Efficient semantic search |
| **Backend** | Node.js / Express | Logic and API layer |
| **Storage** | Cloudinary | Persistent document storage |
| **Frontend** | React / Tailwind | User Interface |
