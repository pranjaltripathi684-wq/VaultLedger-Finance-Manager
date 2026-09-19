# 1. Import sqlite3

# 2. Define a constant for your database file name (e.g., DATABASE = 'finance.db')

# 3. Create a function get_db_connection():
#    - Connect to sqlite3 database using the DATABASE filename
#    - Set conn.row_factory = sqlite3.Row (so you can access columns by name like row['title']!)
#    - Return the connection object

# 4. Create a function init_db():
#    - Open and read 'schema.sql'
#    - Get a database connection
#    - Execute the schema script using conn.executescript(...)
#    - Commit and close the connection

# 5. Add if __name__ == '__main__':
#    - Call init_db() and print a success message so you can run `python db.py` to create the DB!
import os
import sqlite3

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE = os.path.join(BASE_DIR, 'finance.db')
SCHEMA_FILE = os.path.join(BASE_DIR, 'schema.sql')


def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with open(SCHEMA_FILE, 'r', encoding='utf-8') as f:
        schema = f.read()

    conn = get_db_connection()

    try:
        conn.executescript(schema)
        conn.commit()
    finally:
        conn.close()


if __name__ == '__main__':
    init_db()
    print("Database initialized successfully.")