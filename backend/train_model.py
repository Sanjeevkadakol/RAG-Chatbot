import os
import time
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from dotenv import load_dotenv

load_dotenv()

DATASET_DIR = "../dataset"
VECTOR_DB_PATH = "vector_db"
FILE_BATCH_SIZE = 10 
EMBED_BATCH_SIZE = 200 # Larger batches for local processing

def get_embeddings():
    # Using a fast, high-quality local model
    return HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

def train_in_batches():
    if not os.path.exists(DATASET_DIR):
        print(f"Error: {DATASET_DIR} directory not found.")
        return

    pdf_files = [f for f in os.listdir(DATASET_DIR) if f.lower().endswith(".pdf")]
    total_files = len(pdf_files)
    
    print(f"--- Stage 1: Parsing {total_files} PDFs ---")
    
    all_chunks = []
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    
    for i in range(0, total_files, FILE_BATCH_SIZE):
        batch = pdf_files[i:i + FILE_BATCH_SIZE]
        for filename in batch:
            file_path = os.path.join(DATASET_DIR, filename)
            print(f"  - Parsing: {filename}")
            try:
                loader = PyPDFLoader(file_path)
                docs = loader.load()
                chunks = text_splitter.split_documents(docs)
                all_chunks.extend(chunks)
            except Exception as e:
                print(f"  - Skipped: {filename} (Error: {str(e)[:50]})")
    
    total_chunks = len(all_chunks)
    print(f"\n--- Stage 2: Creating Vector Database ({total_chunks} chunks) ---")
    print(f"Processing locally with HuggingFace Embeddings...")

    embeddings = get_embeddings()
    
    # Process in batches to manage memory
    vector_store = None
    for i in range(0, total_chunks, EMBED_BATCH_SIZE):
        chunk_batch = all_chunks[i:i + EMBED_BATCH_SIZE]
        print(f"  - Embedding chunks {i} to {min(i + EMBED_BATCH_SIZE, total_chunks)}...")
        
        if vector_store is None:
            vector_store = FAISS.from_documents(chunk_batch, embeddings)
        else:
            vector_store.add_documents(chunk_batch)

    if vector_store:
        vector_store.save_local(VECTOR_DB_PATH)
        print(f"\n✅ SUCCESS: Vector Database saved to '{VECTOR_DB_PATH}'")
        print("--- Training Complete! ---")
    else:
        print("\n❌ FAILED: Could not create Vector Database.")

if __name__ == "__main__":
    train_in_batches()
