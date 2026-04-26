const https = require('https');

const url = 'https://wjygeunhqsnusraaehcg.supabase.co/auth/v1/health';

console.log('Testing connection to Supabase Auth Health...');

const req = https.get(url, (res) => {
  console.log('STATUS:', res.statusCode);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
}).on('error', (e) => {
  console.error('CONNECTION ERROR:', e.message);
  if (e.cause) console.error('CAUSE:', e.cause.message);
});

req.setTimeout(5000, () => {
  console.error('REQUEST TIMEOUT (5s)');
  req.destroy();
});
