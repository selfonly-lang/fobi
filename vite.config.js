import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import {resolve} from 'node:path';

export default defineConfig({
  plugins:[react(),tailwindcss()],
  build:{
    rollupOptions:{
      input:{
        main:resolve(__dirname,'index.html'),
        contestants:resolve(__dirname,'contestants.html'),
        sponsors:resolve(__dirname,'sponsors.html'),
        tickets:resolve(__dirname,'tickets.html'),
        event:resolve(__dirname,'event.html'),
        partners:resolve(__dirname,'partners.html'),
        guests:resolve(__dirname,'guests.html'),
        checkout:resolve(__dirname,'checkout.html'),
        paymentResult:resolve(__dirname,'payment-result.html'),
        sponsorCenter:resolve(__dirname,'sponsor-center.html'),
        admin:resolve(__dirname,'admin.html'),
        pageants:resolve(__dirname,'pageants.html'),
        pageant:resolve(__dirname,'pageant.html'),
        apply:resolve(__dirname,'apply.html'),
        contestantCenter:resolve(__dirname,'contestant-center.html'),
        beautyJourney:resolve(__dirname,'beauty-journey.html'),
        checkin:resolve(__dirname,'checkin.html'),
        ticket:resolve(__dirname,'ticket.html')
      }
    }
  }
});