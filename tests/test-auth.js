async function testRegister() {
  const url = 'http://localhost:3000/api/auth/register';
  const payload = { email: `test+node${Date.now()}@example.com`, password: 'password123' };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'manual'
    });
    console.log('Status:', res.status);
    console.log('Headers:');
    for (const [k,v] of res.headers) console.log(k+':', v);
    const text = await res.text();
    console.log('Body:', text.slice(0, 500));
  } catch (err) {
    console.error('Request failed:', err);
  }
}

testRegister();
