import assert from 'node:assert/strict';
import test from 'node:test';
import { demoSignInError, parseDemoSession } from './demo-auth.ts';

test('demo session validates server expiry and keeps the reviewer identity',()=>{
  const session=parseDemoSession({success:true,data:{token:'random-session',user:{id:'demo-dates-main'},expiresAt:new Date(Date.now()+60000).toISOString()}});
  assert.equal(session.session.userId,'demo-dates-main');
  assert.equal(session.session.token,'random-session');
});
test('failed, missing or expired demo sessions cannot be persisted',()=>{
  assert.throws(()=>parseDemoSession({success:false}));
  assert.throws(()=>parseDemoSession({success:true,data:{token:'',user:{id:'demo'},expiresAt:new Date(Date.now()+60000).toISOString()}}));
  assert.throws(()=>parseDemoSession({success:true,data:{token:'token',user:{id:'demo'},expiresAt:'2000-01-01T00:00:00Z'}}));
});
test('demo failures distinguish connectivity and disabled access without inventing a reseed problem',()=>{
  assert.match(demoSignInError({isNetworkError:true}),/connection/);
  assert.match(demoSignInError({code:'DEMO_LOGIN_DISABLED',status:403}),/disabled/);
  assert.match(demoSignInError({status:503}),/temporarily unavailable/);
  assert.doesNotMatch(demoSignInError(new Error('Database details')),/Database|reseed/);
});
