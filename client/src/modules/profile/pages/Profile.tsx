import React, { useState } from "react";
import { useAuthStore } from "../../../store/authStore";

import PersonalInfo from "../components/PersonalInfo";
import ProfessionalDetails from "../components/ProfessionalDetails";
import Documents from "../components/Documents";
import Assets from "../components/Assets";

const Profile: React.FC = () => {

  const { user } = useAuthStore();

  const [tab, setTab] = useState("Personal Info");

  const tabs = [
    "Personal Info",
    "Professional Details",
    "Documents",
    "Assets"
  ];

  return (

    <div className="space-y-6">

      {/* Profile Header */}

      <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm p-6 flex items-center space-x-5">

        <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-xl font-bold text-slate-600">

          {user?.name?.charAt(0)?.toUpperCase() || "U"}

        </div>

        <div>

          <h2 className="text-[16px] font-bold text-slate-800">
            {user?.name}
          </h2>

          <p className="text-[13px] text-slate-500">
            {user?.email}
          </p>

          <span className="text-[11px] bg-blue-50 text-blue-600 px-2 py-1 rounded font-semibold">
            {user?.role}
          </span>

        </div>

      </div>

      {/* Tabs */}

      <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm">

        <div className="border-b border-slate-100 flex space-x-8 px-6">

          {tabs.map((t) => (

            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-4 text-[13px] font-medium border-b-2 transition ${
                tab === t
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t}
            </button>

          ))}

        </div>

        <div className="p-6">

          {tab === "Personal Info" && <PersonalInfo />}
          {tab === "Professional Details" && <ProfessionalDetails />}
          {tab === "Documents" && <Documents />}
          {tab === "Assets" && <Assets />}

        </div>

      </div>

    </div>

  );

};

export default Profile;