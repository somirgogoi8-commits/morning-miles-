import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const rulesSource = fs.readFileSync('firestore.rules', 'utf8');

test('Dirty Dozen security invariants are enforced in firestore.rules', () => {
  // 1. Global default-deny safety net
  assert.match(rulesSource, /match \/\{document=\*\*\} \{\s*allow read, write: if false;/);

  // 2. Forged confirmation blocked on public registration create
  assert.match(rulesSource, /incoming\(\)\.status == 'PENDING PAYMENT'/);
  assert.match(rulesSource, /incoming\(\)\.paymentStatus == 'PENDING'/);
  assert.match(rulesSource, /incoming\(\)\.checkedIn == false/);

  // 3. Shadow field injection blocked via strict keys check
  assert.match(rulesSource, /data\.keys\(\)\.hasAll\(/);
  assert.match(rulesSource, /data\.keys\(\)\.hasOnly\(/);

  // 4. Orphaned registration and capacity overflow blocked
  assert.match(rulesSource, /exists\(\/databases\/\$\(database\)\/documents\/events\/\$\(incoming\(\)\.eventId\)\)/);
  assert.match(rulesSource, /confirmedCount < get\(.*\)\.data\.capacity/);

  // 5. Rulebook & minor permission mandatory
  assert.match(rulesSource, /data\.rulesAccepted == true/);
  assert.match(rulesSource, /data\.conditionsAccepted == true/);
  assert.match(rulesSource, /data\.isMinor == false \|\| data\.guardianPermission == true/);

  // 6. Unauthenticated PII reads blocked on registrations and payments
  assert.match(rulesSource, /match \/registrations\/\{registrationId\}[\s\S]*allow get: if isValidId\(registrationId\) && isAdmin\(\)/);
  assert.match(rulesSource, /match \/payments\/\{paymentId\}[\s\S]*allow get: if isValidId\(paymentId\) && isAdmin\(\)/);

  // 7. Verified email check required for admin actions
  assert.match(rulesSource, /request\.auth\.token\.email_verified == true/);

  // 8. Audit logs & payments cannot be deleted
  assert.match(rulesSource, /match \/auditLogs\/\{logId\}[\s\S]*allow update, delete: if false;/);
  assert.match(rulesSource, /match \/payments\/\{paymentId\}[\s\S]*allow delete: if false;/);

  // 9. Unconsented media hidden from public
  assert.match(rulesSource, /existing\(\)\.permissionConfirmed == true \|\| isAdmin\(\)/);

  // 10. Event host check-in cannot bypass payment confirmation or double check-in
  assert.match(rulesSource, /existing\(\)\.status == 'CONFIRMED'/);
  assert.match(rulesSource, /existing\(\)\.checkedIn == false/);
});
