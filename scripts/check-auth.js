const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env file manually since we don't have dotenv installed
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envConfig[key.trim()] = value.trim();
    }
});

const supabaseUrl = envConfig['NEXT_PUBLIC_SUPABASE_URL'];
const serviceRoleKey = envConfig['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function checkAuth() {
    console.log('🔍 Checking Supabase Auth Configuration...');
    console.log(`URL: ${supabaseUrl}`);

    // Test admin user
    const adminEmail = 'admin@lib.com';
    const { data: adminExists, error: adminError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', adminEmail)
        .single();

    // Check auth.users table (requires service role)
    const { data: { users }, error: listUsersError } = await supabase.auth.admin.listUsers();

    if (listUsersError) {
        console.error('❌ Error listing users:', listUsersError.message);
    } else {
        console.log(`\n📋 Found ${users.length} users in Auth system:`);
        users.forEach(u => console.log(` - ${u.email} (ID: ${u.id}) [Confirmed: ${u.email_confirmed_at ? 'Yes' : 'No'}]`));
    }

    console.log('\n👤 Checking Profiles Table:');
    const { data: profiles, error: profileError } = await supabase.from('profiles').select('*');
    if (profileError) {
        console.error('❌ Error fetching profiles:', profileError.message);
    } else {
        console.log(`📋 Found ${profiles.length} profiles:`);
        profiles.forEach(p => console.log(` - ${p.email} (${p.role})`));
    }

    console.log('\n✅ Verification Complete');
}

checkAuth().catch(console.error);
