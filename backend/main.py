import os
import time
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from langchain_community.document_loaders import PyPDFLoader, DirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_community.vectorstores import FAISS
from langchain_classic.chains import ConversationalRetrievalChain
from langchain_classic.memory import ConversationBufferMemory
from langchain_core.documents import Document

import fitz  # PyMuPDF
import io
from PIL import Image
import google.generativeai as genai

load_dotenv()

app = FastAPI(title="RAG Chatbot API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
DATASET_DIR = "../dataset"
VECTOR_DB_PATH = "vector_db"

# Global state
vector_store = None
memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True, output_key='answer')

class ChatRequest(BaseModel):
    message: str
    provider: str = "gemini" # gemini or groq

class ChatResponse(BaseModel):
    response: str
    source_documents: List[str] = []

@app.get("/")
async def root():
    return {"message": "RAG Chatbot API is running"}

def get_llm(provider: str):
    # Default to Groq for superior speed and stability
    if not provider or provider == "groq" or provider == "gemini":
        return ChatGroq(model_name="llama-3.3-70b-versatile", temperature=0.3)
    else:
        # Fallback to Gemini if explicitly requested
        return ChatGoogleGenerativeAI(model="gemini-flash-latest", temperature=0.3)

def get_embeddings():
    return HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

def extract_images_from_pdf(file_path: str) -> List[Document]:
    image_docs = []
    # Explicitly configure Gemini API for image extraction
    if os.getenv("GOOGLE_API_KEY"):
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
    else:
        print("Warning: GOOGLE_API_KEY not set. Image extraction will fail.")
        return image_docs

    try:
        pdf_document = fitz.open(file_path)
        vision_model = genai.GenerativeModel('gemini-flash-latest')
        
        for page_num in range(len(pdf_document)):
            page = pdf_document.load_page(page_num)
            image_list = page.get_images(full=True)
            
            for img_index, img in enumerate(image_list):
                try:
                    xref = img[0]
                    base_image = pdf_document.extract_image(xref)
                    image_bytes = base_image["image"]
                    
                    # Convert to PIL Image
                    image = Image.open(io.BytesIO(image_bytes))
                    
                    # Skip very small images (logos, decorative elements)
                    if image.width < 150 or image.height < 150:
                        continue
                    
                    print(f"Describing image on page {page_num+1} of {os.path.basename(file_path)}...")
                    
                    # Retry logic for 429 errors
                    max_retries = 3
                    for attempt in range(max_retries):
                        try:
                            response = vision_model.generate_content([
                                "Describe this image from a document in detail. If it's a diagram, chart, or graph, explain its structure and the data it represents. Include any text visible in the image. Make the description highly searchable.", 
                                image
                            ])
                            
                            if response.text:
                                doc = Document(
                                    page_content=f"[Image on page {page_num+1}]: {response.text}",
                                    metadata={"source": file_path, "page": page_num}
                                )
                                image_docs.append(doc)
                                
                            # Respect the 5 requests per minute free tier limit
                            print("Waiting 12 seconds to respect Gemini API rate limits...")
                            time.sleep(12)
                            break # Success, break retry loop
                        except Exception as inner_e:
                            if "429" in str(inner_e) or "quota" in str(inner_e).lower():
                                wait_time = 30 * (attempt + 1)
                                print(f"Rate limit hit. Waiting {wait_time}s...")
                                time.sleep(wait_time)
                            else:
                                raise inner_e
                except Exception as e:
                    print(f"Skipped image on page {page_num+1}: {str(e)}")
                    
    except Exception as e:
        print(f"Error processing images in {file_path}: {str(e)}")
        
    return image_docs

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    global vector_store
    
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
    
    if not os.path.exists(DATASET_DIR):
        os.makedirs(DATASET_DIR)
    
    # Save the file
    file_path = os.path.join(DATASET_DIR, file.filename)
    with open(file_path, "wb") as f:
        f.write(await file.read())
    
    # FAST INCREMENTAL INDEXING: Process just this one file
    try:
        print(f"Fast indexing text: {file.filename}...")
        loader = PyPDFLoader(file_path)
        docs = loader.load()
        
        print(f"Extracting images from: {file.filename}...")
        image_docs = extract_images_from_pdf(file_path)
        if image_docs:
            print(f"Added {len(image_docs)} image descriptions.")
            docs.extend(image_docs)

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        new_chunks = text_splitter.split_documents(docs)
        
        embeddings = get_embeddings()
        
        # Ensure vector store is loaded
        if vector_store is None:
            if os.path.exists(VECTOR_DB_PATH):
                vector_store = FAISS.load_local(VECTOR_DB_PATH, embeddings, allow_dangerous_deserialization=True)
            else:
                vector_store = FAISS.from_documents(new_chunks, embeddings)
        else:
            vector_store.add_documents(new_chunks)
        
        # Save updated index immediately
        vector_store.save_local(VECTOR_DB_PATH)
        
        return {
            "message": f"Successfully uploaded and indexed {file.filename}.",
            "chunks_added": len(new_chunks)
        }
    except Exception as e:
        print(f"Error during incremental indexing: {str(e)}")
        return {"message": f"File uploaded but indexing failed: {str(e)}"}

@app.post("/train")
async def train_on_dataset(background_tasks: BackgroundTasks):
    """
    Triggers indexing in the background to avoid blocking the UI.
    """
    background_tasks.add_task(perform_training)
    return {"message": "Training started in background. It will take a few minutes for 35+ PDFs."}

def perform_training():
    global vector_store
    try:
        print("Starting background training...")
        if not os.path.exists(DATASET_DIR):
            os.makedirs(DATASET_DIR)
            
        import glob
        documents = []
        
        pdf_files = glob.glob(os.path.join(DATASET_DIR, "*.pdf"))
        print(f"Found {len(pdf_files)} PDF files to process.")
        
        for file_path in pdf_files:
            print(f"Processing {os.path.basename(file_path)}...")
            try:
                # 1. Extract text
                loader = PyPDFLoader(file_path)
                docs = loader.load()
                documents.extend(docs)
                print(f"  - Extracted {len(docs)} text pages.")
            except Exception as e:
                print(f"  - Text extraction error for {os.path.basename(file_path)}: {str(e)}")
                
            try:
                # 2. Extract images
                image_docs = extract_images_from_pdf(file_path)
                if image_docs:
                    documents.extend(image_docs)
                    print(f"  - Extracted {len(image_docs)} image descriptions.")
            except Exception as e:
                print(f"  - Image extraction error for {os.path.basename(file_path)}: {str(e)}")
        
        if not documents:
            print("No documents successfully extracted to train on.")
            return

        print("Splitting text into chunks...")
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        chunks = text_splitter.split_documents(documents)
        
        print(f"Creating vector store from {len(chunks)} chunks...")
        embeddings = get_embeddings()
        vector_store = FAISS.from_documents(chunks, embeddings)
        vector_store.save_local(VECTOR_DB_PATH)
        print(f"Training complete. Indexed {len(chunks)} chunks.")
    except Exception as e:
        print(f"Background training error: {str(e)}")

@app.on_event("startup")
async def startup_event():
    global vector_store
    if os.path.exists(VECTOR_DB_PATH):
        try:
            print("Pre-loading vector store on startup...")
            embeddings = get_embeddings()
            vector_store = FAISS.load_local(VECTOR_DB_PATH, embeddings, allow_dangerous_deserialization=True)
            print("Vector store loaded successfully")
        except Exception as e:
            print(f"Error pre-loading vector store: {str(e)}")

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    global vector_store
    
    if vector_store is None:
        raise HTTPException(status_code=500, detail="Vector store not initialized. Please train the model or wait for startup to finish.")

    try:
        llm = get_llm(request.provider)
        
        qa_chain = ConversationalRetrievalChain.from_llm(
            llm=llm,
            retriever=vector_store.as_retriever(search_kwargs={"k": 4}),
            memory=memory,
            return_source_documents=True
        )
        
        print(f"Invoking chain for question: {request.message}")
        start_time = time.time()
        result = qa_chain.invoke({"question": request.message})
        end_time = time.time()
        print(f"Chain finished in {end_time - start_time:.2f} seconds")
        
        source_docs = []
        for doc in result.get("source_documents", []):
            source_docs.append(f"Source: {doc.metadata.get('source', 'Unknown')} (Page {doc.metadata.get('page', '0')}): {doc.page_content[:100]}...")
            
        return ChatResponse(
            response=result["answer"],
            source_documents=source_docs
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
