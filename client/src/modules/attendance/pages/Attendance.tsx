import React, { useState, useEffect } from "react";
import { Info } from "lucide-react";
import api from "../../../services/api";
import { useAuthStore } from "../../../store/authStore";

const Attendance: React.FC = () => {

  const { user } = useAuthStore();

  const DEMO_USER = "44444444-4444-4444-4444-444444444444";

  const params = new URLSearchParams(window.location.search);

  const userId =
    params.get("userId") ||
    (user?.id && user.id.length === 36 ? user.id : DEMO_USER);

  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [timer, setTimer] = useState("00:00:00");
  const [regularizeReason, setRegularizeReason] = useState("");

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();



  // FETCH TODAY
  const fetchToday = async () => {

    const { data } = await api.get("/attendance/today", {
      params: { userId }
    });

    setAttendance({
      status: data.status,
      checkInTime: data.checkIn || null
    });

  };



  // FETCH HISTORY
  const fetchHistory = async () => {

    const { data } = await api.get("/attendance/history", {
      params: { userId, month, year }
    });

    setHistory(data.items || []);

  };



  // FETCH SUMMARY
  const fetchSummary = async () => {

    const { data } = await api.get(`/attendance/summary/${userId}`, {
      params: { month, year }
    });

    setSummary(data);

  };



  // INITIAL LOAD
  useEffect(() => {

    const load = async () => {

      setLoading(true);

      await Promise.all([
        fetchToday(),
        fetchHistory(),
        fetchSummary()
      ]);

      setLoading(false);

    };

    load();

  }, [userId]);



  // TIMER
  useEffect(() => {

    let interval: any;

    if (attendance?.status === "IN" && attendance?.checkInTime) {

      interval = setInterval(() => {

        const start = new Date(attendance.checkInTime).getTime();
        const diff = Date.now() - start;

        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);

        setTimer(
          `${h.toString().padStart(2, "0")}:` +
          `${m.toString().padStart(2, "0")}:` +
          `${s.toString().padStart(2, "0")}`
        );

      }, 1000);

    }

    return () => clearInterval(interval);

  }, [attendance]);



  // CHECK IN / OUT
  const handleAttendance = async () => {

    if (!userId) return;

    if (attendance?.status === "IN") {

      await api.post("/attendance/check-out", { userId });

    } else {

      await api.post("/attendance/check-in", { userId });

    }

    await fetchToday();
    await fetchHistory();
    await fetchSummary();

  };



  // REGULARIZATION
  const submitRegularization = async () => {

    if (!regularizeReason) return;

    await api.post("/attendance/regularize", {
      userId,
      date: new Date().toISOString().slice(0,10),
      check_in_time: "09:00",
      check_out_time: "18:00",
      reason: regularizeReason
    });

    setRegularizeReason("");

    alert("Regularization request submitted");

  };



  // CALCULATE HOURS
  const calcHours = (inTime:string, outTime:string) => {

    const diff =
      new Date(outTime).getTime() -
      new Date(inTime).getTime();

    return (diff / 3600000).toFixed(1);

  };



  // BUILD CALENDAR
  const buildCalendar = () => {

  const days = new Date(year, month, 0).getDate();

  const records:any = {};

  history.forEach((rec:any)=>{

    const day = new Date(rec.check_in).getDate();

    records[day] = rec.status;

  });

  const calendar = [];

  for(let i=1;i<=days;i++){

    const date = new Date(year,month-1,i);

    const weekday = date.getDay();

    let status = "absent";

    if(records[i]){
      status = records[i];
    }

    if(weekday === 0 || weekday === 6){
      status = "weekend";
    }

    calendar.push({
      day:i,
      status
    });

  }

  return calendar;

};



  const calendarDays = buildCalendar();


const statusColor = (status:string)=>{

  const map:any = {

    present:"bg-emerald-400",

    half_day:"bg-amber-400",

    on_duty:"bg-indigo-400",

    absent:"bg-rose-400",

    weekend:"bg-slate-200"

  };

  return map[status] || "bg-slate-200";

};


  if (loading) {

    return (
      <div className="p-8 bg-slate-50 h-screen">
        Loading Attendance...
      </div>
    );

  }



  return (

    <div className="flex flex-col h-full bg-[#f4f7f9] font-sans overflow-hidden">

      {/* HEADER */}

      <div className="bg-[#1d2b4d] text-white px-6 h-[40px] flex items-center shadow-sm">

        <div className="font-bold text-[13px]">
          Attendance Summary
        </div>

      </div>



      <div className="p-6 space-y-4">

        {/* CHECK IN CARD */}

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 flex items-center justify-between">

          <span className="text-[13px] font-bold text-slate-800">
            General [ 9:00 AM - 6:00 PM ]
          </span>

          <button
            onClick={handleAttendance}
            disabled={attendance?.status === "COMPLETED"}
            className={`flex items-center space-x-3 px-6 py-2 rounded text-white font-bold text-[13px]
              ${
                attendance?.status === "IN"
                ? "bg-rose-500"
                : attendance?.status === "COMPLETED"
                ? "bg-slate-400"
                : "bg-[#00c853]"
              }`}
          >

            <span>
              {attendance?.status === "IN"
                ? "Check-out"
                : attendance?.status === "COMPLETED"
                ? "Done"
                : "Check-in"}
            </span>

            <span className="font-mono">{timer}</span>

            <div className="bg-white/20 p-1 rounded-full">
              <Info size={12}/>
            </div>

          </button>

        </div>



        {/* SUMMARY */}

        {summary && (

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 grid grid-cols-5 gap-4 text-center">

            <div>
              <p className="text-xs text-slate-400">Present</p>
              <p className="font-bold text-emerald-600">
                {summary.present_days}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400">Half Day</p>
              <p className="font-bold text-amber-600">
                {summary.half_days}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400">On Duty</p>
              <p className="font-bold text-indigo-600">
                {summary.on_duty_days}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400">Entries</p>
              <p className="font-bold text-blue-600">
                {summary.total_entries}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400">Avg Hours</p>
              <p className="font-bold text-sky-600">
                {summary.avg_hours || "-"}
              </p>
            </div>

          </div>

        )}



        {/* CALENDAR */}

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">

          <div className="flex justify-between mb-3">

            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Monthly Attendance
            </h3>

            <span className="text-xs text-slate-500">
              {new Date(year,month-1).toLocaleString("default",{month:"long"})}
            </span>

          </div>

          <div className="grid grid-cols-7 gap-2 text-center">

            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>(
              <div key={d} className="text-[10px] text-slate-400 font-bold">
                {d}
              </div>
            ))}

            {calendarDays.map((d:any)=>(
              <div
                key={d.day}
                className={`h-8 flex items-center justify-center rounded text-white text-xs font-bold ${statusColor(d.status)}`}
              >
                {d.day}
              </div>
            ))}

          </div>

        </div>



        {/* HISTORY */}

       <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">

  <table className="w-full text-sm text-slate-700">

    <thead className="bg-slate-50 border-b border-slate-200">

      <tr className="text-slate-500 text-xs uppercase tracking-wider">

        <th className="p-3 text-left">Date</th>
        <th className="p-3 text-left">Check In</th>
        <th className="p-3 text-left">Check Out</th>
        <th className="p-3 text-left">Hours</th>

      </tr>

    </thead>

    <tbody className="divide-y divide-slate-100">

      {history.map((rec) => (

        <tr
          key={rec.id}
          className="hover:bg-slate-50 transition-colors"
        >

          <td className="p-3 font-medium text-slate-800">
            {new Date(rec.check_in).toLocaleDateString()}
          </td>

          <td className="p-3 text-slate-700">
            {new Date(rec.check_in).toLocaleTimeString()}
          </td>

          <td className="p-3 text-slate-700">
            {rec.check_out
              ? new Date(rec.check_out).toLocaleTimeString()
              : "-"}
          </td>

          <td className="p-3 font-semibold text-blue-600">
            {rec.check_out
              ? calcHours(rec.check_in, rec.check_out)
              : "-"}
          </td>

        </tr>

      ))}

    </tbody>

  </table>

</div>


        {/* REGULARIZATION */}

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">

          <p className="text-sm font-bold mb-2">
            Attendance Regularization
          </p>

          <textarea
            value={regularizeReason}
            onChange={(e)=>setRegularizeReason(e.target.value)}
            placeholder="Explain why you missed check-in..."
            className="w-full border p-2 rounded"
          />

          <button
            onClick={submitRegularization}
            className="mt-2 bg-blue-600 text-white px-4 py-2 rounded text-sm"
          >
            Submit Request
          </button>

        </div>

      </div>

    </div>

  );

};

export default Attendance;