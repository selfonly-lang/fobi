import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ecpayPaymentTarget,wantsPaymentAfterLogin,validatePaymentFields} from '../payment-flow-model.js';
test('only official ECPay HTTPS cashier URLs receive signed payment fields',()=>{
  for(const origin of ['https://payment.ecpay.com.tw','https://payment-stage.ecpay.com.tw'])assert.equal(ecpayPaymentTarget(origin+'/Cashier/AioCheckOut/V5'),origin+'/Cashier/AioCheckOut/V5');
  for(const url of ['https://payment.ecpay.com.tw.evil.test/Cashier/AioCheckOut/V5','http://payment.ecpay.com.tw/Cashier/AioCheckOut/V5','https://evil.test/pay','https://user@payment.ecpay.com.tw/Cashier/AioCheckOut/V5','https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5?next=evil'])assert.throws(()=>ecpayPaymentTarget(url));
});
test('automatic login-to-payment needs a current explicit ticket intent',()=>{
  const saved={type:'ticket',exp:2000,continueToPayment:true};assert.equal(wantsPaymentAfterLogin(saved,'ticket',1000),true);
  for(const bad of [{...saved,exp:999},{...saved,continueToPayment:false},{...saved,type:'sponsor'},{...saved,exp:'2000'},null])assert.equal(wantsPaymentAfterLogin(bad,'ticket',1000),false);
  assert.equal(wantsPaymentAfterLogin(saved,'sponsor',1000),false);
});
test('cashier handoff rejects mismatched orders, undisclosed amounts and missing signatures',()=>{
 const good={ok:true,order_no:'QA-1',payment_url:'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5',fields:{TotalAmount:'8000',CheckMacValue:'A'.repeat(64)}};
 assert.equal(validatePaymentFields(good,'QA-1',8000),good.payment_url);assert.throws(()=>validatePaymentFields(good,'OTHER',8000));assert.throws(()=>validatePaymentFields(good,'QA-1',4000));assert.throws(()=>validatePaymentFields({...good,fields:{TotalAmount:'8000'}},'QA-1',8000));
});
