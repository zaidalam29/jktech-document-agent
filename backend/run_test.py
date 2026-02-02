#!/usr/bin/env python3
"""
Run test suite for Book Management System
"""

import os
import sys
import subprocess

def run_tests():
    """Run pytest with appropriate settings"""
    print("Running Production Test Suite...")
    print("=" * 60)
    
    # Set test environment variables
    os.environ['TESTING'] = 'True'
    os.environ['LOG_LEVEL'] = 'WARNING'
    
    # Run pytest directly
    result = subprocess.run([
        'pytest',
        'tests/',
        '-v',
        '--tb=short',
        '--disable-warnings',
        '-p', 'no:warnings',
        '--no-header',
        '-q'
    ], capture_output=True, text=True)
    
    # Print output
    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    
    print("=" * 60)
    if result.returncode == 0:
        print("All tests passed!")
    else:
        print(f"Tests failed with exit code: {result.returncode}")
    
    return result.returncode

if __name__ == "__main__":
    sys.exit(run_tests())