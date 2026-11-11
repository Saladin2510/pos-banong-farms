"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  KeyRound,
  Mail,
  Plus,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { EmployeeData } from "@/app/api/admin/employees/route";
import { formatDateTimeID } from "@/utils/format";

export const EmployeeManagementView: React.FC = () => {
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<"ALL" | "OWNER" | "CASHIER">("ALL");

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeData | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<EmployeeData | null>(null);

  // Form States
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<"OWNER" | "CASHIER">("CASHIER");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch employees on mount
  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/employees");
      const data = await res.json();
      if (data.employees) {
        setEmployees(data.employees);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (filterRole !== "ALL" && emp.role !== filterRole) return false;
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase().trim();
        return (
          emp.fullName.toLowerCase().includes(q) ||
          emp.email.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [employees, filterRole, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = employees.length;
    const owners = employees.filter((e) => e.role === "OWNER").length;
    const cashiers = employees.filter((e) => e.role === "CASHIER").length;
    return { total, owners, cashiers };
  }, [employees]);

  // Handle Add Employee Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError("Nama lengkap wajib diisi.");
      return;
    }
    if (!formEmail.trim()) {
      setFormError("Alamat email wajib diisi.");
      return;
    }
    if (!formPassword || formPassword.length < 6) {
      setFormError("Kata sandi minimal 6 karakter.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formName.trim(),
          email: formEmail.trim(),
          password: formPassword,
          role: formRole,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setFormError(data.error || "Gagal menambahkan akun karyawan.");
        return;
      }

      setIsAddModalOpen(false);
      setFormName("");
      setFormEmail("");
      setFormPassword("");
      setFormRole("CASHIER");
      fetchEmployees();
    } catch (err: any) {
      setFormError(err.message || "Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Employee Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    setFormError(null);
    if (!formName.trim()) {
      setFormError("Nama lengkap tidak boleh kosong.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingEmployee.id,
          fullName: formName.trim(),
          role: formRole,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setFormError(data.error || "Gagal memperbarui profil karyawan.");
        return;
      }

      setEditingEmployee(null);
      fetchEmployees();
    } catch (err: any) {
      setFormError(err.message || "Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Employee
  const handleDeleteConfirm = async () => {
    if (!deletingEmployee) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/employees?id=${deletingEmployee.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setDeletingEmployee(null);
        fetchEmployees();
      }
    } catch {
      // Ignore
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions Bar */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Manajemen Karyawan &amp; Hak Akses
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                {stats.total} Akun Staf
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Kelola akun staf kasir dan administrator pemilik toko untuk operasional CV Banong Farms.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormName("");
            setFormEmail("");
            setFormPassword("");
            setFormRole("CASHIER");
            setFormError(null);
            setIsAddModalOpen(true);
          }}
          className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm shadow-emerald-700/20 transition cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          <span>Tambah Karyawan Baru</span>
        </button>
      </div>

      {/* 2. Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Total Seluruh Staf</span>
            <div className="text-xl font-black text-slate-900 mt-0.5">{stats.total} Orang</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Administrator / Pemilik</span>
            <div className="text-xl font-black text-emerald-700 mt-0.5">{stats.owners} Akun</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Kasir Bertugas</span>
            <div className="text-xl font-black text-blue-700 mt-0.5">{stats.cashiers} Orang</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Search & Filters */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama karyawan atau alamat email staf..."
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as any)}
            className="px-3 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-bold text-slate-700 focus:outline-none focus:border-emerald-600 cursor-pointer"
          >
            <option value="ALL">Semua Jabatan / Role ({stats.total})</option>
            <option value="OWNER">Hanya Administrator / Pemilik ({stats.owners})</option>
            <option value="CASHIER">Hanya Kasir ({stats.cashiers})</option>
          </select>
        </div>
      </div>

      {/* 4. Employee List Cards */}
      {filteredEmployees.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-800">Tidak Ada Karyawan Ditemukan</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Coba periksa kembali kata kunci pencarian atau daftarkan staf baru.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((emp) => {
            const isOwner = emp.role === "OWNER";
            const initials = emp.fullName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <div
                key={emp.id}
                className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl font-black text-sm flex items-center justify-center shrink-0 ${
                          isOwner
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-blue-100 text-blue-800 border border-blue-300"
                        }`}
                      >
                        {initials || "ST"}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
                          {emp.fullName}
                        </h3>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[170px]">{emp.email}</span>
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 ${
                        isOwner
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-blue-600 text-white shadow-xs"
                      }`}
                    >
                      {isOwner ? "Admin" : "Kasir"}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Hak Akses:</span>
                      <strong className="text-slate-800">
                        {isOwner ? "Akses Penuh (Owner & Admin)" : "Kasir (POS & Transaksi)"}
                      </strong>
                    </div>
                    {emp.createdAt && (
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>Terdaftar:</span>
                        <span>{formatDateTimeID(emp.createdAt).split(",")[0]}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEmployee(emp);
                      setFormName(emp.fullName);
                      setFormRole(emp.role);
                      setFormError(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Ubah Role</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingEmployee(emp)}
                    className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                    title="Hapus Akun Karyawan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Modal Tambah Karyawan */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black text-slate-900">Tambah Karyawan / Staf</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Nama Lengkap Staf <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Dimas Pratama"
                  required
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Alamat Email Akun <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="Contoh: dimas@banongfarms.id"
                  required
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Kata Sandi Baru <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  required
                  minLength={6}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                  Jabatan / Hak Akses (Role)
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFormRole("CASHIER")}
                    className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer ${
                      formRole === "CASHIER"
                        ? "border-blue-600 bg-blue-50/60"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-blue-900">Kasir Toko</span>
                      {formRole === "CASHIER" && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Transaksi POS &amp; Katalog</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormRole("OWNER")}
                    className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer ${
                      formRole === "OWNER"
                        ? "border-emerald-600 bg-emerald-50/60"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-emerald-900">Admin / Pemilik</span>
                      {formRole === "OWNER" && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Akses Penuh Seluruh Toko</p>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Karyawan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal Edit Karyawan */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black text-slate-900">Ubah Data Karyawan</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingEmployee(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Alamat Email (Akun Tetap)
                </label>
                <input
                  type="email"
                  value={editingEmployee.email}
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-100 text-xs sm:text-sm font-semibold text-slate-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                  Jabatan / Hak Akses (Role)
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFormRole("CASHIER")}
                    className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer ${
                      formRole === "CASHIER"
                        ? "border-blue-600 bg-blue-50/60"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-blue-900">Kasir Toko</span>
                      {formRole === "CASHIER" && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormRole("OWNER")}
                    className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer ${
                      formRole === "OWNER"
                        ? "border-emerald-600 bg-emerald-50/60"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-emerald-900">Admin / Pemilik</span>
                      {formRole === "OWNER" && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      )}
                    </div>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Modal Konfirmasi Hapus */}
      {deletingEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">Hapus Akun Karyawan?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Akun <strong className="text-slate-800">{deletingEmployee.fullName}</strong> (
                {deletingEmployee.email}) akan dicabut aksesnya dari sistem kasir CV Banong Farms.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingEmployee(null)}
                className="py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-sm shadow-rose-600/20 transition cursor-pointer"
              >
                {isSubmitting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

