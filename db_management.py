#!/usr/bin/env python3
"""
CareFlow MySQL Database Management System
----------------------------------------
Provides complete database lifecycle management, schema migration, 
seeding, and administrative CLI utilities for the CareFlow platform.
"""

import os
import sys
import json
import uuid
import datetime
from pathlib import Path

# Try imports
try:
    import mysql.connector
    from mysql.connector import errorcode
    HAS_MYSQL = True
except ImportError:
    HAS_MYSQL = False
    import sqlite3
    print("[INFO] 'mysql-connector-python' is not installed in the environment.")
    print("[INFO] Run 'pip install mysql-connector-python' to connect to an external MySQL instance.")
    print("[INFO] Defaulting to SQLite database fallback for local simulation and testing...")

# Load .env configurations
def load_env():
    env_path = Path(__file__).parent / ".env"
    config = {
        "DB_HOST": "localhost",
        "DB_USER": "root",
        "DB_PASSWORD": "",
        "DB_NAME": "careflow_db",
        "DB_PORT": "3306",
        "USE_MOCK_DB": "true"
    }
    if env_path.exists():
        with open(env_path, "r") as f:
            for line in f:
                if "=" in line and not line.strip().startswith("#"):
                    k, v = line.strip().split("=", 1)
                    config[k.strip()] = v.strip()
    return config

CONFIG = load_env()

# Connect to database (MySQL or SQLite fallback)
def get_connection(create_db=False):
    if HAS_MYSQL:
        try:
            # First connect without database selected if we need to create it
            conn = mysql.connector.connect(
                host=CONFIG.get("DB_HOST", "localhost"),
                user=CONFIG.get("DB_USER", "root"),
                password=CONFIG.get("DB_PASSWORD", ""),
                port=int(CONFIG.get("DB_PORT", "3306"))
            )
            cursor = conn.cursor()
            if create_db:
                cursor.execute(f"CREATE DATABASE IF NOT EXISTS {CONFIG['DB_NAME']}")
                print(f"[DB] Verified/Created database: {CONFIG['DB_NAME']}")
            
            conn.database = CONFIG['DB_NAME']
            return conn
        except mysql.connector.Error as err:
            print(f"[DB ERROR] MySQL Connection failed: {err}")
            print("[INFO] Reverting to SQLite connection for offline testing...")
    
    # SQLite fallback path
    sqlite_path = Path(__file__).parent / "careflow_sim.db"
    print(f"[DB] Using local SQLite database at: {sqlite_path}")
    conn = sqlite3.connect(sqlite_path)
    return conn

# Execute multi-query schema
def init_schema():
    conn = get_connection(create_db=True)
    cursor = conn.cursor()
    schema_file = Path(__file__).parent / "mysql_schema.sql"
    
    if not schema_file.exists():
        print(f"[ERROR] Schema file not found at: {schema_file}")
        return

    with open(schema_file, "r") as f:
        schema_sql = f.read()

    # Split statements
    statements = [s.strip() for s in schema_sql.split(";") if s.strip()]
    
    print("[DB] Executing database schema initialization...")
    for statement in statements:
        # SQLite compatibility adjustment if fallback
        if not HAS_MYSQL:
            import re
            if "ENUM" in statement:
                statement = re.sub(r"ENUM\([^)]+\)", "TEXT", statement)
            if "JSON" in statement:
                statement = statement.replace("JSON", "TEXT")
            if "ON UPDATE CURRENT_TIMESTAMP" in statement:
                statement = statement.replace("ON UPDATE CURRENT_TIMESTAMP", "")
            # Convert UNIQUE KEY syntax for SQLite compatibility
            statement = re.sub(r"UNIQUE KEY \w+\s*\(([^)]+)\)", r"UNIQUE (\1)", statement)
            statement = re.sub(r"UNIQUE KEY\s*\(([^)]+)\)", r"UNIQUE (\1)", statement)
        
        try:
            cursor.execute(statement)
        except Exception as e:
            print(f"[DB DETAIL] Statement execution status: {statement[:50]}... -> {e}")
            if HAS_MYSQL:
                sys.exit(1)
            
    conn.commit()
    conn.close()
    print("[DB SUCCESS] Database schema initialized successfully!")

# Seed default mock data
def seed_data():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Generate UUID keys
    hospital_id = "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d"
    dept_icu_id = str(uuid.uuid4())
    dept_gen_id = str(uuid.uuid4())

    print("[DB] Seeding default hospital information...")
    try:
        # 1. Hospital
        cursor.execute("""
            INSERT IGNORE INTO hospitals (id, name, latitude, longitude, address, contact_phone)
            VALUES (%s, %s, %s, %s, %s, %s)
        """ if HAS_MYSQL else """
            INSERT OR IGNORE INTO hospitals (id, name, latitude, longitude, address, contact_phone)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (hospital_id, "AIIMS New Delhi Regional Complex", 28.5672, 77.2100, "Ansari Nagar, New Delhi", "+91 11 2658 8500"))

        # 2. Departments
        cursor.execute("""
            INSERT IGNORE INTO departments (id, hospital_id, name, code)
            VALUES (%s, %s, %s, %s)
        """ if HAS_MYSQL else """
            INSERT OR IGNORE INTO departments (id, hospital_id, name, code)
            VALUES (?, ?, ?, ?)
        """, (dept_icu_id, hospital_id, "Intensive Care Unit", "ICU"))

        cursor.execute("""
            INSERT IGNORE INTO departments (id, hospital_id, name, code)
            VALUES (%s, %s, %s, %s)
        """ if HAS_MYSQL else """
            INSERT OR IGNORE INTO departments (id, hospital_id, name, code)
            VALUES (?, ?, ?, ?)
        """, (dept_gen_id, hospital_id, "General Medicine", "GEN"))

        # 3. Beds
        for i in range(1, 6):
            bed_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT IGNORE INTO beds (id, hospital_id, department_id, bed_number, status, type)
                VALUES (%s, %s, %s, %s, %s, %s)
            """ if HAS_MYSQL else """
                INSERT OR IGNORE INTO beds (id, hospital_id, department_id, bed_number, status, type)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (bed_id, hospital_id, dept_icu_id, f"ICU-0{i}", "free", "ICU"))

        for i in range(1, 11):
            bed_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT IGNORE INTO beds (id, hospital_id, department_id, bed_number, status, type)
                VALUES (%s, %s, %s, %s, %s, %s)
            """ if HAS_MYSQL else """
                INSERT OR IGNORE INTO beds (id, hospital_id, department_id, bed_number, status, type)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (bed_id, hospital_id, dept_gen_id, f"GEN-{100+i}", "free", "general"))

        # 4. Ventilators
        for i in range(1, 4):
            vent_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT IGNORE INTO ventilators (id, hospital_id, department_id, serial_number, status, type)
                VALUES (%s, %s, %s, %s, %s, %s)
            """ if HAS_MYSQL else """
                INSERT OR IGNORE INTO ventilators (id, hospital_id, department_id, serial_number, status, type)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (vent_id, hospital_id, dept_icu_id, f"VENT-SL-{1000+i}", "available", "invasive" if i % 2 == 0 else "non_invasive"))

        # 5. Staff Members
        staff_data = [
            (str(uuid.uuid4()), hospital_id, dept_icu_id, "doctor_rajesh", "Rajesh", "Kumar", "dept_head", "doctor", "+91 99999 88888"),
            (str(uuid.uuid4()), hospital_id, dept_icu_id, "nurse_anjali", "Anjali", "Sharma", "staff", "nurse", "+91 99999 77777"),
            (str(uuid.uuid4()), hospital_id, dept_gen_id, "receptionist_rita", "Rita", "Sen", "receptionist", "support", "+91 99999 66666")
        ]
        for staff in staff_data:
            cursor.execute("""
                INSERT IGNORE INTO staff_members (id, hospital_id, department_id, auth_user_id, first_name, last_name, role, specialty, contact_number)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """ if HAS_MYSQL else """
                INSERT OR IGNORE INTO staff_members (id, hospital_id, department_id, auth_user_id, first_name, last_name, role, specialty, contact_number)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, staff)

        conn.commit()
        print("[DB SUCCESS] Database seeded successfully with core tenant records!")
    except Exception as e:
        print(f"[DB ERROR] Seeding aborted: {e}")
    finally:
        conn.close()

# CLI command processor
def main():
    if len(sys.argv) < 2:
        print("CareFlow Database Management CLI Help Menu")
        print("Usage:")
        print("  python db_management.py init             - Initialize database schema")
        print("  python db_management.py seed             - Seed primary tenant records")
        print("  python db_management.py status           - Verify connection & table counts")
        print("  python db_management.py audit-report     - Export system audit log reports")
        sys.exit(0)

    cmd = sys.argv[1].lower()

    if cmd == "init":
        init_schema()
    elif cmd == "seed":
        init_schema()
        seed_data()
    elif cmd == "status":
        try:
            conn = get_connection()
            cursor = conn.cursor()
            tables = ["hospitals", "departments", "beds", "ventilators", "staff_members", "patients", "audit_logs"]
            print("=== CareFlow MySQL Database Status ===")
            for table in tables:
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    cnt = cursor.fetchone()[0]
                    print(f"  Table '{table}': {cnt} records")
                except Exception as e:
                    print(f"  Table '{table}': Query failed ({e})")
            conn.close()
        except Exception as e:
            print(f"[ERROR] Failed to query database status: {e}")
    elif cmd == "audit-report":
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT id, action, entity_name, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 50")
            rows = cursor.fetchall()
            print("=== CareFlow System Audit Logs ===")
            if not rows:
                print("  No audit events logged yet.")
            for row in rows:
                print(f"  [{row[3]}] Action: {row[1]} | Entity: {row[2]} (ID: {row[0]})")
            conn.close()
        except Exception as e:
            print(f"[ERROR] Failed to extract audit reports: {e}")
    else:
        print(f"[ERROR] Unknown command: {cmd}")

if __name__ == "__main__":
    main()
