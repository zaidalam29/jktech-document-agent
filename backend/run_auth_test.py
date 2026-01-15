#!/usr/bin/env python
"""
Run only auth tests
"""
import sys
import os
import pytest

if __name__ == "__main__":
    # Add project root to path
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    
    # Run auth tests only
    args = [
        "tests/test_auth.py",
        "-v",
        "-s",
        "--tb=short",
        "--disable-warnings",
        "--log-level=INFO"
    ]
    
    exit_code = pytest.main(args)
    sys.exit(exit_code)