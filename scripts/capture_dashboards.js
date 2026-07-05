const { chromium } = require('playwright');
const path = require('path');

async function run() {
  const artifactDir = "C:\\Users\\aadit\\.gemini\\antigravity\\brain\\27ec5529-6342-4263-a36f-ed2815b0d645";
  
  console.log("Launching headless Chromium browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  console.log("Navigating to CareFlow client at http://localhost:5174/ ...");
  await page.goto("http://localhost:5174/");
  await page.waitForTimeout(4000); // let Leaflet map load

  // Screenshot 1: Guest Mode Finder
  console.log("Capturing Guest Mode Landing Page...");
  await page.screenshot({ path: path.join(artifactDir, "landing_guest.png") });

  // Click Sign In
  console.log("Opening Sign In modal...");
  await page.click("button:has-text('Sign In to Dashboard')");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(artifactDir, "login_page.png") });

  // Bypass as Admin
  console.log("Authenticating as Admin...");
  await page.click("button:has-text('Admin')");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(artifactDir, "dashboard_admin.png") });

  // Logout
  console.log("Logging out Admin...");
  await page.click("header button:has-text('Logout')");
  await page.waitForTimeout(1000);

  // Open login modal again
  await page.click("button:has-text('Sign In to Dashboard')");
  await page.waitForTimeout(500);

  // Bypass as Receptionist
  console.log("Authenticating as Receptionist...");
  await page.click("button:has-text('Reception')");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(artifactDir, "dashboard_receptionist.png") });

  // Logout
  console.log("Logging out Receptionist...");
  await page.click("header button:has-text('Logout')");
  await page.waitForTimeout(1000);

  // Open login modal again
  await page.click("button:has-text('Sign In to Dashboard')");
  await page.waitForTimeout(500);

  // Bypass as Doctor
  console.log("Authenticating as Doctor...");
  await page.click("button:has-text('Doctor')");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(artifactDir, "dashboard_doctor.png") });

  // Logout
  console.log("Logging out Doctor...");
  await page.click("header button:has-text('Logout')");
  await page.waitForTimeout(1000);

  // Open login modal again
  await page.click("button:has-text('Sign In to Dashboard')");
  await page.waitForTimeout(500);

  // Bypass as Nurse
  console.log("Authenticating as Nurse...");
  await page.click("button:has-text('Nurse')");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(artifactDir, "dashboard_nurse.png") });

  // Logout
  console.log("Logging out Nurse...");
  await page.click("header button:has-text('Logout')");
  await page.waitForTimeout(1000);

  // Open login modal again
  await page.click("button:has-text('Sign In to Dashboard')");
  await page.waitForTimeout(500);

  // Bypass as Patient
  console.log("Authenticating as Patient...");
  await page.click("button:has-text('Patient')");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(artifactDir, "dashboard_patient.png") });

  console.log("Closing browser...");
  await browser.close();
  console.log("Walkthrough completed successfully. All screenshots saved.");
}

run().catch(console.error);
