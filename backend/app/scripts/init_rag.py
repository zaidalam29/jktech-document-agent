# scripts/init_rag.py
import os
import pickle
from pathlib import Path

def initialize_rag_storage():
    """Initialize RAG storage directory and file"""
    
    # Create directories
    directories = [
        "data",
        "uploads/documents",
        "logs"
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
        print(f"Created directory: {directory}")
    
    # Create empty RAG storage file if not exists
    rag_file = "data/rag_documents.pkl"
    if not os.path.exists(rag_file):
        with open(rag_file, 'wb') as f:
            pickle.dump({}, f)  # Empty dictionary
        print(f"Created empty RAG storage: {rag_file}")
    else:
        print(f"RAG storage already exists: {rag_file}")
    
    # Check file
    print(f"\nDirectory structure:")
    print(f"data/")
    for root, dirs, files in os.walk("data"):
        level = root.replace("data", "").count(os.sep)
        indent = " " * 2 * level
        print(f"{indent}{os.path.basename(root)}/")
        subindent = " " * 2 * (level + 1)
        for file in files:
            print(f"{subindent}{file}")

if __name__ == "__main__":
    initialize_rag_storage()