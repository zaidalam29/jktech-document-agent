#!/usr/bin/env python
"""
Setup local storage directories
"""
import os
from pathlib import Path

def setup_directories():
    print("📁 Setting up local storage directories...")
    
    directories = [
        "uploads",
        "uploads/documents",
        "uploads/books", 
        "uploads/temp",
        "uploads/images"
    ]
    
    for dir_path in directories:
        Path(dir_path).mkdir(parents=True, exist_ok=True)
        print(f"  ✅ Created: {dir_path}")
    
    # Create .gitignore in uploads
    gitignore_content = """# Ignore uploaded files in development
*.pdf
*.doc
*.docx
*.txt
*.md
*.json
*.jpg
*.png
*.mp4
!README.md
"""
    
    gitignore_path = Path("uploads/.gitignore")
    gitignore_path.write_text(gitignore_content)
    print(f"  ✅ Created: uploads/.gitignore")
    
    # Create README
    readme_path = Path("uploads/README.md")
    readme_content = """# Uploads Directory

This directory contains files uploaded through the application.

## Structure
- `documents/` - Uploaded documents (PDF, DOC, TXT, etc.)
- `books/` - Book-related files
- `temp/` - Temporary files
- `images/` - Image files

## Note
All files in this directory are ignored by git.
"""
    readme_path.write_text(readme_content)
    print(f"  ✅ Created: uploads/README.md")
    
    print("\n🎉 Local storage setup complete!")

if __name__ == "__main__":
    setup_directories()