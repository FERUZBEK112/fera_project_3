# CHIQ CHIQ ⚡

O‘zbekcha challenge arena: reaksiya, xotira, diqqat, kunlik sinov, do‘stga challenge va 8 urinishli xonalar.

## Ishga tushirish

Node.js 24 yoki yangiroq kerak. Qo‘shimcha dependency yo‘q.

```sh
npm start
```

http://localhost:3000 manzilini oching. Tekshirish: `npm test`.

## Railway

Dockerfile va railway.json tayyor. GitHub repositoryni Railwayga ulang, servisga `/data` mount path bilan volume biriktiring va public domain yarating. `PORT` Railway tomonidan beriladi. SQLite `/data/arena.db` ichida saqlanadi. Volume bo‘lmasa redeploy natijalarni o‘chiradi. Bitta replica ishlating; SQLite lokal volume ko‘p replica uchun mo‘ljallanmagan.

## Funksiyalar

- 3 reaksiya, 3 xotira va 8 rang raundi
- Toshkent vaqti bo‘yicha kunlik umumiy sinov va reyting
- Serverda hisoblanadigan 0–1000 ball
- Saqlangan natijadan bir xil savolli challenge havolasi
- 24 soatlik xonalar, har biriga 8 tagacha urinish
- Telegramga ulashish va PNG natija kartochkasi
- Telefon, klaviatura va reduced-motion qo‘llab-quvvatlanadi

Taxallus va natija ochiq ko‘rinadi. Natijalar 30 kun saqlanadi. Reyting ko‘ngilochar; brauzer avtomatlashtirishiga qarshi kuchli anti-cheat kafolati yo‘q. IP tezlik cheklovi mavjud, lekin platforma proxy ortida u umumiy bo‘lishi mumkin.

## Qidiruv

SEO sarlavha, tavsif, robots.txt va ochiq HTML bor. Google indekslashi avtomatik kafolatlanmaydi. Domenga egalik tekshirilgach Search Console orqali so‘rov yuborish mumkin.

