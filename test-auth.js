import PocketBase from 'pocketbase';

// Docker környezet URL-je
const pb = new PocketBase('http://localhost:8080');

async function testRegistration() {
  console.log('🧪 Regisztráció teszt kezdése...');
  
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'testpassword123',
    passwordConfirm: 'testpassword123',
    name: 'Test User'
  };
  
  try {
    const record = await pb.collection('users').create(testUser);
    console.log('✅ Regisztráció sikeres!');
    console.log(`   User ID: ${record.id}`);
    console.log(`   Email: ${record.email}`);
    console.log(`   Name: ${record.name}`);
    return testUser;
  } catch (error) {
    console.error('❌ Regisztráció hiba:');
    console.error('   Error:', error.message);
    if (error.data) {
      console.error('   Details:', JSON.stringify(error.data, null, 2));
    }
    throw error;
  }
}

async function testLogin(credentials) {
  console.log('\n🔑 Bejelentkezés teszt kezdése...');
  
  try {
    const authData = await pb.collection('users').authWithPassword(
      credentials.email,
      credentials.password
    );
    
    console.log('✅ Bejelentkezés sikeres!');
    console.log(`   Token létezik: ${!!authData.token}`);
    console.log(`   User ID: ${authData.record.id}`);
    console.log(`   Email: ${authData.record.email}`);
    console.log(`   Name: ${authData.record.name}`);
    
    // Ellenőrizzük, hogy be vagyunk-e jelentkezve
    const isValid = pb.authStore.isValid;
    console.log(`   Auth store valid: ${isValid}`);
    
    return authData;
  } catch (error) {
    console.error('❌ Bejelentkezés hiba:');
    console.error('   Error:', error.message);
    if (error.data) {
      console.error('   Details:', JSON.stringify(error.data, null, 2));
    }
    throw error;
  }
}

async function testLogout() {
  console.log('\n🚪 Kijelentkezés teszt kezdése...');
  
  try {
    pb.authStore.clear();
    console.log('✅ Kijelentkezés sikeres!');
    console.log(`   Auth store valid: ${pb.authStore.isValid}`);
  } catch (error) {
    console.error('❌ Kijelentkezés hiba:', error.message);
    throw error;
  }
}

async function testBackendConnection() {
  console.log('🌐 Backend kapcsolat tesztelése...');
  
  try {
    const healthCheck = await fetch('http://localhost:8080/api/health');
    const response = await healthCheck.json();
    
    if (response.code === 200) {
      console.log('✅ Backend elérhető!');
      console.log(`   Message: ${response.message}`);
    } else {
      console.log('⚠️  Backend válaszolt, de nem OK státusszal');
      console.log('   Response:', response);
    }
  } catch (error) {
    console.error('❌ Backend nem elérhető:', error.message);
    throw error;
  }
}

async function testUserDeletion(testUser) {
  console.log('\n🗑️  Felhasználó törlés teszt kezdése...');
  
  try {
    // Ellenőrizzük, hogy be vagyunk-e jelentkezve
    if (!pb.authStore.isValid) {
      console.log('   Bejelentkezés a törléshez...');
      await pb.collection('users').authWithPassword(testUser.email, testUser.password);
    }
    
    const userId = pb.authStore.model.id;
    console.log(`   Törlendő User ID: ${userId}`);
    
    // Felhasználó törlése
    await pb.collection('users').delete(userId);
    
    console.log('✅ Felhasználó törlés sikeres!');
    console.log(`   Törölt User ID: ${userId}`);
    
    // Auth store tisztítása
    pb.authStore.clear();
    console.log('   Auth store tisztítva');
    
    return true;
  } catch (error) {
    console.error('❌ Felhasználó törlés sikertelen!');
    console.error(`   Hiba: ${error.message}`);
    if (error.data) {
      console.error('   Details:', JSON.stringify(error.data, null, 2));
    }
    throw error;
  }
}

async function runTests() {
  console.log('🚀 Zengineer Auth Teszt Suit indítása\\n');
  
  try {
    // 1. Backend kapcsolat teszt
    await testBackendConnection();
    
    // 2. Regisztráció teszt
    const testUser = await testRegistration();
    
    // 3. Bejelentkezés teszt
    await testLogin(testUser);
    
    // 4. Kijelentkezés teszt
    await testLogout();
    
    // 5. Újra bejelentkezés teszt
    await testLogin(testUser);
    
    // 6. Felhasználó törlés teszt
    await testUserDeletion(testUser);
    
    console.log('\n🎉 Minden teszt sikeres!');
    console.log('\n📝 Összefoglaló:');
    console.log('   ✅ Backend elérhető');
    console.log('   ✅ Regisztráció működik');
    console.log('   ✅ Bejelentkezés működik');
    console.log('   ✅ Kijelentkezés működik');
    console.log('   ✅ Újra bejelentkezés működik');
    console.log('   ✅ Felhasználó törlés működik');
    
  } catch (error) {
    console.log('\n💥 Teszt hibával fejeződött be!');
    process.exit(1);
  }
}

// Teszt futtatása
runTests();
