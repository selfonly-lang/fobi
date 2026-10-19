import {test} from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import {ticketToken} from '../ticket-token.js';
const token='01234567-89ab-4cde-8f01-23456789abcd';
test('scanner accepts raw token and FOBI ticket URL',()=>{
 assert.equal(ticketToken(token),token);
 assert.equal(ticketToken('https://fobi.self.com.tw/ticket.html?token='+token),token);
});
test('scanner rejects foreign URLs, HTML and missing tokens',()=>{
 for(const raw of ['https://evil.example/ticket.html?token='+token,'<img src=x>','FB26-01-000001','']) assert.throws(()=>ticketToken(raw));
});
test('QR is generated locally without CDN with four-module quiet zone',async()=>{
 const svg=await QRCode.toString(token,{type:'svg',margin:4});
 assert.match(svg,/<svg/);
 assert.match(svg,/viewBox=/);
});
test('generated QR can be decoded back to original token',async()=>{
 const {default:zxing}=await import('@zxing/library');
 const {PNG}=await import('pngjs');
 const png=PNG.sync.read(await QRCode.toBuffer(token,{width:190,margin:4}));
 const gray=new Uint8ClampedArray(png.width*png.height);
 for(let i=0;i<gray.length;i++)gray[i]=png.data[i*4];
 const bitmap=new zxing.BinaryBitmap(new zxing.HybridBinarizer(new zxing.RGBLuminanceSource(gray,png.width,png.height)));
 const decoded=new zxing.QRCodeReader().decode(bitmap,new Map([[zxing.DecodeHintType.PURE_BARCODE,true]]));
 assert.equal(decoded.getText(),token);
});
