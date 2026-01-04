const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const DATA_FILE = path.join(__dirname, '..', 'data', 'vouchers.json');

async function readVouchers() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    if (e && e.code === 'ENOENT') return [];
    throw e;
  }
}

async function writeVouchers(list) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(list, null, 2), 'utf8');
}

function computeStatus(v) {
  const now = new Date();
  const used = Number(v.so_luong_da_dung || 0);
  const total = Number(v.so_luong || 0);
  const start = v.ngay_bat_dau ? new Date(v.ngay_bat_dau) : null;
  const end = v.ngay_ket_thuc ? new Date(v.ngay_ket_thuc) : null;
  if (total > 0 && used >= total) return 'het_luong';
  if (end && end < now) return 'het_han';
  if (start && start > now) return 'tam_dung';
  return 'hoat_dong';
}

function normalize(body) {
  const ma = String(body.ma_voucher || '').toUpperCase().trim();
  const ten = String(body.ten_voucher || '').trim();
  const loai = String(body.loai_giam_gia || '').trim();
  const gt = Number(body.gia_tri_giam || 0);
  const sl = Number(body.so_luong || 0);
  if (!ma || !ten || !loai || !gt || !sl) throw new Error('Invalid voucher payload');
  if (!['phan_tram', 'tien_mat'].includes(loai)) throw new Error('Invalid loai_giam_gia');
  return {
    ma_voucher: ma,
    ten_voucher: ten,
    mo_ta: body.mo_ta ? String(body.mo_ta) : '',
    loai_giam_gia: loai,
    gia_tri_giam: gt,
    gia_tri_toi_thieu: Number(body.gia_tri_toi_thieu || 0),
    gia_tri_toi_da: Number(body.gia_tri_toi_da || 0),
    so_luong: sl,
    so_luong_da_dung: Number(body.so_luong_da_dung || 0),
    ngay_bat_dau: body.ngay_bat_dau || null,
    ngay_ket_thuc: body.ngay_ket_thuc || null,
  };
}

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const list = await readVouchers();
    const mapped = list.map((v) => ({ ...v, trang_thai: computeStatus(v) }));
    res.json({ vouchers: mapped });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch vouchers' });
  }
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const payload = normalize(req.body || {});
    const list = await readVouchers();
    if (list.some((v) => String(v.ma_voucher).toUpperCase() === payload.ma_voucher)) {
      return res.status(400).json({ message: 'Voucher code already exists' });
    }
    const created = { id: Date.now(), ...payload };
    created.trang_thai = computeStatus(created);
    list.push(created);
    await writeVouchers(list);
    res.status(201).json({ voucher: created });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Failed to create voucher' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const list = await readVouchers();
    const idx = list.findIndex((v) => String(v.id) === String(id));
    if (idx === -1) return res.status(404).json({ message: 'Voucher not found' });
    const merged = { ...list[idx], ...req.body };
    merged.ma_voucher = String(merged.ma_voucher || '').toUpperCase().trim();
    merged.gia_tri_giam = Number(merged.gia_tri_giam || 0);
    merged.gia_tri_toi_thieu = Number(merged.gia_tri_toi_thieu || 0);
    merged.gia_tri_toi_da = Number(merged.gia_tri_toi_da || 0);
    merged.so_luong = Number(merged.so_luong || 0);
    merged.so_luong_da_dung = Number(merged.so_luong_da_dung || 0);
    merged.trang_thai = computeStatus(merged);
    list[idx] = merged;
    await writeVouchers(list);
    res.json({ voucher: merged });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Failed to update voucher' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const list = await readVouchers();
    const next = list.filter((v) => String(v.id) !== String(id));
    await writeVouchers(next);
    res.json({ id });
  } catch (e) {
    res.status(500).json({ message: 'Failed to delete voucher' });
  }
});

router.get('/public', async (req, res) => {
  try {
    const list = await readVouchers();
    const active = list
      .map((v) => ({ ...v, trang_thai: computeStatus(v) }))
      .filter((v) => v.trang_thai === 'hoat_dong');
    res.json({ vouchers: active });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch vouchers' });
  }
});

router.post('/use', authenticateToken, async (req, res) => {
  try {
    const code = String(req.body?.code || '').toUpperCase().trim();
    if (!code) return res.status(400).json({ message: 'Missing voucher code' });
    const list = await readVouchers();
    const idx = list.findIndex((v) => String(v.ma_voucher).toUpperCase() === code);
    if (idx === -1) return res.status(404).json({ message: 'Voucher not found' });
    const v = list[idx];
    const status = computeStatus(v);
    if (status !== 'hoat_dong') return res.status(400).json({ message: 'Voucher is not active' });
    const used = Number(v.so_luong_da_dung || 0);
    const total = Number(v.so_luong || 0);
    if (total > 0 && used >= total) return res.status(400).json({ message: 'Voucher usage limit reached' });
    v.so_luong_da_dung = used + 1;
    v.trang_thai = computeStatus(v);
    list[idx] = v;
    await writeVouchers(list);
    res.json({ message: 'Voucher usage recorded', voucher: v });
  } catch (e) {
    res.status(500).json({ message: 'Failed to use voucher' });
  }
});

module.exports = router;
