'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import Navbar from '@/components/Navbar';
import BackButton from '@/components/BackButton';
import PageHero from '@/components/PageHero';
import { GPU, GpuPriceStats, GpuPricePoint, PriceAlert, GpuReview, GpuReviewStats as GpuReviewStatsType } from '@/lib/types';
import {
  getGpuPriceHistory,
  getMultipleGpuPriceStats,
  getCurrentGpuPrices,
  getUserPriceAlerts,
  deletePriceAlert,
  getUser,
  signInWithGitHub,
  signInWithGoogle,
  signOut,
  setAuthReturnAction,
  getSingleGpuReviewStats,
  getGpuReviewStats,
} from '@/lib/supabase';
import PriceHistoryChart from '@/components/PriceHistoryChart';
import PriceTrendBadge from '@/components/PriceTrendBadge';
import PriceAlertModal from '@/components/PriceAlertModal';
import GpuReviewList from '@/components/GpuReviewList';
import GpuReviewForm from '@/components/GpuReviewForm';
import GpuReviewStats from '@/components/GpuReviewStats';
import ExternalLinks from '@/components/ExternalLinks';
import { User } from '@supabase/supabase-js';
import { getRetailerUrl } from '@/lib/affiliateLinks';

// Retailer display config
// Keys match the retailer column in Supabase gpu_prices table.
// url() delegates to affiliateLinks so every search link automatically carries
// the affiliate tag/code — no per-GPU configuration needed.
// Retailer display config — only retailers with active affiliate programs are shown.
// To re-enable Newegg: uncomment its block and set NEXT_PUBLIC_RAKUTEN_ID in .env
const RETAILER_CONFIG: Record<string, { name: string; color: string; url: (gpu: string) => string }> = {
  // Newegg: {                                      // ← re-enable when Rakuten ID is ready
  //   name: 'Newegg',
  //   color: 'text-orange-400',
  //   url: (gpu) => getRetailerUrl('Newegg', gpu),
  // },
  Amazon: {
    name: 'Amazon',
    color: 'text-yellow-400',
    url: (gpu) => getRetailerUrl('Amazon', gpu),
  },
  'Best Buy': {
    name: 'Best Buy',
    color: 'text-blue-400',
    // Best Buy has no affiliate program — plain link
    url: (gpu) => `https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(gpu)}`,
  },
  eBay: {
    name: 'eBay',
    color: 'text-red-400',
    url: (gpu) => getRetailerUrl('eBay', gpu),
  },
};

export default function GpuPricesPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  // Will find and update the outer div below

  const [gpus, setGpus] = useState<GPU[]>([]);
  const [priceStats, setPriceStats] = useState<Map<string, GpuPriceStats>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGpu, setSelectedGpu] = useState<string | null>(null);
  const [selectedGpuHistory, setSelectedGpuHistory] = useState<GpuPricePoint[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [alertModalGpu, setAlertModalGpu] = useState<string | null>(null);
  const [userAlerts, setUserAlerts] = useState<PriceAlert[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [vendorFilter, setVendorFilter] = useState<'all' | 'nvidia' | 'amd'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'trend'>('name');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [currentPrices, setCurrentPrices] = useState<Map<string, GpuPricePoint[]>>(new Map());

  // Reviews state
  const [selectedGpuReviewStats, setSelectedGpuReviewStats] = useState<GpuReviewStatsType | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState<GpuReview | null>(null);
  const [reviewRefreshKey, setReviewRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'prices' | 'reviews'>('prices');
  const [allReviewStats, setAllReviewStats] = useState<Map<string, GpuReviewStatsType>>(new Map());

  // Load GPUs and price data
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/data/gpus.json');
        const gpuData: GPU[] = await res.json();
        setGpus(gpuData);

        const gpuNames = gpuData.map(g => g.name);
        const [stats, prices, reviewStats] = await Promise.all([
          getMultipleGpuPriceStats(gpuNames),
          getCurrentGpuPrices(gpuNames),
          getGpuReviewStats(gpuNames),
        ]);
        setPriceStats(stats);
        setCurrentPrices(prices);
        setAllReviewStats(reviewStats);

        const currentUser = await getUser();
        setUser(currentUser);
        if (currentUser) {
          const alerts = await getUserPriceAlerts();
          setUserAlerts(alerts);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Load price history and review stats when GPU is selected
  useEffect(() => {
    async function loadHistory() {
      if (!selectedGpu) {
        setSelectedGpuHistory([]);
        setSelectedGpuReviewStats(null);
        return;
      }

      setLoadingHistory(true);
      try {
        const [history, reviewStats] = await Promise.all([
          getGpuPriceHistory(selectedGpu, 90),
          getSingleGpuReviewStats(selectedGpu),
        ]);
        setSelectedGpuHistory(history);
        setSelectedGpuReviewStats(reviewStats);
      } catch (error) {
        console.error('Error loading price history:', error);
      } finally {
        setLoadingHistory(false);
      }
    }

    loadHistory();
    setActiveTab('prices'); // Reset tab when GPU changes
  }, [selectedGpu]);

  // Refresh review stats when reviews change
  useEffect(() => {
    if (selectedGpu && reviewRefreshKey > 0) {
      getSingleGpuReviewStats(selectedGpu).then(setSelectedGpuReviewStats);
    }
  }, [reviewRefreshKey, selectedGpu]);

  // Get latest prices by retailer for selected GPU
  const retailerPrices = useMemo(() => {
    if (!selectedGpuHistory.length) return [];

    const latestByRetailer = new Map<string, GpuPricePoint>();
    for (const point of selectedGpuHistory) {
      const existing = latestByRetailer.get(point.retailer);
      if (!existing || new Date(point.scraped_at) > new Date(existing.scraped_at)) {
        latestByRetailer.set(point.retailer, point);
      }
    }

    return Array.from(latestByRetailer.values()).sort((a, b) => a.price_usd - b.price_usd);
  }, [selectedGpuHistory]);

  // Filter and sort GPUs
  const filteredGpus = useMemo(() => {
    const filtered = gpus.filter(gpu => {
      // Only show GPUs that have price data
      if (!priceStats.has(gpu.name) && !currentPrices.has(gpu.name)) {
        return false;
      }
      if (searchQuery && !gpu.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (vendorFilter !== 'all' && gpu.vendor !== vendorFilter) {
        return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'price') {
        const priceA = priceStats.get(a.name)?.current_price_usd ?? Infinity;
        const priceB = priceStats.get(b.name)?.current_price_usd ?? Infinity;
        return priceA - priceB;
      }
      if (sortBy === 'trend') {
        const trendOrder = { dropping: 0, stable: 1, rising: 2 };
        const trendA = priceStats.get(a.name)?.trend ?? 'stable';
        const trendB = priceStats.get(b.name)?.trend ?? 'stable';
        return trendOrder[trendA] - trendOrder[trendB];
      }
      return 0;
    });

    return filtered;
  }, [gpus, searchQuery, vendorFilter, sortBy, priceStats, currentPrices]);

  // Find deals
  const deals = useMemo(() => {
    return filteredGpus.filter(gpu => {
      const stats = priceStats.get(gpu.name);
      if (!stats?.current_price_usd || !stats?.avg_30d) return false;
      return stats.current_price_usd < stats.avg_30d * 0.95;
    });
  }, [filteredGpus, priceStats]);

  const handleDeleteAlert = async (alertId: string) => {
    const result = await deletePriceAlert(alertId);
    if (result.success) {
      setUserAlerts(prev => prev.filter(a => a.id !== alertId));
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setUserAlerts([]);
  };

  const selectedGpuStats = selectedGpu ? priceStats.get(selectedGpu) : null;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-950 bg-orange-950/40' : 'bg-gray-50 bg-orange-50/70'}`}>
      <Navbar />
      <BackButton />
      <PageHero
        title="GPU Prices"
        subtitle="Track GPU prices across retailers, set alerts, and read community reviews."
        accent="orange"
      />

      {/* Sub-header with page title + auth */}
      <div className={`border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              GPU Price Tracker
            </h1>
            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {(user.user_metadata?.avatar_url || user.user_metadata?.picture) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.user_metadata.avatar_url || user.user_metadata.picture}
                        alt=""
                        className="w-7 h-7 rounded-full"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium bg-blue-600 text-white">
                        {(user.user_metadata?.name || user.email || '?')[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleSignOut}
                    className={`text-xs px-2 py-1 rounded ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'} transition-colors`}
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Sign in
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Deals Section */}
          {deals.length > 0 && (
            <div className={`mb-8 p-6 rounded-2xl border ${
              isDark ? 'bg-green-900/20 border-green-800/50' : 'bg-green-50 border-green-200'
            }`}>
              <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <span>🔥</span> Hot Deals
                <span className={`text-sm font-normal ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  (Below 30-day average)
                </span>
              </h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {deals.slice(0, 6).map(gpu => {
                  const stats = priceStats.get(gpu.name);
                  const prices = currentPrices.get(gpu.name) || [];
                  const bestPrice = prices[0]; // Already sorted by price ascending
                  const savings = stats?.avg_30d && stats?.current_price_usd
                    ? Math.round(stats.avg_30d - stats.current_price_usd)
                    : 0;
                  const retailerConfig = bestPrice ? RETAILER_CONFIG[bestPrice.retailer] : null;

                  return (
                    <div
                      key={gpu.name}
                      className={`p-4 rounded-xl transition-all ${
                        isDark
                          ? 'bg-gray-800/50 border border-gray-700'
                          : 'bg-white border border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <button
                          onClick={() => setSelectedGpu(gpu.name)}
                          className={`font-medium text-left hover:underline ${isDark ? 'text-white' : 'text-gray-900'}`}
                        >
                          {gpu.name}
                        </button>
                        <div className="text-right">
                          <div className="text-green-400 text-sm font-medium">
                            Save ${savings}
                          </div>
                          {stats && <PriceTrendBadge trend={stats.trend} size="sm" />}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-green-400 font-semibold text-lg">
                          ${stats?.current_price_usd?.toLocaleString()}
                        </div>
                        {bestPrice && retailerConfig && (
                          <a
                            href={bestPrice.retailer_url || retailerConfig.url(gpu.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-sm flex items-center gap-1 ${retailerConfig.color} hover:underline`}
                          >
                            {retailerConfig.name}
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* User Alerts Section */}
          {user && userAlerts.length > 0 && (
            <div className={`mb-8 p-6 rounded-2xl border ${
              isDark ? 'bg-blue-900/20 border-blue-800/50' : 'bg-blue-50 border-blue-200'
            }`}>
              <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <span>🔔</span> Your Price Alerts
              </h2>
              <div className="space-y-2">
                {userAlerts.map(alert => {
                  const stats = priceStats.get(alert.gpu_name);
                  return (
                    <div
                      key={alert.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        isDark ? 'bg-gray-800/50' : 'bg-white'
                      }`}
                    >
                      <div>
                        <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {alert.gpu_name}
                        </div>
                        <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          Alert when {alert.alert_type === 'below' ? 'below' : alert.alert_type === 'above' ? 'above' : 'any change'}{' '}
                          {alert.alert_type !== 'any_change' && `$${alert.target_price_usd}`}
                          {stats?.current_price_usd && (
                            <span className="ml-2">(Current: ${stats.current_price_usd.toLocaleString()})</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteAlert(alert.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid gap-8 lg:grid-cols-3">
            {/* GPU List */}
            <div className="lg:col-span-1">
              <div className="mb-4 space-y-3">
                <input
                  type="text"
                  placeholder="Search GPUs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                <div className="flex gap-2">
                  <select
                    value={vendorFilter}
                    onChange={(e) => setVendorFilter(e.target.value as typeof vendorFilter)}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                      isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="all">All Vendors</option>
                    <option value="nvidia">NVIDIA</option>
                    <option value="amd">AMD</option>
                  </select>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                      isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="name">Sort by Name</option>
                    <option value="price">Sort by Price</option>
                    <option value="trend">Sort by Trend</option>
                  </select>
                </div>
              </div>

              <div className={`rounded-xl border overflow-hidden ${
                isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
              }`}>
                <div className="max-h-[600px] overflow-y-auto">
                  {filteredGpus.map(gpu => {
                    const stats = priceStats.get(gpu.name);
                    const isSelected = selectedGpu === gpu.name;
                    return (
                      <button
                        key={gpu.name}
                        onClick={() => setSelectedGpu(gpu.name)}
                        className={`w-full flex items-center justify-between p-4 text-left border-b transition-colors ${
                          isSelected
                            ? isDark ? 'bg-blue-900/30 border-blue-800' : 'bg-blue-50 border-blue-200'
                            : isDark ? 'border-gray-800 hover:bg-gray-800/50' : 'border-gray-100 hover:bg-gray-50'
                        }`}
                      >
                        <div>
                          <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {gpu.name}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              {gpu.vram_mb / 1024} GB
                            </span>
                            {allReviewStats.get(gpu.name) && allReviewStats.get(gpu.name)!.review_count > 0 && (
                              <span className={`text-xs flex items-center gap-0.5 ${isDark ? 'text-yellow-400/70' : 'text-yellow-500'}`}>
                                <span>★</span>
                                {allReviewStats.get(gpu.name)!.avg_rating.toFixed(1)}
                                <span className={`ml-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                  ({allReviewStats.get(gpu.name)!.review_count})
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {stats?.current_price_usd ? (
                            <>
                              <div className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                ${stats.current_price_usd.toLocaleString()}
                              </div>
                              <PriceTrendBadge trend={stats.trend} size="sm" />
                            </>
                          ) : (
                            <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                              No data
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* GPU Detail Panel */}
            <div className="lg:col-span-2">
              {selectedGpu ? (
                <div className={`rounded-2xl border p-6 ${
                  isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
                }`}>
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {selectedGpu}
                      </h2>
                      <div className="flex items-center gap-4 mt-2">
                        {selectedGpuStats && (
                          <div className="flex items-center gap-3">
                            <span className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              ${selectedGpuStats.current_price_usd?.toLocaleString() ?? 'N/A'}
                            </span>
                            <PriceTrendBadge trend={selectedGpuStats.trend} size="md" />
                          </div>
                        )}
                        {selectedGpuReviewStats && selectedGpuReviewStats.review_count > 0 && (
                          <button
                            onClick={() => setActiveTab('reviews')}
                            className={`flex items-center gap-1 text-sm ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                          >
                            <span className="text-yellow-400">{'★'.repeat(Math.round(selectedGpuReviewStats.avg_rating))}</span>
                            <span>{selectedGpuReviewStats.avg_rating.toFixed(1)} ({selectedGpuReviewStats.review_count} reviews)</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setAlertModalGpu(selectedGpu)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      Set Alert
                    </button>
                  </div>

                  {/* Tabs */}
                  <div className={`flex gap-1 p-1 rounded-lg mb-6 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <button
                      onClick={() => setActiveTab('prices')}
                      className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeTab === 'prices'
                          ? 'bg-blue-600 text-white'
                          : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Prices & History
                    </button>
                    <button
                      onClick={() => setActiveTab('reviews')}
                      className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeTab === 'reviews'
                          ? 'bg-blue-600 text-white'
                          : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Reviews {selectedGpuReviewStats && selectedGpuReviewStats.review_count > 0 && `(${selectedGpuReviewStats.review_count})`}
                    </button>
                  </div>

                  {/* Prices Tab */}
                  {activeTab === 'prices' && (
                    <>
                      {/* Prices by Retailer */}
                      {retailerPrices.length > 0 && (
                        <div className="mb-6">
                          <h3 className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Current Prices by Retailer
                          </h3>
                          <div className="grid gap-3 md:grid-cols-3">
                            {retailerPrices.map(price => {
                              const config = RETAILER_CONFIG[price.retailer];
                              return (
                                <a
                                  key={price.retailer}
                                  href={price.retailer_url || config?.url(selectedGpu)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`p-4 rounded-xl border transition-all hover:scale-[1.02] ${
                                    isDark
                                      ? 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className={`font-medium ${config?.color || (isDark ? 'text-white' : 'text-gray-900')}`}>
                                      {config?.name || price.retailer}
                                    </span>
                                    <svg className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                  </div>
                                  <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    ${price.price_usd.toLocaleString()}
                                  </div>
                                  <div className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    {price.in_stock ? '✓ In Stock' : '✗ Out of Stock'}
                                    {' • '}
                                    {new Date(price.scraped_at).toLocaleDateString()}
                                  </div>
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Price Stats */}
                      {selectedGpuStats && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                          <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Current</div>
                            <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              ${selectedGpuStats.current_price_usd?.toLocaleString() ?? 'N/A'}
                            </div>
                          </div>
                          <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>30-Day Avg</div>
                            <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              ${selectedGpuStats.avg_30d?.toLocaleString() ?? 'N/A'}
                            </div>
                          </div>
                          <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>30-Day Low</div>
                            <div className="text-xl font-bold text-green-400">
                              ${selectedGpuStats.min_30d?.toLocaleString() ?? 'N/A'}
                            </div>
                          </div>
                          <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>30-Day High</div>
                            <div className="text-xl font-bold text-red-400">
                              ${selectedGpuStats.max_30d?.toLocaleString() ?? 'N/A'}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Price Chart */}
                      <div className="mb-6">
                        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          Price History (90 days)
                        </h3>
                        {loadingHistory ? (
                          <div className="flex items-center justify-center py-20">
                            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                          </div>
                        ) : selectedGpuHistory.length > 1 ? (
                          <PriceHistoryChart
                            data={selectedGpuHistory}
                            trend={selectedGpuStats?.trend ?? 'stable'}
                            width={600}
                            height={250}
                            isDark={isDark}
                            showAxis={true}
                          />
                        ) : (
                          <div className={`py-16 text-center rounded-xl ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                            <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                              Not enough price data yet. Check back after a few days of tracking.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* External Links */}
                      {selectedGpu && (
                        <ExternalLinks
                          gpuName={selectedGpu}
                          vendor={gpus.find(g => g.name === selectedGpu)?.vendor || 'nvidia'}
                        />
                      )}
                    </>
                  )}

                  {/* Reviews Tab */}
                  {activeTab === 'reviews' && selectedGpu && (
                    <div className="space-y-6">
                      {/* Review Stats Summary */}
                      {selectedGpuReviewStats && selectedGpuReviewStats.review_count > 0 && (
                        <GpuReviewStats stats={selectedGpuReviewStats} />
                      )}

                      {/* Review List */}
                      <GpuReviewList
                        gpuName={selectedGpu}
                        onWriteReview={() => {
                          if (!user) {
                            setShowLoginModal(true);
                          } else {
                            setEditingReview(null);
                            setShowReviewForm(true);
                          }
                        }}
                        onEditReview={(review) => {
                          setEditingReview(review);
                          setShowReviewForm(true);
                        }}
                        onLoginRequired={() => setShowLoginModal(true)}
                        refreshKey={reviewRefreshKey}
                      />

                      {/* External Links */}
                      <ExternalLinks
                        gpuName={selectedGpu}
                        vendor={gpus.find(g => g.name === selectedGpu)?.vendor || 'nvidia'}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className={`rounded-2xl border p-12 text-center ${
                  isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
                }`}>
                  <svg className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Select a GPU
                  </h3>
                  <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                    Choose a GPU from the list to view price history, trends, and set alerts.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertModalGpu && (
        <PriceAlertModal
          gpuName={alertModalGpu}
          currentPrice={priceStats.get(alertModalGpu)?.current_price_usd ?? undefined}
          onClose={() => setAlertModalGpu(null)}
          onSuccess={() => {
            getUserPriceAlerts().then(setUserAlerts);
          }}
        />
      )}

      {/* Review Form Modal */}
      {showReviewForm && selectedGpu && (
        <GpuReviewForm
          gpuName={selectedGpu}
          existingReview={editingReview}
          onClose={() => {
            setShowReviewForm(false);
            setEditingReview(null);
          }}
          onSuccess={() => {
            setReviewRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => { setShowLoginModal(false); setLoginError(null); }}>
          <div className={`relative w-full max-w-sm rounded-2xl border shadow-2xl p-6 ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`} onClick={e => e.stopPropagation()}>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Sign in</h3>
            {loginError && (
              <p className="text-sm text-red-500 mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20">{loginError}</p>
            )}
            <div className="flex flex-col gap-3">
              <button onClick={async () => { setLoginError(null); setAuthReturnAction({ type: 'login' }); const res = await signInWithGitHub(); if (res?.error) setLoginError(res.error); else setShowLoginModal(false); }} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                Continue with GitHub
              </button>
              <button onClick={async () => { setLoginError(null); setAuthReturnAction({ type: 'login' }); const res = await signInWithGoogle(); if (res?.error) setLoginError(res.error); else setShowLoginModal(false); }} className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors border ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-white border-gray-600' : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'}`}>
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
