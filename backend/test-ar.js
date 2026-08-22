async function test() {
  try {
    const creds = [
      { email: 'admin@erp.com', password: 'password123' },
      { email: 'admin@erp.com', password: 'password' },
      { email: 'admin@erp.com', password: '123456' }
    ];

    let token = null;
    let user = null;

    for (const c of creds) {
      const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(c)
      });
      if (res.ok) {
        const data = await res.json();
        token = data.token;
        user = data.user;
        console.log('Login successful with', c.password);
        break;
      }
    }

    if (!token) {
      console.log('Failed to login');
      return;
    }

    console.log('User details:', user);

    const arRes = await fetch('http://localhost:3000/api/accounts-receivable', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('AR GET Status:', arRes.status);
    if (!arRes.ok) {
      console.log('Error data:', await arRes.text());
    } else {
      console.log('Data:', await arRes.json());
    }
  } catch (error) {
    console.error('Network Error:', error);
  }
}

test();
