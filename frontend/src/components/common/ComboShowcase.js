import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dishesAPI } from '../../services/api';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';

const currency = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n)) + 'đ';

const makeCombo = (main, drink, dessert, type = 'combo') => {
  const items = type === 'super' ? [main, drink, dessert] : [main, drink];
  const sum = items.reduce((s, it) => s + Number(it.price || 0), 0);
  const rate = type === 'super' ? 0.10 : 0.07; // Super 10%, Combo 7%
  let target = Math.round(sum * (1 - rate));
  // Không cho giá combo thấp hơn giá của món đơn đắt nhất
  const maxSingle = Math.max(...items.map(it => Number(it.price) || 0));
  if (target < maxSingle) target = maxSingle;
  // distribute
  const distributed = [];
  let acc = 0;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    let newUnit = Math.round(Number(it.price) * (1 - rate));
    if (i === items.length - 1) newUnit = Math.max(1, target - acc);
    acc += newUnit;
    distributed.push(newUnit);
  }
  const id = `combo-sugg-${main.id}-${drink.id}-${type === 'super' && dessert ? dessert.id : 'na'}`;
  const imgs = [main.image, drink.image];
  if (type === 'super') {
    imgs.push(dessert?.image || null);
  }
  return {
    id,
    name: type === 'super' ? `Super Combo: ${main.name}` : `Combo: ${main.name}`,
    type: 'combo',
    price: target,
    originalTotal: sum,
    images: imgs,
    subItems: [
      { id: main.id, name: main.name, price: distributed[0], original_price: Number(main.price), image: main.image },
      { id: drink.id, name: drink.name, price: distributed[1], original_price: Number(drink.price), image: drink.image },
      ...(type === 'super' && dessert ? [{ id: dessert.id, name: dessert.name, price: distributed[2], original_price: Number(dessert.price), image: dessert.image }] : [])
    ]
  };
};

const ComboCard = ({ combo, onBuy, onAdd }) => {
  const [img1, img2, img3] = combo.images;
  const discount = combo.originalTotal - combo.price;
  return (
    <div className="relative group bg-white rounded-2xl border border-gray-200 shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden hover:-translate-y-1 hover:border-accent">
      <div className="absolute inset-0 bg-gradient-to-r from-peach_from/0 via-peach_to/5 to-peach_from/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className={`relative ${img3 !== undefined ? 'h-44 grid grid-cols-3' : 'h-40 grid grid-cols-2'} bg-gray-100 gap-0`}> 
        <div className="overflow-hidden">
          {img1 ? <img src={img1} alt={combo.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/> : <div className="w-full h-full flex items-center justify-center text-gray-400">🍽️</div>}
        </div>
        <div className="overflow-hidden">
          {img2 ? <img src={img2} alt={combo.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/> : <div className="w-full h-full flex items-center justify-center text-gray-400">🥤</div>}
        </div>
        {img3 !== undefined && (
          <div className="overflow-hidden">
            {img3 ? <img src={img3} alt={combo.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/> : <div className="w-full h-full flex items-center justify-center text-gray-400">🍰</div>}
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span className="relative inline-flex items-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-40"></span>
            <span className="relative inline-flex rounded-full bg-accent text-white px-2.5 py-1 text-xs font-bold shadow">-{Math.round((discount / combo.originalTotal) * 100)}%</span>
          </span>
        </div>
      </div>
      <div className="p-5">
        <div className="font-extrabold text-lg mb-1.5 text-gray-900 line-clamp-1">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-peach_from to-peach_to">
            {combo.name}
          </span>
        </div>
        <div className="text-sm text-gray-600 line-clamp-2">
          {combo.subItems.map(s => s.name).join(' + ')}
        </div>
        <div className="mt-3 space-y-3">
          <div>
            <div className="text-accent font-extrabold text-xl animate-[pulse_2s_ease-in-out_infinite]">{currency(combo.price)}</div>
            <div className="text-xs text-gray-500 line-through">{currency(combo.originalTotal)}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => onAdd(combo)} className="h-10 w-full px-3 rounded-xl border border-accent text-accent hover:bg-accent/10 text-sm font-semibold">
              Thêm giỏ
            </button>
            <button onClick={() => onBuy(combo)} className="h-10 w-full px-4 rounded-xl bg-accent text-white hover:opacity-95 text-sm font-extrabold animate-bounce">
              Mua ngay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ComboShowcase = () => {
  const { addComboToCart } = useCart();
  const navigate = useNavigate();
  const { user, showNotification } = useAuth();
  const [mains, setMains] = useState([]);
  const [drinks, setDrinks] = useState([]);
  const [desserts, setDesserts] = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [mainRes, drinkRes, dessertRes] = await Promise.all([
          dishesAPI.getDishes({ limit: 12, sort: 'popular' }),
          dishesAPI.getDishes({ tags: 'drink', limit: 12 }),
          dishesAPI.getDishes({ tags: 'dessert', limit: 12 }),
        ]);
        setMains(mainRes?.data?.dishes || []);
        setDrinks(drinkRes?.data?.dishes || []);
        setDesserts(dessertRes?.data?.dishes || []);
      } catch (e) {
        // silent
      }
    };
    fetchAll();
  }, []);

  const { comboList, superList } = useMemo(() => {
    const result = { comboList: [], superList: [] };
    if (mains.length === 0 || drinks.length === 0) return result;
    // Build at least 4 combos and 2 super combos
    const comboCount = 4;
    const superCount = 2;
    for (let i = 0; i < comboCount; i++) {
      const main = mains[i % mains.length];
      const drink = drinks[(i + 1) % drinks.length];
      const dessert = desserts[(i + 2) % (desserts.length || 1)];
      result.comboList.push(makeCombo(main, drink, dessert, 'combo'));
    }
    for (let i = 0; i < superCount; i++) {
      const main = mains[(i + 2) % mains.length];
      const drink = drinks[(i + 3) % drinks.length];
      const dessert = desserts.length ? desserts[(i + 4) % desserts.length] : null;
      // Ensure super has a dessert even if fallback null image; price calc needs dessert object
      const dessertForPrice = dessert || mains[(i + 5) % mains.length];
      result.superList.push(makeCombo(main, drink, dessertForPrice, 'super'));
    }
    return result;
  }, [mains, drinks, desserts]);

  const onAdd = (combo) => {
    if (!user) {
      showNotification('Vui lòng đăng nhập để thêm combo vào giỏ hàng!', 'warning');
      navigate('/login');
      return;
    }
    addComboToCart(combo);
    showNotification('Đã thêm combo vào giỏ hàng', 'success');
  };
  const onBuy = (combo) => {
    if (!user) {
      showNotification('Vui lòng đăng nhập để mua hàng!', 'warning');
      navigate('/login');
      return;
    }
    addComboToCart(combo);
    showNotification('Đã thêm combo, chuyển tới thanh toán', 'success');
    navigate('/checkout');
  };

  if (comboList.length === 0) return null;

  return (
    <div className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-3xl font-extrabold text-center mb-8">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-peach_from to-peach_to">Combo nổi bật</span>
        </h2>
        {/* Combos */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Combo</h3>
            <div className="h-1 flex-1 ml-4 bg-gradient-to-r from-peach_from to-transparent rounded-full animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {comboList.map((c) => (
              <ComboCard key={c.id} combo={c} onBuy={onBuy} onAdd={onAdd} />
            ))}
          </div>
        </div>
        {/* Super Combos */}
        {superList.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Super Combo</h3>
              <div className="h-1 flex-1 ml-4 bg-gradient-to-r from-peach_to to-transparent rounded-full animate-pulse" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {superList.map((c) => (
                <ComboCard key={c.id} combo={c} onBuy={onBuy} onAdd={onAdd} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ComboShowcase;
