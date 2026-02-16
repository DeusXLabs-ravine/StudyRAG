// Initialize Supabase client before loading app
require('./config/database');

const app = require('./app');
const { port, nodeEnv } = require('./config/env');

app.listen(port, () => {
  console.log(`StudyRAG Backend running on port ${port} [${nodeEnv}]`);
  console.log(`Database: Supabase (PostgreSQL)`);
});
