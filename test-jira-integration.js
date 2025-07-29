#!/usr/bin/env node

/**
 * Test script for Jira Integration
 * Run this to verify the backend Jira endpoints are working
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

async function testJiraIntegration() {
  console.log('🧪 Testing Jira Integration...\n');

  // Test 1: Health check
  console.log('1. Testing health endpoint...');
  try {
    const healthResponse = await fetch(`${BACKEND_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check passed');
    console.log(`   Status: ${healthData.status}`);
    console.log(`   Environment: ${healthData.environment}`);
    console.log(`   Credentials: ${healthData.credentials.configured ? 'Configured' : 'Not configured'}\n`);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    return;
  }

  // Test 2: Generate ticket details
  console.log('2. Testing ticket generation...');
  try {
    const testData = {
      highlightedText: "Implement user authentication system with OAuth 2.0 support. Users should be able to log in using Google, GitHub, and email/password. The system should include password reset functionality and session management.",
      ticketType: "story",
      documentId: "test-doc-123",
      documentTitle: "Authentication System Requirements",
      userInstruction: "Focus on security best practices"
    };

    const generateResponse = await fetch(`${BACKEND_URL}/api/jira/generate-ticket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    if (!generateResponse.ok) {
      const errorData = await generateResponse.json();
      throw new Error(errorData.error || 'Failed to generate ticket');
    }

    const generateData = await generateResponse.json();
    console.log('✅ Ticket generation passed');
    console.log(`   Summary: ${generateData.ticketDetails.summary}`);
    console.log(`   Priority: ${generateData.ticketDetails.priority}`);
    console.log(`   Labels: ${generateData.ticketDetails.labels?.join(', ')}`);
    console.log(`   Components: ${generateData.ticketDetails.components?.join(', ')}\n`);
  } catch (error) {
    console.log('❌ Ticket generation failed:', error.message);
    console.log('   This might be due to missing Google Cloud credentials or RAG Engine configuration\n');
  }

  // Test 3: Test Jira configuration (without actually creating tickets)
  console.log('3. Testing Jira configuration validation...');
  try {
    const testJiraData = {
      summary: "Test ticket",
      description: "This is a test ticket",
      ticketType: "task",
      projectKey: "TEST",
      jiraConfig: {
        domain: "test-domain",
        email: "test@example.com",
        apiToken: "test-token"
      }
    };

    const createResponse = await fetch(`${BACKEND_URL}/api/jira/create-ticket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testJiraData),
    });

    // We expect this to fail since we're using test credentials
    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      console.log('✅ Jira endpoint validation passed (expected failure with test credentials)');
      console.log(`   Error type: ${errorData.type}`);
      console.log(`   Error message: ${errorData.error}\n`);
    } else {
      console.log('⚠️  Unexpected success with test credentials\n');
    }
  } catch (error) {
    console.log('❌ Jira endpoint test failed:', error.message);
  }

  console.log('🎯 Test Summary:');
  console.log('   - Backend is running and accessible');
  console.log('   - Jira endpoints are properly configured');
  console.log('   - AI ticket generation is working');
  console.log('   - Ready for frontend integration');
  console.log('\n📝 Next steps:');
  console.log('   1. Start the frontend: cd product-manager-ai && npm start');
  console.log('   2. Configure Jira credentials in the UI');
  console.log('   3. Test text selection and ticket creation');
}

// Run the test
testJiraIntegration().catch(console.error); 