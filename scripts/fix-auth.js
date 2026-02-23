const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env file manually
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
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function fixAuth() {
    console.log('🔧 Starting Auth Repair...');

    // 1. Get all users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    console.log(`Found ${users.length} users.`);

    for (const user of users) {
        console.log(`\nProcessing user: ${user.email} (${user.id})`);

        // 2. Check/Create Profile
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

        if (!profile) {
            console.log('  ⚠️ Profile missing. Creating...');

            let role = 'student';
            let updates = {};

            if (user.email === 'admin@lib.com') {
                role = 'admin';
                updates = { full_name: 'Library Admin' };
            } else if (user.email === 'student@lib.com') {
                role = 'student';
                updates = {
                    full_name: 'Demo Student',
                    registered_number: 'STU001',
                    department_id: 'CSE'
                };
            }

            // First ensure departments exist if we need them
            if (updates.department_id) {
                await supabase.from('departments').upsert({ id: 'CSE', name: 'Computer Science' }).select();
            }

            const { error: insertError } = await supabase.from('profiles').insert({
                id: user.id,
                email: user.email,
                role: role,
                ...updates
            });

            if (insertError) console.error('  ❌ Failed to create profile:', insertError.message);
            else console.log('  ✅ Profile created.');
        } else {
            console.log('  ✅ Profile exists.');
        }

        // 3. Reset Password to ensure it matches
        console.log('  🔄 Resetting password...');
        const newPassword = user.email.startsWith('admin') ? 'admin@pass' : 'student@pass';
        const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
            password: newPassword,
            email_confirm: true
        });

        if (updateError) console.error('  ❌ Failed to update password:', updateError.message);
        else console.log(`  ✅ Password reset to '${newPassword}'`);
    }
}

fixAuth().catch(console.error);
