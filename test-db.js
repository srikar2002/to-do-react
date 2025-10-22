const mongoose = require('mongoose');

// Test database connection
async function testConnection() {
  try {
    await mongoose.connect('mongodb://localhost:27017/todoapp');
    console.log('✅ Database connection successful!');
    console.log('✅ Database: todoapp');
    console.log('✅ Collections will be created automatically when you register/login');
    
    // Test creating a simple document
    const testSchema = new mongoose.Schema({
      test: String,
      timestamp: { type: Date, default: Date.now }
    });
    
    const TestModel = mongoose.model('Test', testSchema);
    const testDoc = new TestModel({ test: 'Connection test' });
    await testDoc.save();
    console.log('✅ Test document created successfully');
    
    // Clean up test document
    await TestModel.deleteOne({ _id: testDoc._id });
    console.log('✅ Test document cleaned up');
    
    await mongoose.disconnect();
    console.log('✅ Database connection closed');
    console.log('\n🎉 Database setup complete! You can now run your To-Do app.');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
