'use client'
import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  TrendingUp, TrendingDown, Activity, ShieldAlert, 
  Plus, Trash2, Zap, CheckCircle2, Search, X, Calendar, 
  BarChart2, Clock, Loader2, RefreshCw, Download, Sliders, Filter
} from 'lucide-react';

interface Alert {
  id: string;
  severity: 'CRITICAL' | 'WARN' | 'INFO';
  label: string;
  description: string;
  timestamp: string;
}

interface Stock {
  ticker: string;
  name: string;
  sector: 'IT' | 'BANK' | 'AUTO' | 'ENERGY' | 'CONSUMER' | 'OTHER';
  current_price: number;
  prev_close: number;
  volume: number;
  market_cap: string;
  pe_ratio: number;
  high_52w: number;
  low_52w: number;
  sparkline: number[];
  alerts: Alert[];
  has_actionable_change: boolean;
  highest_severity: 'CRITICAL' | 'WARN' | 'INFO' | 'NONE';
}

const SECTOR_MAP: Record<string, 'IT' | 'BANK' | 'AUTO' | 'ENERGY' | 'CONSUMER' | 'OTHER'> = {
  RELIANCE: 'ENERGY',
  TCS: 'IT',
  INFY: 'IT',
  WIPRO: 'IT',
  HCLTECH: 'IT',
  TATAMOTORS: 'AUTO',
  MARUTI: 'AUTO',
  HDFCBANK: 'BANK',
  ICICIBANK: 'BANK',
  SBIN: 'BANK',
  BHARTIARTL: 'CONSUMER',
  ITC: 'CONSUMER',
};

const INITIAL_TICKERS = ['RELIANCE', 'TCS', 'INFY', 'TATAMOTORS', 'HDFCBANK', 'ICICIBANK', 'BHARTIARTL', 'ITC'];

export default function SmartWatchlist() {
  const [tickerList, setTickerList] = useState<string[]>(INITIAL_TICKERS);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  
  // Dashboard Settings & Controls
  const [chartTimeframe, setChartTimeframe] = useState<'1W' | '2W' | '1M'>('2W');
  const [newTicker, setNewTicker] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'DEFAULT' | 'GAINERS' | 'LOSERS' | 'VOLUME'>('DEFAULT');
  const [alertThreshold, setAlertThreshold] = useState<number>(2.0); // % threshold
  const [autoPoll, setAutoPoll] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(10);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  
  const [simulating, setSimulating] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Fetch Stock Data
  const fetchAllLiveStocks = async () => {
    const fetchedStocks = await Promise.all(
      tickerList.map(async (ticker) => {
        try {
          const res = await fetch(`/api/stock?symbol=${ticker}.NS`);
          if (!res.ok) return null;
          const data = await res.json();

          const priceDiffPct = data.prev_close > 0 
            ? ((data.current_price - data.prev_close) / data.prev_close) * 100 
            : 0;

          const alerts: Alert[] = [];
          let highest_severity: 'CRITICAL' | 'WARN' | 'INFO' | 'NONE' = 'NONE';
          let has_actionable_change = false;

          if (Math.abs(priceDiffPct) >= alertThreshold) {
            highest_severity = priceDiffPct < -(alertThreshold + 1) ? 'CRITICAL' : 'WARN';
            has_actionable_change = true;
            alerts.push({
              id: `shift_${ticker}_${Date.now()}`,
              severity: highest_severity,
              label: 'Shift Since Last Session',
              description: `Price ${priceDiffPct >= 0 ? 'surged' : 'dropped'} ${priceDiffPct.toFixed(2)}% from previous close.`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            });
          }

          return {
            ticker: data.ticker,
            name: `${data.ticker} India Ltd.`,
            sector: SECTOR_MAP[data.ticker] || 'OTHER',
            current_price: data.current_price,
            prev_close: data.prev_close,
            volume: data.volume,
            market_cap: '₹ Live',
            pe_ratio: 24.8,
            high_52w: data.high_52w,
            low_52w: data.low_52w,
            sparkline: data.sparkline.length > 0 ? data.sparkline : [data.prev_close, data.current_price],
            alerts,
            has_actionable_change,
            highest_severity
          };
        } catch (err) {
          console.error(`Error loading ${ticker}:`, err);
          return null;
        }
      })
    );

    setStocks(fetchedStocks.filter(Boolean) as Stock[]);
    setIsLoading(false);
  };

  // Initial Load
  useEffect(() => {
    setIsLoading(true);
    fetchAllLiveStocks();
  }, [tickerList, alertThreshold]);

  // Auto Polling Timer
  useEffect(() => {
    if (!autoPoll) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchAllLiveStocks();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autoPoll, tickerList, alertThreshold]);

  // Handle Add Ticker
  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicker.trim()) return;
    const tickerUpper = newTicker.toUpperCase().trim();
    if (!tickerList.includes(tickerUpper)) {
      setTickerList([...tickerList, tickerUpper]);
    }
    setNewTicker('');
  };

  // Handle Remove Ticker
  const handleRemoveStock = (e: React.MouseEvent, ticker: string) => {
    e.stopPropagation();
    setTickerList(tickerList.filter(t => t !== ticker));
    setStocks(stocks.filter(s => s.ticker !== ticker));
    if (selectedStock?.ticker === ticker) setSelectedStock(null);
  };

  // Simulate Market Shock
  const triggerMarketShock = () => {
    setSimulating(true);
    setTimeout(() => {
      setStocks(prev => prev.map(stock => {
        if (stock.ticker === 'TCS' || stock.ticker === stocks[0]?.ticker) {
          const crashedPrice = Number((stock.current_price * 0.935).toFixed(2));
          const updated: Stock = {
            ...stock,
            current_price: crashedPrice,
            highest_severity: 'CRITICAL',
            has_actionable_change: true,
            sparkline: [...stock.sparkline, crashedPrice],
            alerts: [{
              id: `shock_${Date.now()}`,
              severity: 'CRITICAL',
              label: 'Flash Crash Vector Triggered',
              description: 'Real-time delta shift exceeded -6.5% boundary.',
              timestamp: new Date().toLocaleTimeString()
            }, ...stock.alerts]
          };
          if (selectedStock?.ticker === stock.ticker) setSelectedStock(updated);
          return updated;
        }
        return stock;
      }));
      setSimulating(false);
    }, 500);
  };

  // Sync Baseline
  const acknowledgeChanges = () => {
    setStocks(prev => prev.map(s => ({
      ...s,
      alerts: [],
      has_actionable_change: false,
      highest_severity: 'NONE',
      prev_close: s.current_price
    })));
    if (selectedStock) {
      setSelectedStock({
        ...selectedStock,
        alerts: [],
        has_actionable_change: false,
        highest_severity: 'NONE',
        prev_close: selectedStock.current_price
      });
    }
    setSyncStatus('Session baseline synchronized across all assets.');
    setTimeout(() => setSyncStatus(null), 3000);
  };

  // CSV Audit Log Export
  const exportAuditLog = () => {
    const allAlerts = stocks.flatMap(s => s.alerts.map(a => ({
      Ticker: s.ticker,
      Severity: a.severity,
      Label: a.label,
      Description: a.description,
      Timestamp: a.timestamp
    })));

    if (allAlerts.length === 0) {
      alert('No active session alerts to export!');
      return;
    }

    const headers = ['Ticker', 'Severity', 'Label', 'Description', 'Timestamp'];
    const csvRows = [
      headers.join(','),
      ...allAlerts.map(row => headers.map(h => `"${row[h as keyof typeof row]}"`).join(','))
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DeltaWatch_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // Process Filtered & Sorted Stocks
  const processedStocks = useMemo(() => {
    return stocks
      .filter(s => {
        const matchesSearch = s.ticker.toLowerCase().includes(searchQuery.toLowerCase()) || s.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSector = selectedSector === 'ALL' || s.sector === selectedSector;
        return matchesSearch && matchesSector;
      })
      .sort((a, b) => {
        const pctA = ((a.current_price - a.prev_close) / a.prev_close) * 100;
        const pctB = ((b.current_price - b.prev_close) / b.prev_close) * 100;

        if (sortBy === 'GAINERS') return pctB - pctA;
        if (sortBy === 'LOSERS') return pctA - pctB;
        if (sortBy === 'VOLUME') return b.volume - a.volume;
        return 0;
      });
  }, [stocks, searchQuery, selectedSector, sortBy]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Market Benchmarks Ticker */}
        <div className="flex items-center justify-between gap-4 py-2 px-4 bg-slate-900/90 rounded-xl border border-slate-800 text-xs font-mono overflow-x-auto">
          <div className="flex items-center gap-6 shrink-0">
            <span className="text-slate-400 font-bold">NSE BENCHMARKS:</span>
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold">NIFTY 50</span>
              <span className="text-emerald-400 flex items-center"><TrendingUp className="w-3 h-3 mr-0.5" /> 24,820.15 (+0.42%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold">SENSEX</span>
              <span className="text-emerald-400 flex items-center"><TrendingUp className="w-3 h-3 mr-0.5" /> 81,105.30 (+0.38%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold">BANK NIFTY</span>
              <span className="text-rose-400 flex items-center"><TrendingDown className="w-3 h-3 mr-0.5" /> 51,240.80 (-0.15%)</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={() => setAutoPoll(!autoPoll)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 transition ${
                autoPoll ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-slate-800 text-slate-400'
              }`}
            >
              <RefreshCw className={`w-3 h-3 ${autoPoll ? 'animate-spin' : ''}`} />
              {autoPoll ? `Auto Poll (${countdown}s)` : 'Polling Paused'}
            </button>
          </div>
        </div>

        {/* Primary Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="h-3.5 w-3.5 rounded-full bg-emerald-500 animate-ping"></span>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-200 to-indigo-400 bg-clip-text text-transparent">
                DeltaWatch
              </h1>
              <span className="px-2 py-0.5 text-[10px] uppercase font-mono tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded">
                PRO TERMINAL
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Contextual market watch & automated session delta trigger engine.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={exportAuditLog}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 transition"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              Export CSV
            </button>

            <button 
              onClick={triggerMarketShock}
              disabled={simulating || isLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-300 hover:bg-amber-500/20 transition disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 ${simulating ? 'animate-bounce' : ''}`} />
              Flash Shock
            </button>

            <button 
              onClick={acknowledgeChanges}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-600 border border-indigo-500 text-white hover:bg-indigo-500 transition disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Sync Baseline
            </button>
          </div>
        </div>

        {/* Control Bar: Filters, Search & Threshold */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
          
          {/* Add Stock Form */}
          <form onSubmit={handleAddStock} className="md:col-span-4 flex items-center gap-2">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input 
                type="text" 
                placeholder="Add Ticker (e.g. WIPRO, MARUTI)" 
                value={newTicker}
                onChange={(e) => setNewTicker(e.target.value)}
                className="w-full bg-slate-950 text-xs border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button type="submit" className="px-3.5 py-2 bg-emerald-600 text-xs font-bold rounded-xl hover:bg-emerald-500 transition flex items-center gap-1 shrink-0">
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </form>

          {/* Sector Selector */}
          <div className="md:col-span-3 flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500 shrink-0" />
            <select 
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full bg-slate-950 text-xs border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Sectors</option>
              <option value="IT">IT & Tech</option>
              <option value="BANK">Banking & Finance</option>
              <option value="AUTO">Automotive</option>
              <option value="ENERGY">Energy & Infrastructure</option>
              <option value="CONSUMER">Consumer Goods</option>
            </select>
          </div>

          {/* Sort By Selector */}
          <div className="md:col-span-2 flex items-center gap-2">
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-slate-950 text-xs border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="DEFAULT">Default Order</option>
              <option value="GAINERS">Top Gainers</option>
              <option value="LOSERS">Top Losers</option>
              <option value="VOLUME">Highest Volume</option>
            </select>
          </div>

          {/* Sensitivity Slider */}
          <div className="md:col-span-3 flex items-center justify-between gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium shrink-0 flex items-center gap-1">
              <Sliders className="w-3 h-3 text-indigo-400" /> Sensitivity:
            </span>
            <input 
              type="range" 
              min="0.5" 
              max="5.0" 
              step="0.5" 
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(parseFloat(e.target.value))}
              className="w-20 accent-indigo-500 cursor-pointer"
            />
            <span className="text-xs font-mono font-bold text-indigo-400 shrink-0">±{alertThreshold}%</span>
          </div>

        </div>

        {syncStatus && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4" /> {syncStatus}
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="flex items-center justify-center p-16 bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-sm gap-2 font-mono">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            Loading real-time market data feed...
          </div>
        )}

        {/* Main Watchlist Cards */}
        {!isLoading && (
          <div className="grid gap-4">
            {processedStocks.map((stock) => {
              const priceDiff = stock.current_price - stock.prev_close;
              const priceDiffPct = stock.prev_close > 0 ? (priceDiff / stock.prev_close) * 100 : 0;
              const isPositive = priceDiff >= 0;

              return (
                <div 
                  key={stock.ticker}
                  onClick={() => setSelectedStock(stock)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.002] ${
                    stock.highest_severity === 'CRITICAL'
                      ? 'bg-rose-950/20 border-rose-500/50 shadow-lg shadow-rose-950/20'
                      : stock.highest_severity === 'WARN'
                      ? 'bg-amber-950/20 border-amber-500/40'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    {/* Stock Details */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold tracking-wide text-white">{stock.ticker}</h2>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">{stock.sector}</span>
                        <button 
                          onClick={(e) => handleRemoveStock(e, stock.ticker)}
                          className="text-slate-600 hover:text-rose-400 transition ml-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold font-mono">₹{stock.current_price.toLocaleString('en-IN')}</span>
                        <span className={`flex items-center text-xs font-semibold px-2 py-0.5 rounded ${
                          isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                          {isPositive ? '+' : ''}{priceDiffPct.toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    {/* Enhanced Sparkline with Area Gradient */}
                    <div className="hidden md:flex flex-col items-center justify-center">
                      <span className="text-[10px] text-slate-500 uppercase font-mono mb-1">Live 30D Curve</span>
                      <div className="w-32 h-10">
                        {(() => {
                          const min = Math.min(...stock.sparkline);
                          const max = Math.max(...stock.sparkline);
                          const range = (max - min) || 1;
                          
                          const points = stock.sparkline.map((val, idx) => {
                            const x = (idx / (stock.sparkline.length - 1 || 1)) * 100;
                            const y = 36 - ((val - min) / range) * 32;
                            return `${x.toFixed(2)},${y.toFixed(2)}`;
                          }).join(' ');

                          const closedPoints = `${points} 100,40 0,40`;

                          return (
                            <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                              <defs>
                                <linearGradient id={`grad_${stock.ticker}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={isPositive ? '#10b981' : '#f43f5e'} stopOpacity="0.3" />
                                  <stop offset="100%" stopColor={isPositive ? '#10b981' : '#f43f5e'} stopOpacity="0.0" />
                                </linearGradient>
                              </defs>
                              <polygon points={closedPoints} fill={`url(#grad_${stock.ticker})`} />
                              <polyline
                                fill="none"
                                stroke={isPositive ? '#10b981' : '#f43f5e'}
                                strokeWidth="2"
                                vectorEffect="non-scaling-stroke"
                                points={points}
                              />
                            </svg>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Delta Alerts Container */}
                    <div className="flex flex-col gap-2 md:items-end flex-1 max-w-md">
                      {stock.alerts.length > 0 ? (
                        stock.alerts.map((alert) => (
                          <div 
                            key={alert.id}
                            className={`flex items-start gap-2 text-xs p-2.5 rounded-xl border w-full ${
                              alert.severity === 'CRITICAL' 
                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                            }`}
                          >
                            {alert.severity === 'CRITICAL' ? (
                              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                            ) : (
                              <Activity className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <span className="font-semibold block">{alert.label}</span>
                              <span className="text-slate-300 opacity-90">{alert.description}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic">No structural state changes beyond ±{alertThreshold}% threshold</span>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DYNAMIC INTERACTIVE CHART MODAL */}
      {selectedStock && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl space-y-6 p-6 max-h-[92vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-white">{selectedStock.ticker}</h2>
                  <span className="text-xs text-slate-400">{selectedStock.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">{selectedStock.sector}</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-3xl font-mono font-bold text-white">
                    ₹{selectedStock.current_price.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-800 text-slate-300 flex items-center gap-1">
                    <BarChart2 className="w-3 h-3 text-emerald-400" />
                    P/E: {selectedStock.pe_ratio}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => { setSelectedStock(null); setHoverIndex(null); }}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Interactive Area Gradient SVG Chart */}
            <div className="space-y-3 bg-slate-950 p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  Interactive Price Curve (Hover to Inspect)
                </span>
                
                <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                  {(['1W', '2W', '1M'] as const).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => { setChartTimeframe(tf); setHoverIndex(null); }}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                        chartTimeframe === tf 
                          ? 'bg-indigo-600 text-white' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              {/* SVG Area Render with Hover Cursor */}
              <div className="h-56 w-full pt-4 pb-2 relative border-b border-slate-800">
                {(() => {
                  const fullHistory = selectedStock.sparkline || [];
                  const sliceCount = chartTimeframe === '1W' ? 7 : chartTimeframe === '2W' ? 14 : 30;
                  const points = fullHistory.slice(-sliceCount);

                  if (points.length === 0) return null;

                  const min = Math.min(...points);
                  const max = Math.max(...points);
                  const range = (max - min) || 1;
                  const isUp = points[points.length - 1] >= points[0];

                  const formattedPoints = points.map((val, idx) => {
                    const x = (idx / (points.length - 1 || 1)) * 100;
                    const y = 90 - ((val - min) / range) * 80;
                    return `${x.toFixed(2)},${y.toFixed(2)}`;
                  }).join(' ');

                  const areaPoints = `${formattedPoints} 100,100 0,100`;

                  const currentHoverVal = hoverIndex !== null && points[hoverIndex] !== undefined ? points[hoverIndex] : points[points.length - 1];

                  return (
                    <div className="relative w-full h-full">
                      {/* Active Tooltip Display */}
                      <div className="absolute top-0 left-2 bg-slate-900 border border-slate-700 px-3 py-1 rounded-lg text-xs font-mono z-10 flex items-center gap-3">
                        <span className="text-slate-400">Inspected Price:</span>
                        <span className="text-white font-bold">₹{currentHoverVal.toLocaleString('en-IN')}</span>
                      </div>

                      <svg 
                        className="w-full h-full overflow-visible cursor-crosshair" 
                        viewBox="0 0 100 100" 
                        preserveAspectRatio="none"
                        onMouseLeave={() => setHoverIndex(null)}
                      >
                        <defs>
                          <linearGradient id="modalAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={isUp ? '#10b981' : '#f43f5e'} stopOpacity="0.4" />
                            <stop offset="100%" stopColor={isUp ? '#10b981' : '#f43f5e'} stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        <polygon points={areaPoints} fill="url(#modalAreaGrad)" />
                        <polyline
                          fill="none"
                          stroke={isUp ? '#10b981' : '#f43f5e'}
                          strokeWidth="2.5"
                          vectorEffect="non-scaling-stroke"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={formattedPoints}
                        />

                        {/* Interactive Hover Point Markers */}
                        {points.map((val, idx) => {
                          const x = (idx / (points.length - 1 || 1)) * 100;
                          const y = 90 - ((val - min) / range) * 80;
                          return (
                            <circle
                              key={idx}
                              cx={`${x}%`}
                              cy={`${y}%`}
                              r={hoverIndex === idx ? "5" : "3"}
                              className="fill-indigo-400 stroke-slate-950 transition-all hover:scale-150"
                              onMouseEnter={() => setHoverIndex(idx)}
                            />
                          );
                        })}
                      </svg>
                    </div>
                  );
                })()}
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>Start of {chartTimeframe} Window</span>
                <span>Current Market Snapshot</span>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Volume</span>
                <span className="text-sm font-semibold font-mono text-white">{selectedStock.volume.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Prev Close</span>
                <span className="text-sm font-semibold font-mono text-white">₹{selectedStock.prev_close}</span>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">52-Week High</span>
                <span className="text-sm font-semibold font-mono text-emerald-400">₹{selectedStock.high_52w}</span>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">52-Week Low</span>
                <span className="text-sm font-semibold font-mono text-rose-400">₹{selectedStock.low_52w}</span>
              </div>
            </div>

            {/* Session Audit Log */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Session Delta Audit Trail
              </span>
              {selectedStock.alerts.length > 0 ? (
                <div className="space-y-2">
                  {selectedStock.alerts.map((alert) => (
                    <div key={alert.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-semibold text-white block">{alert.label}</span>
                        <span className="text-slate-400">{alert.description}</span>
                      </div>
                      <span className="font-mono text-slate-500 text-[10px]">{alert.timestamp}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic bg-slate-950 p-3 rounded-xl border border-slate-800">
                  No structural alerts recorded for {selectedStock.ticker} during this active session.
                </p>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}