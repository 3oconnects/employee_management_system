import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Mock Data
const stats = {
    totalEmployees: 1248,
    avgAttendance: 94,
    onLeave: 14,
    openPositions: 8
};

const employees = [
    { id: '1', name: 'John Doe', position: 'Senior Developer', department: 'Engineering' },
    { id: '2', name: 'Jane Smith', position: 'HR Manager', department: 'People Operations' },
    { id: '3', name: 'Mike Johnson', position: 'Product Designer', department: 'Design' },
];

// Routes
app.get('/api/v1/dashboard/stats', (req, res) => {
    res.json(stats);
});

app.get('/api/v1/attendance/today', (req, res) => {
    res.json({ status: 'OUT' });
});

app.get('/api/v1/employees', (req, res) => {
    const { search = '', page = 1, limit = 10 } = req.query;
    const filtered = employees.filter(e =>
        e.name.toLowerCase().includes(search.toString().toLowerCase())
    );
    res.json({
        items: filtered,
        totalPages: Math.ceil(filtered.length / Number(limit)),
        totalItems: filtered.length
    });
});

app.post('/api/v1/attendance/check-in', (req, res) => {
    res.json({ status: 'IN', checkInTime: new Date().toISOString() });
});

app.post('/api/v1/attendance/check-out', (req, res) => {
    res.json({ status: 'COMPLETED' });
});

app.post('/api/v1/leave/apply', (req, res) => {
    res.status(201).json({ message: 'Leave application submitted' });
});

app.post('/api/v1/payroll/generate', (req, res) => {
    setTimeout(() => {
        res.json({ message: 'Payroll generated' });
    }, 2000);
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
