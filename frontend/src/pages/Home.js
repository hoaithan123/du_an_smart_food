import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dishesAPI, recommendationsAPI, ordersAPI } from '../services/api';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import AdSlider from '../components/common/AdSlider';
import ComboShowcase from '../components/common/ComboShowcase';

const Home = () => {
  const [popularDishes, setPopularDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRecs, setTimeRecs] = useState([]);
  const [loadingTime, setLoadingTime] = useState(true);
  const [personalRecs, setPersonalRecs] = useState([]);
  const [loadingPersonal, setLoadingPersonal] = useState(false);
  const [smartRecs, setSmartRecs] = useState([]);
  const [loadingSmart, setLoadingSmart] = useState(false);
  const [favoriteRecs, setFavoriteRecs] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [communityTop, setCommunityTop] = useState([]);
  const [loadingCommunity, setLoadingCommunity] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [addingToCart, setAddingToCart] = useState({});
  const [now, setNow] = useState(new Date());
  const [activeRecTab, setActiveRecTab] = useState('time');

  const { addToCart, getTotalItems } = useCart();
  const { user, showNotification } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPopularDishes();
    fetchCategories();
    fetchTimeRecommendations();
    if (user) fetchPersonalRecommendations();
    if (user) fetchSmartRecommendations();
    if (user) fetchFavoritesFromOrders();
    fetchCommunityTopDishes();
  }, []);

  useEffect(() => {
    // If auth state changes, attempt to (re)load personal recs
    if (user) {
      fetchPersonalRecommendations();
      fetchSmartRecommendations();
      fetchFavoritesFromOrders();
    } else {
      setPersonalRecs([]);
      setSmartRecs([]);
      setFavoriteRecs([]);
    }
  }, [user]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hour = now.getHours();
  const timeStr = now.toLocaleTimeString('vi-VN', { hour12: false });
  const dateStr = now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  const greetingTitle = () => {
    if (hour >= 5 && hour < 11) return 'Chào buổi sáng';
    if (hour >= 11 && hour < 14) return 'Chào buổi trưa';
    if (hour >= 14 && hour < 18) return 'Chào buổi chiều';
    if (hour >= 18 && hour < 22) return 'Chào buổi tối';
    return 'Muộn rồi mà sao còn';
  };

  const fetchCommunityTopDishes = async () => {
    try {
      setLoadingCommunity(true);
      const res = await dishesAPI.getDishes({ limit: 100 });
      const items = res?.data?.dishes || res?.data || [];
      const filtered = (items || []).filter((d) => Number(d?.rating || 0) >= 4.7);
      const sorted = [...filtered].sort((a, b) => Number(b?.rating || 0) - Number(a?.rating || 0)).slice(0, 8);
      setCommunityTop(sorted);
    } catch (e) {
      setCommunityTop([]);
    } finally {
      setLoadingCommunity(false);
    }
  };

  const fetchFavoritesFromOrders = async () => {
    try {
      if (!user) return;
      setLoadingFavorites(true);
      const res = await ordersAPI.getMyOrders({ limit: 200 });
      const orders = res?.data?.orders || [];
      const freq = new Map();
      orders.forEach((o) => {
        const items = o?.items || o?.order_items || [];
        items.forEach((it) => {
          const id = it?.dish_id || it?.dish?.id || it?.id;
          if (!id) return;
          const qty = Number(it?.quantity || 1);
          const cur = freq.get(id) || { count: 0, dish: it?.dish || null };
          cur.count += Math.max(1, qty);
          if (!cur.dish && it?.dish) cur.dish = it.dish;
          freq.set(id, cur);
        });
      });
      const entries = Array.from(freq.entries())
        .filter(([, v]) => v.count >= 5)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 12);

      const results = [];
      for (const [id, v] of entries) {
        let dish = v.dish;
        if (!dish || !dish.name) {
          try {
            const dres = await dishesAPI.getDish(id);
            dish = dres?.data?.dish || dres?.data;
          } catch (_) { /* ignore */ }
        }
        if (dish) results.push({ ...dish, id, _freq: v.count });
      }

      const sorted = [...results].sort((a, b) => {
        const fa = a?._freq || 0, fb = b?._freq || 0;
        const ra = Number(a?.rating || 0), rb = Number(b?.rating || 0);
        if (fb !== fa) return fb - fa;
        return rb - ra;
      });
      setFavoriteRecs(sorted);
    } catch (e) {
      setFavoriteRecs([]);
    } finally {
      setLoadingFavorites(false);
    }
  };
  const greetingSubtitle = () => {
    if (hour >= 5 && hour < 11) return 'Chúc bạn một ngày mới tràn đầy năng lượng!';
    if (hour >= 11 && hour < 14) return 'Nạp năng lượng cho buổi chiều thật hiệu quả!';
    if (hour >= 14 && hour < 18) return 'Một chút đồ ăn nhẹ cho buổi chiều thêm hứng khởi.';
    if (hour >= 18 && hour < 22) return 'Thưởng thức bữa tối ấm áp bên người thân.';
    return 'Nhâm nhi chút gì đó rồi nghỉ ngơi thật ngon nhé!';
  };

  const isDay = hour >= 6 && hour < 18;
  const isNight = !isDay;
  const heroGradient = () => {
    if (isNight) return 'bg-gradient-to-b from-[#0a0a1a] via-[#0f0f2d] to-[#0a0a1a]';
    // Daytime: deep sky blue to light horizon, inspired by reference photo
    return 'bg-gradient-to-b from-[#2563eb] via-[#60a5fa] to-[#dbeafe]';
  };

  // Tạo 40 ngôi sao với vị trí ngẫu nhiên
  const stars = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 4
    }));
  }, []);

  const combineUniqueById = (arr1 = [], arr2 = []) => {
    const map = new Map();
    [...arr1, ...arr2].forEach((item) => {
      if (item && typeof item.id !== 'undefined') map.set(item.id, item);
    });
    return Array.from(map.values());
  };

  // Lightweight client-side preference to bias results by time of day
  const stripVN = (s = '') => `${s}`.normalize('NFD').replace(/\p{Diacritic}/gu, '');

  const getDishGroup = (dish) => {
    // 1) Prefer explicit backend fields
    const norm = (v) => stripVN(`${v || ''}`.trim().toLowerCase());
    const arr = (v) => Array.isArray(v) ? v.map(norm) : typeof v === 'string' ? norm(v).split(',').map((s) => s.trim()) : [];
    const g1 = norm(dish?.group || dish?.type);
    if (['dessert','tráng miệng'].includes(g1)) return 'dessert';
    if (['drink','do uong','beverage','do-uong','do_uong'].includes(g1)) return 'drink';
    if (['snack','an nhe','an-nhe','an_nhe'].includes(g1)) return 'snack';
    if (['main','mon chinh','entree','man','mon-chinh','mon_chinh'].includes(g1)) return 'main';

    const tags = new Set(arr(dish?.tags));
    const hasTag = (...cands) => cands.some((t) => tags.has(norm(t)));
    if (hasTag('dessert','tráng miệng')) return 'dessert';
    if (hasTag('drink','đồ uống','beverage')) return 'drink';
    if (hasTag('snack','ăn nhẹ')) return 'snack';
    if (hasTag('main','món chính')) return 'main';

    const cslug = norm(dish?.category?.slug);
    if (['dessert','trang-mieng','trang_mieng','trangmieng'].some((k) => cslug.includes(k))) return 'dessert';
    if (['drink','do-uong','do_uong','beverage','douong'].some((k) => cslug.includes(k))) return 'drink';
    if (['snack','an-nhe','an_nhe','annhe'].some((k) => cslug.includes(k))) return 'snack';
    if (['main','mon-chinh','mon_chinh','monchinh'].some((k) => cslug.includes(k))) return 'main';

    // 2) Fallback to name/description keywords
    const cname = norm(dish?.category?.name || dish?.category_name || '');
    const text = norm(`${dish?.name || ''} ${dish?.description || ''}`);
    const any = (arr2) => arr2.some((k) => cname.includes(norm(k)) || text.includes(norm(k)));
    // Desserts + snacks + drinks rich keywords
    const dessertKw = ['trang mieng','mon trang mieng','banh','banh flan','flan','pudding','yaourt','yogurt','che','che thai','che buoi','che dau','che khuc bach','kem','kem dua','kem tuoi','banh su','banh kem','banh plan','banh planh','banh ngot','banh cookie','cookie'];
    const drinkKw = ['thuc uong','do uong','nuoc','tra','tra sua','tra dao','tra tac','sinh to','smoothie','juice','nuoc ep','coffee','cafe','ca phe','espresso','latte','frappe','milk tea','tra chan trau','do giai khat','giai khat'];
    const snackKw = ['snack','an nhe','an vat','an-vat','an_vat','khaivi','khai vi','mon phu','mon-phu','mon_phu','side','khoai tay chien','ga vien','xuc xich','banh trang tron','banh trang','tokbokki','banh gao cay','ga ran snack'];
    const mainKw = ['com','bun','pho','mi','mien','banh mi','pizza','burger','ga ran','com tam','lau','nuong','steak','suon','thit','ca kho','bo bit tet'];
    if (any(dessertKw)) return 'dessert';
    if (any(drinkKw)) return 'drink';
    if (any(snackKw)) return 'snack';
    if (any(mainKw)) return 'main';
    return 'other';
  };

  const preferredGroupsForHour = (h) => {
    if (h >= 11 && h < 14) return ['main'];
    if (h >= 14 && h < 18) return ['dessert','drink','snack'];
    if (h >= 18 && h < 22) return ['main'];
    if (h >= 5 && h < 11) return ['main','drink'];
    return ['snack','drink'];
  };

  const groupLabel = (g) => ({
    dessert: 'Tráng miệng',
    drink: 'Đồ uống',
    snack: 'Ăn nhẹ',
    main: 'Món chính',
    other: 'Khác',
  }[g] || 'Khác');

  const groupBadgeClass = (g) => ({
    dessert: 'bg-pink-100 text-pink-700',
    drink: 'bg-blue-100 text-blue-700',
    snack: 'bg-yellow-100 text-yellow-800',
    main: 'bg-green-100 text-green-700',
    other: 'bg-gray-100 text-gray-700',
  }[g] || 'bg-gray-100 text-gray-700');

  // Interleave items by preferred groups to ensure variety (e.g., dessert/drink/snack)
  const interleaveByGroup = (items = [], groups = [], limit = 8) => {
    const buckets = new Map(groups.map((g) => [g, []]));
    items.forEach((it) => {
      const g = getDishGroup(it);
      if (buckets.has(g)) buckets.get(g).push(it);
    });
    const result = [];
    let idx = 0;
    while (result.length < limit) {
      let placed = false;
      for (let i = 0; i < groups.length; i++) {
        const g = groups[(idx + i) % groups.length];
        const list = buckets.get(g) || [];
        if (list.length > 0) {
          result.push(list.shift());
          placed = true;
          if (result.length >= limit) break;
        }
      }
      if (!placed) break; // no more items in any bucket
      idx++;
    }
    return result;
  };

  const scoreDishForHour = (h, dish) => {
    const text = `${dish?.name || ''} ${dish?.description || ''}`.toLowerCase();
    const any = (arr) => arr.some((k) => text.includes(k));
    // Keyword sets (can be refined to fit your menu)
    const desserts = ['tráng miệng', 'bánh', 'kem', 'chè', 'pudding', 'yaourt', 'yogurt', 'dessert', 'snack', 'ăn nhẹ', 'trà sữa', 'trà', 'nước ép', 'nước trái cây', 'sinh tố', 'smoothie', 'chè'];
    const mains = ['cơm', 'bún', 'phở', 'mì', 'miến', 'bánh mì', 'pizza', 'burger', 'gà rán', 'cơm tấm', 'lẩu', 'nướng', 'steak'];
    let score = 0;
    const group = getDishGroup(dish);
    const prefs = preferredGroupsForHour(h);
    if (prefs.includes(group)) score += 4;
    if (h >= 11 && h < 14) {
      // Lunch: favor mains
      if (any(mains)) score += 2;
      if (any(desserts)) score -= 1;
    } else if (h >= 14 && h < 18) {
      // Afternoon: favor desserts/snacks/drinks
      if (any(desserts)) score += 2;
      if (any(mains)) score -= 1;
    }
    return score;
  };

  const fetchPopularDishes = async () => {
    try {
      const response = await dishesAPI.getDishes({ limit: 50 });
      setPopularDishes(response.data.dishes);
    } catch (error) {
      console.error('Error fetching popular dishes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Feedback helpers
  const sendFeedback = async (dishId, type, { clicked = false, ordered = false } = {}) => {
    try {
      await recommendationsAPI.sendFeedback({ dish_id: dishId, recommendation_type: type, clicked, ordered });
    } catch (e) {
      // ignore
    }
  };

  const onCardClick = (dish, type) => {
    sendFeedback(dish.id, type, { clicked: true });
  };

  const buyNowFromRec = (dish, type) => {
    sendFeedback(dish.id, type, { ordered: true });
    handleBuyNow(dish);
  };

  const addToCartFromRec = (dish, type) => {
    sendFeedback(dish.id, type, { ordered: true });
    handleAddToCart(dish);
  };

  const fetchSmartRecommendations = async () => {
    try {
      if (!user) return;
      setLoadingSmart(true);
      const tzOffset = -new Date().getTimezoneOffset();
      const res = await recommendationsAPI.getSmart({ limit: 8, tzOffset });
      setSmartRecs(res.data.recommendations || []);
    } catch (e) {
      setSmartRecs([]);
    } finally {
      setLoadingSmart(false);
    }
  };

  const fetchTimeRecommendations = async () => {
    try {
      setLoadingTime(true);
      const tzOffset = -new Date().getTimezoneOffset();
      const res = await recommendationsAPI.getTimeBased({ limit: 8, hour, tzOffset });
      setTimeRecs(res.data.recommendations || []);
    } catch (e) {
      setTimeRecs([]);
    } finally {
      setLoadingTime(false);
    }
  };

  // Refetch time-based recommendations when the hour changes
  useEffect(() => {
    fetchTimeRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hour]);

  const fetchPersonalRecommendations = async () => {
    try {
      setLoadingPersonal(true);
      const res = await recommendationsAPI.getPersonal({ limit: 8 });
      setPersonalRecs(res.data.recommendations || []);
    } catch (e) {
      setPersonalRecs([]);
    } finally {
      setLoadingPersonal(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await dishesAPI.getCategories();
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const formatPrice = (price) => new Intl.NumberFormat('vi-VN').format(price) + 'đ';

  const handleAddToCart = async (dish) => {
    if (!user) {
      showNotification('Vui lòng đăng nhập để thêm món ăn vào giỏ hàng!', 'warning');
      navigate('/login');
      return;
    }

    setAddingToCart({ ...addingToCart, [dish.id]: true });
    
    try {
      addToCart(dish);
      showNotification(`Đã thêm ${dish.name} vào giỏ hàng! 🛒`, 'success');
    } catch (error) {
      showNotification('Có lỗi xảy ra khi thêm vào giỏ hàng!', 'error');
    } finally {
      setAddingToCart({ ...addingToCart, [dish.id]: false });
    }
  };

  const handleBuyNow = (dish) => {
    if (!user) {
      showNotification('Vui lòng đăng nhập để mua hàng!', 'warning');
      navigate('/login');
      return;
    }

    // Thêm vào giỏ hàng và chuyển đến trang thanh toán
    addToCart(dish);
    showNotification(`Đã thêm ${dish.name} vào giỏ hàng!`, 'success');
    navigate('/checkout');
  };

  const handleSearch = () => {
    if (searchTerm.trim()) {
      navigate(`/menu?search=${encodeURIComponent(searchTerm)}`);
    } else {
      navigate('/menu');
    }
  };

  const handleCategoryFilter = (categoryId) => {
    setSelectedCategory(categoryId);
    if (categoryId) {
      navigate(`/menu?category=${categoryId}`);
    } else {
      navigate('/menu');
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Hero Section */}
      <div className={`relative ${heroGradient()} text-white py-24 overflow-hidden`}>
        {isNight ? (
          <>
            {/* Night Sky Elements */}
            <div className="night-sky">
              {/* Moon with surrounding clouds */}
              <div className="absolute top-16 right-16 w-24 h-24 rounded-full bg-yellow-100 shadow-[0_0_50px_20px_rgba(255,255,200,0.25)] z-10"></div>
              
              {/* Soft clouds around moon */}
              <div className="absolute top-32 -right-4 w-32 h-16 bg-gradient-to-r from-white/60 to-white/20 rounded-full blur-[8px] opacity-90 z-0 animate-float-slow"></div>
              <div className="absolute top-40 right-16 w-36 h-14 bg-gradient-to-r from-white/50 to-white/10 rounded-full blur-[10px] opacity-80 z-0 animate-float-medium"></div>
              <div className="absolute top-44 right-40 w-40 h-16 bg-gradient-to-r from-white/40 to-white/5 rounded-full blur-[12px] opacity-70 z-0 animate-float-slow"></div>
              <div className="absolute top-36 right-24 w-20 h-10 bg-white/30 rounded-full blur-[15px] opacity-70 z-0 animate-float-fast"></div>
              
              {/* Stars */}
              {stars.map(star => (
                <div 
                  key={star.id}
                  className="star"
                  style={{
                    left: star.left,
                    top: star.top,
                    width: `${star.size}px`,
                    height: `${star.size}px`,
                    animationDelay: `${star.delay}s`,
                    animationDuration: `${star.duration}s`
                  }}
                />
              ))}
              
              {/* Night Clouds */}
              <div className="night-clouds">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className={`night-cloud night-cloud--${i+1}`} />
                ))}
              </div>
              
              {/* Forest Silhouette */}
              <div className="forest">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className={`tree tree${i+1}`}></div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Sun glow (reduced blur/opacity for sharp look) */}
            {/* Clouds layers */}
            <div className="absolute inset-0 z-20 pointer-events-none flex justify-end items-start p-2 md:p-4">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full sun" aria-hidden="true" />
            </div>
            <div className="day-sky absolute inset-0 z-0 pointer-events-none">
              <svg className="cloud-svg cloud-svg--1" viewBox="0 0 400 180" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
                <defs>
                  <linearGradient id="cloudGrad1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.98)"/>
                    <stop offset="100%" stopColor="rgba(255,255,255,0.86)"/>
                  </linearGradient>
                </defs>
                <g fill="url(#cloudGrad1)">
                  <path d="M40 120
                           Q80 70 130 100
                           Q160 50 210 85
                           Q260 55 300 95
                           Q360 110 330 140
                           L80 140
                           Q55 140 40 120Z"/>
                </g>
              </svg>
              <svg className="cloud-svg cloud-svg--2" viewBox="0 0 420 190" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
                <defs>
                  <linearGradient id="cloudGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.97)"/>
                    <stop offset="100%" stopColor="rgba(255,255,255,0.84)"/>
                  </linearGradient>
                </defs>
                <g fill="url(#cloudGrad2)">
                  <path d="M50 126
                           Q95 80 150 104
                           Q185 58 230 92
                           Q270 66 310 104
                           Q360 118 340 146
                           L90 150
                           Q65 148 50 126Z"/>
                </g>
              </svg>
              <svg className="cloud-svg cloud-svg--3" viewBox="0 0 380 170" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
                <defs>
                  <linearGradient id="cloudGrad3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.96)"/>
                    <stop offset="100%" stopColor="rgba(255,255,255,0.82)"/>
                  </linearGradient>
                </defs>
                <g fill="url(#cloudGrad3)">
                  <path d="M36 108
                           Q74 72 120 90
                           Q150 56 188 82
                           Q220 60 255 92
                           Q300 104 282 128
                           L86 132
                           Q58 130 36 108Z"/>
                </g>
              </svg>
              <svg className="cloud-svg cloud-svg--4" viewBox="0 0 340 160" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
                <defs>
                  <linearGradient id="cloudGrad4" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.98)"/>
                    <stop offset="100%" stopColor="rgba(255,255,255,0.86)"/>
                  </linearGradient>
                </defs>
                <g fill="url(#cloudGrad4)">
                  <path d="M28 104
                           Q66 72 110 86
                           Q140 56 172 78
                           Q198 64 224 88
                           Q260 98 246 120
                           L80 124
                           Q52 122 28 104Z"/>
                </g>
              </svg>
            </div>
            <div className="birds absolute inset-0 z-10 pointer-events-none" aria-hidden="true">
              <div className="bird bird--1" />
              <div className="bird bird--2" />
              <div className="bird bird--3" />
            </div>
          </>
        )}
        <div className="relative z-20 max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-8">
            <div className="text-left">
              <h1 className="text-5xl md:text-6xl font-extrabold mb-4 md:mb-6 drop-shadow">
                🍽️ SmartFood
              </h1>
              <p className="text-xl md:text-2xl mb-6 md:mb-8 font-light max-w-2xl">
                Hệ thống đặt đồ ăn thông minh với AI gợi ý cá nhân hóa
              </p>
            </div>
            <div className="mx-auto md:mx-0 w-full">
              <div className={`relative ${isNight ? 'bg-black/30' : 'bg-gradient-to-br from-white/55 to-white/20'} shadow-2xl ring-1 ${isNight ? 'ring-white/10' : 'ring-white/30'} rounded-3xl`}>
                <div className={`${isNight ? 'bg-black/30' : 'bg-white/15'} p-6 md:p-8 rounded-3xl`}>
                  <div className="flex flex-col md:flex-row gap-6 items-center">
                    <div className="w-full md:w-2/3 text-center md:text-left">
                      <div className="text-sm md:text-base text-white/70">{dateStr}</div>
                      <div className="text-3xl md:text-5xl font-extrabold tracking-tight drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">{greetingTitle()}</div>
                      <div className="text-white/80 mt-1 md:mt-2 text-sm md:text-base">{greetingSubtitle()}</div>
                    </div>
                    <div className="w-full md:w-1/3">
                      <div className={`relative z-20 ${isNight ? 'bg-white/10 border-white/20 backdrop-blur-sm' : 'bg-white/20 border-white/30'} border-2 shadow-xl rounded-2xl transition-all duration-300 hover:scale-[1.02] w-full px-4 py-3`}>
                        <div className="font-mono tabular-nums leading-none text-3xl md:text-4xl font-bold text-white text-center whitespace-nowrap">
                          {timeStr}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="w-full md:max-w-xl mt-10 mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm kiếm món ăn yêu thích..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full px-6 py-4 text-gray-900 rounded-full text-lg focus:outline-none focus:ring-4 focus:ring-white focus:ring-opacity-50 shadow-lg"
              />
              <button 
                onClick={handleSearch}
                className="absolute right-2 top-2 bg-accent text-white px-6 py-2 rounded-full hover:opacity-95 transition-colors"
              >
                🔍 Tìm kiếm
              </button>
            </div>
          </div>

          <div className="space-x-4">
            <Link to="/menu" className="bg-white text-accent px-8 py-4 rounded-full font-semibold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg">
              🍴 Xem Menu
            </Link>
            <Link to="/register" className="border-2 border-white text-white px-8 py-4 rounded-full font-semibold hover:bg-white hover:text-accent transition-all transform hover:scale-105">
              ✨ Đăng ký ngay
            </Link>
          </div>
        </div>
      </div>

      {/* Ad Slider */}
      <div className="py-8 bg-cream">
        <AdSlider />
      </div>

      {/* Unified Recommendations Section with Tabs */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8">Gợi ý món ăn</h2>

          <div className="flex justify-center gap-2 mb-8">
            <button
              onClick={() => setActiveRecTab('time')}
              className={`px-5 py-2 rounded-full text-sm font-semibold border ${activeRecTab === 'time' ? 'bg-accent text-white border-accent' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'}`}
            >
              Theo thời điểm
            </button>
            {user && (
              <button
                onClick={() => setActiveRecTab('personal')}
                className={`px-5 py-2 rounded-full text-sm font-semibold border ${activeRecTab === 'personal' ? 'bg-accent text-white border-accent' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'}`}
              >
                Cho bạn
              </button>
            )}
          </div>

          {/* Content */}
          {activeRecTab === 'time' && (
            <>
              {(() => {
                const isLoading = loadingTime;
                const toShow = timeRecs || [];
                const hasData = toShow.length > 0;
                if (isLoading) {
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      {[1,2,3,4].map((i) => (
                        <div key={i} className="bg-gray-200 rounded-2xl p-6 animate-pulse h-64"></div>
                      ))}
                    </div>
                  );
                }
                // Build pool strictly for time-of-day. If API empty, fallback to popular filtered by time groups.
                const prefs = preferredGroupsForHour(hour);
                const base = hasData ? toShow : (popularDishes || []);
                const pool = (base || []).filter((d) => prefs.includes(getDishGroup(d)));
                if (!pool || pool.length === 0) return <div className="text-center text-gray-500">Hiện chưa có món phù hợp cho khung giờ này.</div>;
                const mixed = interleaveByGroup(pool, prefs, 8);
                const sorted = [...mixed].sort((a, b) => scoreDishForHour(hour, b) - scoreDishForHour(hour, a));
                return (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {sorted.map((dish) => (
                      <div key={dish.id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-200 overflow-hidden hover:-translate-y-1 ring-1 ring-transparent hover:ring-orange-100">
                        <Link to={`/menu/${dish.id}`} onClick={() => onCardClick(dish, 'TIME_BASED')} className="block relative h-48 overflow-hidden bg-gray-100">
                          <img src={dish.image || ''} alt={dish.name} className="w-full h-full object-cover transform transition-transform duration-300 group-hover:scale-105"/>
                          {(() => { const g = getDishGroup(dish); return (
                            <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold shadow ${groupBadgeClass(g)}`}>
                              {groupLabel(g)}
                            </div>
                          ); })()}
                        </Link>
                        <div className="p-5">
                          <Link to={`/menu/${dish.id}`} onClick={() => onCardClick(dish, 'TIME_BASED')} className="font-semibold text-lg mb-1.5 text-gray-900 line-clamp-2 hover:text-accent">{dish.name}</Link>
                          {dish.description && (
                            <p className="text-gray-600 mb-4 text-sm line-clamp-2">{dish.description}</p>
                          )}
                          <div className="flex items-center justify-between mb-4">
                            <p className="text-accent font-bold text-xl">{formatPrice(Number(dish.price))}</p>
                            <div className="text-xs text-gray-500 whitespace-nowrap">⭐ {Number(dish.rating || 0).toFixed(1)}</div>
                          </div>
                          <div className="flex gap-2 items-stretch">
                            <button onClick={() => buyNowFromRec(dish, 'TIME_BASED')} className="flex-[1.7] h-11 inline-flex items-center justify-center gap-2 bg-accent text-white px-4 rounded-xl hover:opacity-95 transition-all text-sm font-semibold shadow">
                              <span>⚡</span>
                              <span>Mua ngay</span>
                            </button>
                            <button onClick={() => addToCartFromRec(dish, 'TIME_BASED')} className="w-14 h-11 inline-flex items-center justify-center bg-accent text-white px-0 rounded-xl hover:opacity-95 transition-colors text-sm font-medium shadow" aria-label="Thêm vào giỏ hàng" title="Thêm vào giỏ hàng">
                              <span>🛒</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </>
          )}

          {activeRecTab === 'personal' && user && (
            <>
              <div className="mb-10">
                <h3 className="text-2xl font-bold mb-4">Món bạn từng yêu thích</h3>
                {loadingFavorites ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[1,2,3,4].map((i) => (<div key={i} className="bg-gray-200 rounded-2xl p-6 animate-pulse h-64"></div>))}
                  </div>
                ) : favoriteRecs && favoriteRecs.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {favoriteRecs.map((dish) => (
                      <div key={dish.id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-200 overflow-hidden hover:-translate-y-1 ring-1 ring-transparent hover:ring-orange-100">
                        <Link to={`/menu/${dish.id}`} onClick={() => onCardClick(dish, 'FAVORITE_HISTORY')} className="block relative h-48 overflow-hidden bg-gray-100">
                          <img src={dish.image || ''} alt={dish.name} className="w-full h-full object-cover transform transition-transform duration-300 group-hover:scale-105"/>
                          <div className="absolute top-3 right-3 bg-accent/90 backdrop-blur text-white px-2.5 py-1 rounded-full text-xs font-semibold shadow">⭐ {Number(dish.rating || 0).toFixed(1)}</div>
                          <div className="absolute top-3 left-3 bg-white/90 text-gray-700 px-2.5 py-1 rounded-full text-xs font-semibold shadow">×{dish._freq || 1}</div>
                        </Link>
                        <div className="p-5">
                          <Link to={`/menu/${dish.id}`} onClick={() => onCardClick(dish, 'FAVORITE_HISTORY')} className="font-semibold text-lg mb-1.5 text-gray-900 line-clamp-2 hover:text-accent">{dish.name}</Link>
                          {dish.description && (<p className="text-gray-600 mb-4 text-sm line-clamp-2">{dish.description}</p>)}
                          <div className="flex items-center justify-between mb-4">
                            <p className="text-accent font-bold text-xl">{formatPrice(Number(dish.price))}</p>
                            <div className="text-xs text-gray-500 whitespace-nowrap">Đã đặt {dish._freq || 1} lần</div>
                          </div>
                          <div className="flex gap-2 items-stretch">
                            <button onClick={() => buyNowFromRec(dish, 'FAVORITE_HISTORY')} className="flex-[1.7] h-11 inline-flex items-center justify-center gap-2 bg-accent text-white px-4 rounded-xl hover:opacity-95 transition-all text-sm font-semibold shadow"><span>⚡</span><span>Mua lại</span></button>
                            <button onClick={() => addToCartFromRec(dish, 'FAVORITE_HISTORY')} className="w-14 h-11 inline-flex items-center justify-center bg-accent text-white px-0 rounded-xl hover:opacity-95 transition-colors text-sm font-medium shadow" aria-label="Thêm vào giỏ hàng" title="Thêm vào giỏ hàng"><span>🛒</span></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500">Chưa có đủ dữ liệu lịch sử đặt để gợi ý.</div>
                )}
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-4">Được cộng đồng đánh giá cao</h3>
                {loadingCommunity ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[1,2,3,4].map((i) => (<div key={i} className="bg-gray-200 rounded-2xl p-6 animate-pulse h-64"></div>))}
                  </div>
                ) : communityTop && communityTop.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {communityTop.map((dish) => (
                      <div key={dish.id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-200 overflow-hidden hover:-translate-y-1 ring-1 ring-transparent hover:ring-orange-100">
                        <Link to={`/menu/${dish.id}`} className="block relative h-48 overflow-hidden bg-gray-100">
                          <img src={dish.image || ''} alt={dish.name} className="w-full h-full object-cover transform transition-transform duration-300 group-hover:scale-105"/>
                          <div className="absolute top-3 right-3 bg-accent/90 backdrop-blur text-white px-2.5 py-1 rounded-full text-xs font-semibold shadow">⭐ {Number(dish.rating || 0).toFixed(1)}</div>
                        </Link>
                        <div className="p-5">
                          <Link to={`/menu/${dish.id}`} className="font-semibold text-lg mb-1.5 text-gray-900 line-clamp-2 hover:text-accent">{dish.name}</Link>
                          {dish.description && (<p className="text-gray-600 mb-4 text-sm line-clamp-2">{dish.description}</p>)}
                          <div className="flex items-center justify-between mb-4">
                            <p className="text-accent font-bold text-xl">{formatPrice(Number(dish.price))}</p>
                            <div className="text-xs text-gray-500 whitespace-nowrap">Đánh giá cao</div>
                          </div>
                          <div className="flex gap-2 items-stretch">
                            <button onClick={() => buyNowFromRec(dish, 'COMMUNITY_TOP')} className="flex-[1.7] h-11 inline-flex items-center justify-center gap-2 bg-accent text-white px-4 rounded-xl hover:opacity-95 transition-all text-sm font-semibold shadow"><span>⚡</span><span>Mua ngay</span></button>
                            <button onClick={() => addToCartFromRec(dish, 'COMMUNITY_TOP')} className="w-14 h-11 inline-flex items-center justify-center bg-accent text-white px-0 rounded-xl hover:opacity-95 transition-colors text-sm font-medium shadow" aria-label="Thêm vào giỏ hàng" title="Thêm vào giỏ hàng"><span>🛒</span></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500">Hiện chưa có dữ liệu đánh giá nổi bật.</div>
                )}
              </div>
            </>
          )}

          {/* 'smart' tab has been merged into 'time' */}
        </div>
      </div>

      {/* Combo Showcase */}
      <ComboShowcase />

      {/* Categories Section */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8">Danh mục món ăn</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => handleCategoryFilter('')}
              className={`px-6 py-3 rounded-full font-semibold transition-all ${
                selectedCategory === '' 
                  ? 'bg-accent text-white shadow-lg' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Tất cả
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryFilter(category.id)}
                className={`px-6 py-3 rounded-full font-semibold transition-all ${
                  selectedCategory === category.id 
                    ? 'bg-accent text-white shadow-lg' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-cream">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16 text-gray-800">Tính năng nổi bật</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2">
              <div className="text-6xl mb-6">🤖</div>
              <h3 className="text-2xl font-semibold mb-4 text-gray-800">AI Gợi ý thông minh</h3>
              <p className="text-gray-600 text-lg">
                Hệ thống AI phân tích sở thích và gợi ý món ăn phù hợp với từng cá nhân
              </p>
            </div>
            
            <div className="text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2">
              <div className="text-6xl mb-6">⚡</div>
              <h3 className="text-2xl font-semibold mb-4 text-gray-800">Đặt hàng nhanh</h3>
              <p className="text-gray-600 text-lg">
                Giao diện đơn giản, đặt hàng chỉ trong vài cú click với thanh toán an toàn
              </p>
            </div>
            
            <div className="text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2">
              <div className="text-6xl mb-6">📱</div>
              <h3 className="text-2xl font-semibold mb-4 text-gray-800">Theo dõi đơn hàng</h3>
              <p className="text-gray-600 text-lg">
                Theo dõi trạng thái đơn hàng real-time từ lúc đặt đến khi giao hàng
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Popular Dishes */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16 text-gray-800">Món ăn phổ biến</h2>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="bg-gray-200 rounded-2xl p-6 animate-pulse">
                  <div className="w-full h-48 bg-gray-300 rounded-xl mb-4"></div>
                  <div className="h-6 bg-gray-300 rounded mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded mb-2"></div>
                  <div className="h-6 bg-gray-300 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {popularDishes.map((dish) => (
                <div
                  key={dish.id}
                  className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-200 overflow-hidden hover:-translate-y-1 ring-1 ring-transparent hover:ring-orange-100"
                >
                  <Link to={`/menu/${dish.id}`} className="block relative h-48 overflow-hidden bg-gray-100">
                    <img
                      src={
                        dish.image ||
                        'data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"300\" height=\"200\"><rect width=\"100%\" height=\"100%\" fill=\"%23e5e7eb\"/><text x=\"50%\" y=\"50%\" dominant-baseline=\"middle\" text-anchor=\"middle\" fill=\"%239ca3af\" font-size=\"16\" font-family=\"Arial, Helvetica, sans-serif\">No Image</text></svg>'
                      }
                      alt={dish.name}
                      className="w-full h-full object-cover transform transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"300\" height=\"200\"><rect width=\"100%\" height=\"100%\" fill=\"%23e5e7eb\"/><text x=\"50%\" y=\"50%\" dominant-baseline=\"middle\" text-anchor=\"middle\" fill=\"%239ca3af\" font-size=\"16\" font-family=\"Arial, Helvetica, sans-serif\">No Image</text></svg>';
                      }}
                    />
                    <div className="absolute top-3 right-3 bg-accent/90 backdrop-blur text-white px-2.5 py-1 rounded-full text-xs font-semibold shadow">
                      ⭐ {dish.rating || '4.5'}
                    </div>
                  </Link>
                  <div className="p-5">
                    <Link to={`/menu/${dish.id}`} className="font-semibold text-lg mb-1.5 text-gray-900 line-clamp-2 hover:text-accent">{dish.name}</Link>
                    <p className="text-gray-600 mb-4 text-sm line-clamp-2">{dish.description}</p>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-accent font-bold text-xl">{formatPrice(dish.price)}</p>
                      <div className="text-xs text-gray-500 whitespace-nowrap">
                        📦 {dish.total_orders || 0} đơn đã bán
                      </div>
                    </div>
                    <div className="flex gap-2 items-stretch">
                      <button
                        onClick={() => handleBuyNow(dish)}
                        className="flex-[1.7] h-11 inline-flex items-center justify-center gap-2 bg-accent text-white px-4 rounded-xl hover:opacity-95 transition-all text-sm font-semibold shadow focus:outline-none"
                      >
                        <span>⚡</span>
                        <span>Mua ngay</span>
                      </button>
                      <button
                        onClick={() => handleAddToCart(dish)}
                        disabled={addingToCart[dish.id]}
                        className="w-14 h-11 inline-flex items-center justify-center bg-accent text-white px-0 rounded-xl hover:opacity-95 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm focus:outline-none"
                        aria-label="Thêm vào giỏ hàng"
                        title="Thêm vào giỏ hàng"
                      >
                        {addingToCart[dish.id] ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          </div>
                        ) : (
                          <span>🛒</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="text-center mt-12">
            <Link to="/menu" className="bg-accent text-white px-8 py-4 rounded-full font-semibold hover:opacity-95 transition-all transform hover:scale-105">
              Xem tất cả món ăn →
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-16 bg-gradient-to-r from-peach_from to-peach_to text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">1000+</div>
              <div className="text-lg opacity-90">Món ăn đa dạng</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50K+</div>
              <div className="text-lg opacity-90">Khách hàng tin tưởng</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">99%</div>
              <div className="text-lg opacity-90">Độ hài lòng</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-lg opacity-90">Hỗ trợ khách hàng</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;