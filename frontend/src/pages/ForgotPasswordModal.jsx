import React, { useState } from "react";
import axios from "axios";

const ForgotPasswordModal = ({ onClose }) => {
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetStatus, setResetStatus] = useState("");

  const handleForgotPassword = async () => {
    setResetStatus("");
    if (!resetIdentifier || !newPassword) {
      setResetStatus("NPM/Email dan Password Baru tidak boleh kosong.");
      return;
    }

    try {
      const isResetAdmin = resetIdentifier.includes("@");
      let apiUrl = "";
      let payload = {};

      if (isResetAdmin) {
        apiUrl = "http://localhost:5000/api/admin/reset-password";
        payload = { email: resetIdentifier.trim(), newPassword };
      } else {
        apiUrl = "http://localhost:5000/api/mahasiswa/reset-password";
        payload = { npm: resetIdentifier.trim(), newPassword };
      }

      const res = await axios.post(apiUrl, payload);

      if (res.data.success) {
        setResetStatus("Password berhasil direset!");
        setTimeout(() => onClose(), 2000); // Tutup modal setelah 2 detik
      } else {
        setResetStatus(res.data.message || "Gagal mereset password.");
      }
    } catch (err) {
      console.error("Error resetting password:", err);
      setResetStatus(
        err.response?.data?.message ||
          "Gagal mereset password. Pastikan NPM/Email benar."
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm">
        <h2 className="text-xl font-semibold mb-4">Reset Password</h2>
        <p className="text-sm text-gray-700 mb-4">
          Masukkan NPM/Email Anda dan password baru.
        </p>
        <input
          type="text"
          placeholder="NPM atau Email"
          value={resetIdentifier}
          onChange={(e) => setResetIdentifier(e.target.value)}
          className="w-full border p-2 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="password"
          placeholder="Password Baru"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full border p-2 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleForgotPassword}
          className="w-full py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
        >
          Reset Password
        </button>
        {resetStatus && (
          <div className="text-sm text-center mt-3 text-gray-600">
            {resetStatus}
          </div>
        )}
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
        >
          Batal
        </button>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
