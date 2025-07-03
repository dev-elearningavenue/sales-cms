/**
 * Test Script for WordPress Integration
 * 
 * This script demonstrates how the WordPress data gets transformed
 * and sent to our Orders API
 */

const WORDPRESS_ORDER_DATA = {
  user_data: {
    user_email: 'support@freeoshacourses.com',
    display_name: 'Farhan Siraj'
  },
  order_data: {
    first_name: 'Mustafa',
    last_name: 'Ahmed',
    company: '',
    address_1: 'Gulshan Iqbal',
    address_2: '',
    city: 'New York City',
    state: 'SD',
    postcode: '10001',
    country: 'PK',
    email: 'support@freeoshacourses.com',
    phone: '+92 332 8444028',
    id: 1551,
    items: [
      {
        name: "OSHA 30-Hour Construction Safety Course",
        quantity: 1,
        price: 199.99,
        product_id: 123
      }
    ],
    type: 'Yourself',
    domain: 'oshapractice.com',
    total_amount: 199.99,
    payment_status: 'completed',
    payment_method: 'credit_card',
    transaction_id: 'txn_1234567890'
  }
};

// Function to test the API
async function testWordPressIntegration() {
  try {
    console.log('🚀 Testing WordPress Integration...\n');
    
    const response = await fetch('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(WORDPRESS_ORDER_DATA)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Success! Order and Lead created:');
      console.log('📄 Order ID:', result.data.order._id);
      console.log('🎯 Lead ID:', result.data.lead._id);
      console.log('🏢 Domain:', result.data.order.domain);
      console.log('👤 Customer:', `${result.data.order.firstName} ${result.data.order.lastName}`);
      console.log('💰 Total Amount:', result.data.order.total_amount);
      console.log('📧 Email:', result.data.order.email);
    } else {
      console.log('❌ Error:', result);
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

// For Node.js testing (uncomment if running with node)
// testWordPressIntegration();

console.log(`
📋 WORDPRESS DATA TRANSFORMATION SUMMARY
========================================

INPUT (WordPress Format):
- Nested structure with user_data and order_data
- WordPress-specific field names (first_name, last_name)
- WordPress domain (oshapractice.com)

OUTPUT (Our System Format):
- Flat structure with organized sections
- Standardized field names (firstName, lastName)
- Domain codes (OOC, OOR, OES)
- Calculated totals from items
- Payment information
- Source tracking

🔄 DOMAIN MAPPING:
- oshapractice.com → OOC
- oshaoutreach.com → OOR  
- oshaeducationschool.com → OES
- freeoshacourses.com → OOC (default)

💡 WHAT HAPPENS:
1. WordPress sends order data to /api/orders
2. API detects WordPress format (user_data + order_data)
3. Data gets transformed using transformWordPressData()
4. createOrder() creates ORDER in paidorders collection
5. createOrder() creates LEAD in leads collection with "Order Creation" category
6. Notifications are sent to users
7. Both Order and Lead data are returned

🧪 TO TEST:
- Use the testWordPressIntegration() function above
- Or send POST request to /api/orders with WordPress data
- Check logs for transformation details
`);

module.exports = { WORDPRESS_ORDER_DATA, testWordPressIntegration }; 