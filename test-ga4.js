#!/usr/bin/env node

/**
 * Quick GA4 Setup Verification Script
 * Run: node test-ga4.js
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 Checking GA4 Setup...\n');

// Check 1: Environment variable
const envLocal = path.join(process.cwd(), '.env.local');
let hasEnvVar = false;
let measurementId = null;

if (fs.existsSync(envLocal)) {
  const envContent = fs.readFileSync(envLocal, 'utf8');
  const match = envContent.match(/NEXT_PUBLIC_GA4_MEASUREMENT_ID=(.+)/);
  if (match) {
    hasEnvVar = true;
    measurementId = match[1].trim();
  }
}

console.log('1. Environment Variable:');
if (hasEnvVar && measurementId) {
  console.log(`   ✅ NEXT_PUBLIC_GA4_MEASUREMENT_ID is set: ${measurementId}`);
  if (measurementId.startsWith('G-')) {
    console.log('   ✅ Format looks correct (G-XXXXXXXXXX)');
  } else {
    console.log('   ⚠️  Warning: Should start with "G-"');
  }
} else {
  console.log('   ❌ NEXT_PUBLIC_GA4_MEASUREMENT_ID not found in .env.local');
}

// Check 2: GA4 Component exists
const gtmFile = path.join(process.cwd(), 'src/components/gtm.tsx');
const hasGtmFile = fs.existsSync(gtmFile);
console.log('\n2. GA4 Component:');
if (hasGtmFile) {
  const content = fs.readFileSync(gtmFile, 'utf8');
  if (content.includes('GoogleAnalytics')) {
    console.log('   ✅ src/components/gtm.tsx exists and uses GoogleAnalytics');
  } else {
    console.log('   ⚠️  File exists but may not be using GoogleAnalytics');
  }
} else {
  console.log('   ❌ src/components/gtm.tsx not found');
}

// Check 3: Analytics utilities
const analyticsFile = path.join(process.cwd(), 'src/lib/analytics.ts');
const hasAnalyticsFile = fs.existsSync(analyticsFile);
console.log('\n3. Analytics Utilities:');
if (hasAnalyticsFile) {
  const content = fs.readFileSync(analyticsFile, 'utf8');
  if (content.includes('gtag') && content.includes('trackEvent')) {
    console.log('   ✅ src/lib/analytics.ts exists with gtag integration');
  } else {
    console.log('   ⚠️  File exists but may not have gtag setup');
  }
} else {
  console.log('   ❌ src/lib/analytics.ts not found');
}

// Check 4: Layout includes GA4
const layoutFile = path.join(process.cwd(), 'src/app/layout.tsx');
const hasLayoutFile = fs.existsSync(layoutFile);
console.log('\n4. Layout Integration:');
if (hasLayoutFile) {
  const content = fs.readFileSync(layoutFile, 'utf8');
  if (content.includes('GA4') || content.includes('gtm')) {
    console.log('   ✅ layout.tsx includes GA4 component');
  } else {
    console.log('   ❌ layout.tsx may not include GA4 component');
  }
} else {
  console.log('   ❌ src/app/layout.tsx not found');
}

// Check 5: Package dependency
const packageFile = path.join(process.cwd(), 'package.json');
console.log('\n5. Dependencies:');
if (fs.existsSync(packageFile)) {
  const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
  if (pkg.dependencies && pkg.dependencies['@next/third-parties']) {
    console.log('   ✅ @next/third-parties is installed');
  } else {
    console.log('   ❌ @next/third-parties not found in dependencies');
  }
}

console.log('\n📋 Next Steps:');
console.log('   1. Start dev server: npm run dev');
console.log('   2. Open http://localhost:3000');
console.log('   3. Open browser console and check: typeof window.gtag');
console.log('   4. Check Network tab for GA4 requests');
console.log('   5. Verify in GA4 Real-Time reports\n');
