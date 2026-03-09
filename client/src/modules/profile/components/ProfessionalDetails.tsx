import React, { useState } from "react";

const ProfessionalDetails: React.FC = () => {

  const [editing, setEditing] = useState(false);

  const [data, setData] = useState({
    employeeId: "EMP1024",
    department: "Engineering",
    designation: "Software Engineer",
    manager: "Rahul Sharma",
    joiningDate: "12 Feb 2024"
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {

    setData({
      ...data,
      [e.target.name]: e.target.value
    });

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
          className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
        />

      ) : (

        <p className="text-sm font-medium text-slate-800 mt-1">
          {value}
        </p>

      )}

    </div>

  );

  return (

    <div className="space-y-6">

      <div className="flex justify-between items-center">

        <h3 className="text-[14px] font-bold text-slate-800">
          Professional Details
        </h3>

        <button
          onClick={() => setEditing(!editing)}
          className="text-[12px] bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded"
        >
          {editing ? "Save" : "Edit"}
        </button>

      </div>

      <div className="grid grid-cols-2 gap-6">

        {Object.entries(data).map(([key, value]) =>
          renderField(key, value)
        )}

      </div>

    </div>

  );

};

export default ProfessionalDetails;