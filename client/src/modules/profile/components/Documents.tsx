import React, { useState } from "react";

const Documents: React.FC = () => {

  const [docs, setDocs] = useState<string[]>([]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {

    if (!e.target.files) return;

    const file = e.target.files[0];

    setDocs([...docs, file.name]);

  };

  return (

    <div className="space-y-6">

      <div className="flex justify-between">

        <h3 className="text-[14px] font-bold text-slate-800">
          Document Vault
        </h3>

        <input type="file" onChange={handleUpload} />

      </div>

      <div className="space-y-3">

        {docs.length === 0 && (
          <p className="text-sm text-slate-400">
            No documents uploaded
          </p>
        )}

        {docs.map((doc, i) => (

          <div
            key={i}
            className="border rounded p-3 flex justify-between"
          >

            <span>{doc}</span>

            <button className="text-red-500 text-sm">
              Delete
            </button>

          </div>

        ))}

      </div>

    </div>

  );

};

export default Documents;