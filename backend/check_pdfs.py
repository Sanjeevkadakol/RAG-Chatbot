import os
from langchain_community.document_loaders import PyPDFLoader

DATASET_DIR = "../dataset"
pdf_files = [f for f in os.listdir(DATASET_DIR) if f.endswith(".pdf")]

for filename in pdf_files:
    file_path = os.path.join(DATASET_DIR, filename)
    print(f"Checking: {filename}")
    try:
        loader = PyPDFLoader(file_path)
        docs = loader.load()
        print(f"  OK: {len(docs)} pages")
    except Exception as e:
        print(f"  FAILED: {filename} - {str(e)[:100]}")
