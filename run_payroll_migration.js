const { Pool } = require('./node_modules/pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://postgres.dvdubzpxiiioshxsxmnd:careflow@2026@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  let client;
  try {
    client = await pool.connect();
    console.log('✅ Connected to Supabase PostgreSQL');
    
    const migrationPath = path.join(__dirname, 'platforms', 'migration.sql');
    if (!fs.existsSync(migrationPath)) {
      throw new Error('migration.sql not found at: ' + migrationPath);
    }
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log(`📄 Loaded migration file: ${sql.length} bytes`);
    
    console.log('🔄 Running payroll schema migration...');
    await client.query(sql);
    console.log('✅ Payroll schema migration completed successfully!');
    
    // Verify tables were created
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('staff_contracts', 'payroll_runs', 'payroll_records')
      ORDER BY table_name;
    `);
    
    console.log('\n📋 Payroll tables created in database:');
    tablesResult.rows.forEach(row => console.log('   -', row.table_name));
    
  } catch (err) {
    console.error('❌ Migration FAILED:', err.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    pool.end();
  }
}

runMigration();
