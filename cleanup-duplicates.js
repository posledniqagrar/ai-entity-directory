const { initializeDatabase, getDb } = require('./database');

async function removeDuplicates() {
    await initializeDatabase();
    const db = getDb();
    
    // Find duplicates
    const duplicates = await db.all(`
        SELECT name, COUNT(*) as count, MIN(id) as keep_id
        FROM services 
        GROUP BY name 
        HAVING count > 1
    `);
    
    if (duplicates.length === 0) {
        console.log('✅ No duplicate services found!');
        process.exit(0);
    }
    
    console.log(`Found ${duplicates.length} duplicate service names:`);
    duplicates.forEach(d => {
        console.log(`  - ${d.name}: ${d.count} copies`);
    });
    
    // Delete duplicates
    for (const dup of duplicates) {
        await db.run(`
            DELETE FROM services 
            WHERE name = ? AND id != ?
        `, [dup.name, dup.keep_id]);
    }
    
    // Verify
    const finalCount = await db.get('SELECT COUNT(*) as total FROM services');
    console.log(`\n✅ Cleanup complete!`);
    console.log(`📊 Total services now: ${finalCount.total}`);
    
    process.exit(0);
}

removeDuplicates().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});