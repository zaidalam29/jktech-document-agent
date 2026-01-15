#!/usr/bin/env python
"""
Run all books tests
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def main():
    print("🚀 Running All Books Tests")
    print("=" * 50)
    
    # First check main.py
    try:
        from app.main import app
        print("✅ App imported successfully")
        
        # Check for duplicate app definition
        import inspect
        source = inspect.getsource(app.__class__)
        
    except Exception as e:
        print(f"❌ Error importing app: {e}")
        return 1
    
    import pytest
    
    # Run tests in groups
    test_groups = [
        ("Non-auth tests", ["tests/test_books.py::TestBooks::test_create_book_success",
                           "tests/test_books.py::TestBooks::test_get_books",
                           "tests/test_books.py::TestBooks::test_get_book_by_id_found",
                           "tests/test_books.py::TestBooks::test_get_book_by_id_not_found",
                           "tests/test_books.py::TestBooks::test_reindex_book"]),
        
        ("Auth success tests", ["tests/test_books.py::TestBooks::test_update_book_success",
                               "tests/test_books.py::TestBooks::test_delete_book_success",
                               "tests/test_books.py::TestBooks::test_generate_summary"]),
        
        ("Auth failure tests", ["tests/test_books.py::TestBooks::test_update_book_unauthorized",
                               "tests/test_books.py::TestBooks::test_delete_book_unauthorized"])
    ]
    
    all_passed = True
    
    for group_name, tests in test_groups:
        print(f"\n🧪 {group_name}")
        print("-" * 30)
        
        for test in tests:
            args = [test, "-v", "-s", "--tb=short", "--disable-warnings"]
            result = pytest.main(args)
            
            if result == 0:
                print(f"  ✅ {test.split('::')[-1]}")
            else:
                print(f"  ❌ {test.split('::')[-1]}")
                all_passed = False
    
    if all_passed:
        print("\n🎉 All books tests passed!")
        return 0
    else:
        print("\n⚠️ Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())