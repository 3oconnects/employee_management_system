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

  return (

    <div className="space-y-6">

      <div className="flex justify-between">

        <h3 className="text-[14px] font-bold text-slate-800">
          Professional Details
        </h3>

        <button
          onClick={() => setEditing(!editing)}
          className="text-[12px] bg-blue-600 text-white px-4 py-1 rounded"
        >
          {editing ? "Save" : "Edit"}
        </button>

      </div>

      <div className="grid grid-cols-2 gap-6">

        {Object.entries(data).map(([key, value]) => (

          <div key={key}>

            <label className="text-[11px] text-slate-400 capitalize">
              {key}
            </label>

            <input
              name={key}
              value={value}
              onChange={handleChange}
              disabled={!editing}
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
            />

          </div>

        ))}

      </div>

    </div>

  );

};

export default ProfessionalDetails;