import sqlite3
import os

DB_PATH = 'watchlist.db'

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Stores user session timestamps
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            username TEXT UNIQUE,
            last_session_time DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Stores snapshot of ticker price when user last viewed it
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_stock_state (
            user_id INTEGER,
            ticker TEXT,
            last_seen_price REAL,
            PRIMARY KEY (user_id, ticker)
        )
    ''')

    # Stores baseline market benchmarks for diff calculations
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS market_benchmarks (
            ticker TEXT PRIMARY KEY,
            name TEXT,
            current_price REAL,
            prev_close REAL,
            volume INTEGER,
            avg_20d_volume INTEGER,
            news_sentiment REAL
        )
    ''')

    # Seed mock benchmark data
    cursor.execute('DELETE FROM market_benchmarks')
    seeds = [
        ('RELIANCE', 'Reliance Industries Ltd.', 2980.50, 2850.00, 12500000, 5000000, -0.6), # Volume surge + Neg sentiment + Price jump
        ('TCS', 'Tata Consultancy Services', 4120.00, 4110.00, 1200000, 1800000, 0.2),      # Normal
        ('INFY', 'Infosys Limited', 1450.25, 1540.00, 8900000, 3200000, 0.1),                # High volatility drop
        ('ZOMATO', 'Eternal Corp / Zomato', 230.80, 228.00, 45000000, 15000000, 0.8)        # Massive volume surge
    ]
    cursor.executemany('''
        INSERT INTO market_benchmarks VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', seeds)

    # Seed default user (User ID 1) with historical last-seen prices
    cursor.execute('INSERT OR IGNORE INTO users (id, username) VALUES (1, "demo_user")')
    cursor.execute('DELETE FROM user_stock_state WHERE user_id = 1')
    cursor.executemany('''
        INSERT INTO user_stock_state VALUES (1, ?, ?)
    ''', [('RELIANCE', 2860.00), ('TCS', 4115.00), ('INFY', 1530.00), ('ZOMATO', 185.00)])

    conn.commit()
    conn.close()

if __name__ == '__main__':
    init_db()
    print("Database initialized successfully.")