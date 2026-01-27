# test_rag_fix.py
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

print("=== Testing Fixed RAG Pipeline ===\n")

# 1. Test RAG service directly
from app.services.rag_service import rag_pipeline

print("1. RAG Service Status:")
stats = rag_pipeline.get_stats()
for key, value in stats.items():
    if key == 'storage':
        print(f"   Storage:")
        for s_key, s_value in value.items():
            print(f"     {s_key}: {s_value}")
    else:
        print(f"   {key}: {value}")

# 2. Create test data
print(f"\n2. Creating test document...")
test_chunks = [
    {
        'chunk_id': 'test_1',
        'embedding': [0.1, 0.2, 0.3, 0.4] * 96,  # 384 dimensions
        'content': 'This is a test document about artificial intelligence.',
        'metadata': {'test': True, 'word_count': 10}
    },
    {
        'chunk_id': 'test_2',
        'embedding': [0.2, 0.3, 0.4, 0.5] * 96,
        'content': 'AI is transforming many industries including healthcare.',
        'metadata': {'test': True, 'word_count': 8}
    }
]

test_metadata = {
    'filename': 'test_ai.txt',
    'file_type': 'text',
    'author': 'Test User',
    'description': 'Test document for RAG'
}

# 3. Index document
print(f"\n3. Indexing test document...")
success = rag_pipeline.index_document(
    document_id=999,
    chunks=test_chunks,
    metadata=test_metadata
)

print(f"   Indexing result: {'SUCCESS' if success else 'FAILED'}")

# 4. Check after indexing
print(f"\n4. After indexing:")
stats = rag_pipeline.get_stats()
print(f"   Documents: {stats['total_documents']}")
print(f"   Chunks: {stats['total_chunks']}")
print(f"   Embeddings file size: {stats['storage']['embeddings_size']} bytes")

# 5. Verify file exists and has content
print(f"\n5. File verification:")
pkl_path = "data/rag_embeddings.pkl"
if os.path.exists(pkl_path):
    size = os.path.getsize(pkl_path)
    print(f"   ✓ PKL file exists: {size} bytes")
    
    # Try to load it
    import pickle
    try:
        with open(pkl_path, 'rb') as f:
            data = pickle.load(f)
        print(f"   ✓ PKL file loaded successfully")
        print(f"   ✓ Contains {len(data)} documents")
        
        if 999 in data:
            print(f"   ✓ Test document found with {len(data[999])} chunks")
    except Exception as e:
        print(f"   ✗ Error loading PKL: {e}")
else:
    print(f"   ✗ PKL file not found!")

# 6. Test search
print(f"\n6. Testing search...")
test_query_embedding = [0.15, 0.25, 0.35, 0.45] * 96
results = rag_pipeline.search_documents(test_query_embedding, top_k=2)
print(f"   Found {len(results)} results")

for i, result in enumerate(results, 1):
    print(f"   Result {i}: Doc {result['document_id']}, Similarity: {result['similarity']:.3f}")
    print(f"      Content: {result['content'][:50]}...")

print(f"\n=== Test Complete ===")