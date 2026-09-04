import sqlite3
import time
from flask import Flask, jsonify, request
from flask_cors import CORS
from database import DB_PATH, init_db

app = Flask(__name__)
CORS(app)

# Fallback Cache for resilient state execution
MARKET_CACHE = {}
CACHE_TTL = 15  # seconds

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def compute_delta_insights(stock, last_seen_price):
    """
    Computes precise 'Meaningful Change' signals across 3 distinct vectors.
    """
    alerts = []
    
    # Vector 1: Personal Session Delta (Difference since user's last session)
    if last_seen_price:
        delta_pct = ((stock['current_price'] - last_seen_price) / last_seen_price) * 100
        if abs(delta_pct) >= 2.5:
            direction = "surged" if delta_pct > 0 else "dropped"
            alerts.append({
                'id': 'SESSION_DELTA',
                'severity': 'CRITICAL' if abs(delta_pct) >= 5.0 else 'WARN',
                'label': f"Shift Since Last Session",
                'description': f"Price {direction} {abs(delta_pct):.2f}% since your last visit (was ₹{last_seen_price:.2f})."
            })

    # Vector 2: Volume Anomaly (Institutional Movement Signal)
    vol_ratio = stock['volume'] / max(stock['avg_20d_volume'], 1)
    if vol_ratio >= 1.8:
        alerts.append({
            'id': 'VOLUME_SURGE',
            'severity': 'INFO',
            'label': 'Unusual Volume Spike',
            'description': f"Trading volume is {vol_ratio:.1f}x higher than its 20-day average."
        })

    # Vector 3: Sentiment Anomaly
    if stock['news_sentiment'] <= -0.5:
        alerts.append({
            'id': 'NEGATIVE_SENTIMENT',
            'severity': 'CRITICAL',
            'label': 'Adverse News Sentiment',
            'description': "Social and news sentiment score dropped significantly in past 24h."
        })

    return alerts

@app.route('/api/watchlist', methods=['GET'])
def get_smart_watchlist():
    user_id = 1  # Hardcoded for single-user evaluation demo
    conn = get_db()
    cursor = conn.cursor()

    # Query latest benchmarks and join with user's last-seen snapshot
    query = '''
        SELECT m.*, s.last_seen_price 
        FROM market_benchmarks m
        LEFT JOIN user_stock_state s ON m.ticker = s.ticker AND s.user_id = ?
    '''
    stocks = cursor.execute(query, (user_id,)).fetchall()
    
    response = []
    for s in stocks:
        stock_dict = dict(s)
        alerts = compute_delta_insights(stock_dict, stock_dict.get('last_seen_price'))
        
        stock_dict['alerts'] = alerts
        stock_dict['has_actionable_change'] = len(alerts) > 0
        stock_dict['highest_severity'] = 'CRITICAL' if any(a['severity'] == 'CRITICAL' for a in alerts) else ('WARN' if any(a['severity'] == 'WARN' for a in alerts) else 'NONE')
        response.append(stock_dict)

    conn.close()
    return jsonify({'status': 'success', 'data': response})

if __name__ == '__main__':
    init_db()
    app.run(port=5000, debug=True)