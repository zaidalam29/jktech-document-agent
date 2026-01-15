#!/usr/bin/env python
"""
Simple test runner
"""
import sys
import os
import pytest

if __name__ == "__main__":
    # Add project root to path
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    
    # Run tests one by one
    test_files = [
        "tests/test_auth.py",
        "tests/test_books.py", 
        "tests/test_documents.py",
        "tests/test_reviews.py",
        "tests/test_search.py",
        "tests/test_users.py",
    ]
    
    all_passed = True
    
    for test_file in test_files:
        print(f"\n{'='*60}")
        print(f"Running {test_file}")
        print(f"{'='*60}")
        
        args = [
            test_file,
            "-v",
            "-s",
            "--tb=short",
            "--disable-warnings",
            "--log-level=INFO"
        ]
        
        exit_code = pytest.main(args)
        
        if exit_code != 0:
            all_passed = False
            print(f"❌ {test_file} failed")
        else:
            print(f"✅ {test_file} passed")
    
    if all_passed:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed")
        sys.exit(1)