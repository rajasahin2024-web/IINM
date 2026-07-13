import os
import sys

# Add current dir to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine
from models import FAQ

def run():
    FAQ.__table__.create(bind=engine, checkfirst=True)
    print("Successfully created 'faqs' table")

if __name__ == "__main__":
    run()
