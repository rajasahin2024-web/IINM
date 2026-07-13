#!/usr/bin/env python3
"""
Migration script to add order_position field to course_materials table (PostgreSQL)
"""

import psycopg2
import os
from dotenv import load_dotenv

def add_order_position_field():
    load_dotenv()
    
    # Parse DATABASE_URL
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not found in environment!")
        return
    
    # Extract connection details from DATABASE_URL
    # postgresql+psycopg2://user:password@host:port/database
    url_parts = database_url.replace("postgresql+psycopg2://", "").split("@")
    user_pass = url_parts[0].split(":")
    host_port_db = url_parts[1].split("/")
    host_port = host_port_db[0].split(":")
    
    user = user_pass[0]
    password = user_pass[1]
    host = host_port[0]
    port = int(host_port[1])
    database = host_port_db[1]
    
    try:
        conn = psycopg2.connect(
            host=host,
            port=port,
            database=database,
            user=user,
            password=password
        )
        cursor = conn.cursor()
        
        # Check if order_position column already exists
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'course_materials' AND column_name = 'order_position'
        """)
        
        if cursor.fetchone() is None:
            print("Adding order_position column to course_materials table...")
            
            # Add the order_position column
            cursor.execute("ALTER TABLE course_materials ADD COLUMN order_position INTEGER DEFAULT 0")
            
            # Update existing records with incremental order positions based on creation date
            cursor.execute("""
                UPDATE course_materials 
                SET order_position = subquery.row_num
                FROM (
                    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
                    FROM course_materials
                ) AS subquery
                WHERE course_materials.id = subquery.id
            """)
            
            conn.commit()
            print("✅ Successfully added order_position field and updated existing records!")
        else:
            print("order_position column already exists!")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    add_order_position_field()