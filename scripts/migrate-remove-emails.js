const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateRemoveEmails() {
    console.log('🚀 Starting email removal migration...');

    const prayersRef = db.collection('prayers');
    const snapshot = await prayersRef.get();

    let updatedCount = 0;
    let batch = db.batch();
    let batchNumber = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();

        if (data && Object.prototype.hasOwnProperty.call(data, 'userEmail')) {
            batch.update(doc.ref, {
                userEmail: admin.firestore.FieldValue.delete()
            });
            updatedCount++;

            if (updatedCount % 500 === 0) {
                batchNumber++;
                console.log(`Committing batch ${batchNumber} (total removals: ${updatedCount})...`);
                await batch.commit();
                batch = db.batch();
            }
        }
    }

    if (updatedCount % 500 !== 0 && updatedCount > 0) {
        batchNumber++;
        console.log(`Committing final batch ${batchNumber} (total removals: ${updatedCount})...`);
        await batch.commit();
    } else if (updatedCount === 0) {
        console.log('No prayers contained a userEmail field. Nothing to update.');
    }

    console.log(`✅ Migration complete! Removed userEmail from ${updatedCount} prayer(s).`);
}

migrateRemoveEmails()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    });
