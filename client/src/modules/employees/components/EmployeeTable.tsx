import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import debounce from 'lodash/debounce'; // assume lodash is installed

interface Employee {
    id: string;
    name: string;
    position: string;
    department: string;
}

const EmployeeTable: React.FC = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchEmployees = async (search: string, currentPage: number) => {
        setLoading(true);
        try {
            const { data } = await api.get('/employees', {
                params: {
                    search,
                    page: currentPage,
                    limit: 10,
                },
            });
            setEmployees(data.items);
            setTotalPages(data.totalPages);
        } catch (error) {
            console.error('Failed to fetch employees', error);
        } finally {
            setLoading(false);
        }
    };

    // Debounced search handler
    const debouncedSearch = useCallback(
        debounce((value: string) => {
            setPage(1); // Reset to first page on new search
            fetchEmployees(value, 1);
        }, 300),
        []
    );

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);
        debouncedSearch(value);
    };

    useEffect(() => {
        fetchEmployees(searchTerm, page);
    }, [page]);

    return (
        <div className="p-6">
            <div className="mb-4 flex justify-between items-center">
                <input
                    type="text"
                    placeholder="Search employees..."
                    className="border p-2 rounded w-64 focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={handleSearchChange}
                />
            </div>

            <div className="bg-white rounded shadow overflow-hidden">
                {loading ? (
                    <div className="p-10 text-center">Loading skeleton would go here...</div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {employees.map((emp) => (
                                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">{emp.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{emp.position}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{emp.department}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
                <span>Page {page} of {totalPages}</span>
                <div className="space-x-2">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage((p) => p - 1)}
                        className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <button
                        disabled={page === totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmployeeTable;
