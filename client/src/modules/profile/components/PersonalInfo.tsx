import React, { useState } from "react";
import { useAuthStore } from "../../../store/authStore";

const PersonalInfo: React.FC = () => {

  const { user } = useAuthStore();

  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    address: "",
    emergency: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {

    setForm({
      ...form,
      [e.target.name]: e.target.value
    });

  };

  const handleSave = () => {

    alert("Profile updated");

    setEditing(false);

  };

  return (

    <div className="space-y-6">

      <div className="flex justify-between">

        <h3 className="text-[14px] font-bold text-slate-800">
          Personal Information
        </h3>

        <button
          onClick={editing ? handleSave : () => setEditing(true)}
          className={`text-[12px] px-4 py-1 rounded ${
            editing
              ? "bg-green-600 text-white"
              : "bg-blue-600 text-white"
          }`}
        >
          {editing ? "Save" : "Edit"}
        </button>

      </div>

      <div className="grid grid-cols-2 gap-6">

        {Object.entries(form).map(([key, value]) => (

          <div key={key}>

            <label className="text-[11px] text-slate-400 capitalize">
              {key}
            </label>

            <input
              name={key}
              value={value}
              onChange={handleChange}
              disabled={!editing}
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />

          </div>

        ))}

      </div>

    </div>

  );

};

export default PersonalInfo;