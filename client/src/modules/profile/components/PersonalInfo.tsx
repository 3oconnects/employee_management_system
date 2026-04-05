import React, { useState, useEffect } from "react";
import { useAuthStore } from "../../../store/authStore";
import api from "../../../services/api";

const PersonalInfo: React.FC = () => {

  const { user, setAuth } = useAuthStore();

  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    emergency: ""
  });

  useEffect(() => {

    if (user) {
      setForm({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        address: user.address || "",
        emergency: user.emergency || ""
      });
    }

  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {

    setForm({
      ...form,
      [e.target.name]: e.target.value
    });

  };

  const handleSave = async () => {

    try {

      const { data } = await api.put("/users/profile", {
        id: user?.id,
        ...form
      });

      // Update the store with the updated user, preserving the current token
      setAuth(data.user, useAuthStore.getState().accessToken || '');

      alert("Profile updated successfully");

      setEditing(false);

    } catch (error: any) {

      alert(error.response?.data?.message || error.message || "Failed to update profile");

    }

  };

  const renderField = (key: string, value: string) => (

    <div>

      <label className="text-[11px] text-slate-400 capitalize">
        {key}
      </label>

      {editing ? (

        <input
          name={key}
          value={value}
          onChange={handleChange}
          className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />

      ) : (

        <p className="text-sm font-medium text-slate-800 mt-1">
          {value || "-"}
        </p>

      )}

    </div>

  );

  return (

    <div className="space-y-6">

      <div className="flex justify-between items-center">

        <h3 className="text-[14px] font-bold text-slate-800">
          Personal Information
        </h3>

        <button
          onClick={editing ? handleSave : () => setEditing(true)}
          className={`text-[12px] px-4 py-1.5 rounded font-semibold ${
            editing
              ? "bg-green-600 text-white"
              : "bg-blue-600 text-white"
          }`}
        >
          {editing ? "Save" : "Edit"}
        </button>

      </div>

      <div className="grid grid-cols-2 gap-6">

        {Object.entries(form).map(([key, value]) =>
          renderField(key, value)
        )}

      </div>

    </div>

  );

};

export default PersonalInfo;