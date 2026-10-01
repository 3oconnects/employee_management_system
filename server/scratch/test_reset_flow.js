async function test() {
  const loginRes = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@company.com', password: 'Admin@123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.accessToken;

  // Approve PR-1790780316683
  const approveRes = await fetch('http://localhost:4000/api/v1/approvals/std-PR-1790780316683/action', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify({ action: 'approve', type: 'password_reset' })
  });
  const approveData = await approveRes.json();
  console.log('Admin approval response:', approveData);

  // Check status as employee
  const statusRes = await fetch('http://localhost:4000/api/v1/auth/forgot-password/status?email=alex.rivers@company.com');
  const statusData = await statusRes.json();
  console.log('Employee status after approval:', statusData);

  // Now employee resets password
  const resetRes = await fetch('http://localhost:4000/api/v1/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'alex.rivers@company.com',
      newPassword: 'Admin@123'
    })
  });
  const resetData = await resetRes.json();
  console.log('Employee reset response:', resetData);
}

test().catch(err => console.error('Test error:', err));
