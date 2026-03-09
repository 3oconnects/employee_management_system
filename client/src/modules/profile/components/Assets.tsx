import React, { useState } from "react";

const Assets: React.FC = () => {

  const [assets, setAssets] = useState([
    { name: "Laptop", model: "Dell Latitude 7420", status: "Active" }
  ]);

  const addAsset = () => {

    setAssets([
      ...assets,
      { name: "Asset Request", model: "Pending Approval", status: "Pending" }
    ]);

  };

  return (

    <div className="space-y-6">

      <div className="flex justify-between items-center">

        <h3 className="text-[14px] font-bold text-slate-800">
          Asset Management
        </h3>

        <button
          onClick={addAsset}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm"
        >
          Request Asset
        </button>

      </div>

      <div className="space-y-3">

        {assets.map((a, i) => (

          <div
            key={i}
            className="border border-slate-200 bg-white p-4 rounded flex justify-between items-center shadow-sm"
          >

            <div>

              <p className="font-semibold text-slate-800">
                {a.name}
              </p>

              <p className="text-xs text-slate-400">
                {a.model}
              </p>

            </div>

            <span className="text-xs px-3 py-1 rounded bg-green-100 text-green-600 font-semibold">
              {a.status}
            </span>

          </div>

        ))}

      </div>

    </div>

  );

};

export default Assets;