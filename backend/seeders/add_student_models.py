from database import engine, Base
import models

print("Creating new tables...")
Base.metadata.create_all(bind=engine)
print("Done!")
